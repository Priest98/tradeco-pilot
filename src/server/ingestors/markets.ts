import { z } from "zod";
import { BaseIngestor, type NormalizedObservation } from "./base";
import { safeFetch } from "@/server/security/ssrfGuard";
import { getDatabase } from "@/server/db/client";
const quoteSchema = z.object({ chart: z.object({ result: z.array(z.object({ meta: z.object({ regularMarketPrice: z.number().finite().positive(), chartPreviousClose: z.number().finite().positive().optional(), currency: z.string().optional(), regularMarketTime: z.number().optional() }), indicators: z.object({ quote: z.array(z.object({ close: z.array(z.number().nullable()) })) }).optional() })).nullable() }) });
const eventSchema = z.array(z.object({ id: z.union([z.string(), z.number()]), title: z.string(), markets: z.array(z.object({ id: z.union([z.string(), z.number()]), question: z.string().optional(), active: z.boolean().optional(), closed: z.boolean().optional(), outcomes: z.string(), outcomePrices: z.string(), clobTokenIds: z.string().optional() })) }));
const level = z.object({ price: z.coerce.number().min(0).max(1), size: z.coerce.number().finite().nonnegative() });
const bookSchema = z.object({ bids: z.array(level), asks: z.array(level), timestamp: z.string().optional() });
export function summarizeBook(input: unknown) {
  const book = bookSchema.parse(input);
  const bids = book.bids.filter(l => l.size > 0).sort((a,b) => b.price-a.price);
  const asks = book.asks.filter(l => l.size > 0).sort((a,b) => a.price-b.price);
  const bid = bids[0]?.price ?? null, ask = asks[0]?.price ?? null;
  return { bids, asks, bestBid: bid, bestAsk: ask, spread: bid !== null && ask !== null ? ask-bid : null,
    bidDepthUSD: bids.reduce((s,l) => s+l.price*l.size,0), askDepthUSD: asks.reduce((s,l) => s+l.price*l.size,0), timestamp: book.timestamp ?? null };
}
export function fitTransmission(samples: Array<{ z: number; change: number }>, currentZ: number) {
  const valid = samples.filter(s => Number.isFinite(s.z) && Number.isFinite(s.change));
  if (valid.length < 20) return { status: "insufficient_history", samples: valid.length, correlation: null, modeledChangePct: null };
  const mx = valid.reduce((s,p)=>s+p.z,0)/valid.length, my = valid.reduce((s,p)=>s+p.change,0)/valid.length;
  const xx = valid.reduce((s,p)=>s+(p.z-mx)**2,0), yy = valid.reduce((s,p)=>s+(p.change-my)**2,0);
  const xy = valid.reduce((s,p)=>s+(p.z-mx)*(p.change-my),0);
  if (xx === 0 || yy === 0) return { status: "zero_variance", samples: valid.length, correlation: null, modeledChangePct: null };
  return { status: "descriptive_association_not_causal_premium", samples: valid.length, correlation: xy/Math.sqrt(xx*yy), modeledChangePct: (xy/xx)*(currentZ-mx) };
}
const tickers = [ ["CL=F", "WTI futures", "commodity"], ["BZ=F", "Brent futures", "commodity"], ["GC=F", "Gold futures", "commodity"], ["DX-Y.NYB", "Dollar index", "fx"], ["LMT", "Lockheed Martin", "defense"], ["RTX", "RTX", "defense"], ["SPY", "S&P 500 ETF", "benchmark"] ];
export class MarketsIngestor extends BaseIngestor {
  readonly name = "Financial & Prediction Markets (Yahoo & Polymarket)";
  readonly domain = "market" as const;
  readonly pollIntervalMs = 300000;
  async fetchData(): Promise<NormalizedObservation[]> {
    const now = Date.now();
    const observations: NormalizedObservation[] = [];
    for (const [symbol, name, category] of tickers) {
      try {
        const response = await safeFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1mo`, { timeoutMs: 8000 });
        if (!response.ok) continue;
        const result = quoteSchema.parse(await response.json()).chart.result?.[0]; if (!result) continue;
        const price = result.meta.regularMarketPrice, prev = result.meta.chartPreviousClose;
        const closes = result.indicators?.quote[0]?.close.filter((x): x is number => x !== null && x > 0) ?? [];
        const returns = closes.slice(1).map((x,i)=>Math.log(x/closes[i]));
        const mean = returns.reduce((s,x)=>s+x,0)/Math.max(1,returns.length);
        const vol = returns.length > 2 ? Math.sqrt(returns.reduce((s,x)=>s+(x-mean)**2,0)/(returns.length-1))*Math.sqrt(252) : null;
        observations.push({ id: `ticker-${symbol}`, domain: "market", source: "yahoo_finance", entityId: symbol, timestamp: now, data: { symbol, name, category, price, changePct: closes.length > 1 ? (price/closes[closes.length-2]-1)*100 : null, periodChangePct: prev ? (price/prev-1)*100 : null, annualizedVolatility: vol, quoteTimestamp: result.meta.regularMarketTime ? result.meta.regularMarketTime*1000 : null, currency: result.meta.currency ?? "USD" } });
      } catch { /* One unavailable ticker does not discard other quotes. */ }
    }
    const benchmark = observations.find(o=>o.entityId === "SPY");
    const db = getDatabase();
    const currentZ = Number(db.prepare("SELECT MAX(z_score) AS z FROM anomalies WHERE timestamp >= ? AND domain != 'market'").get(now-86400000)?.z ?? 0);
    for (const item of observations) {
      if (item.data.category === "defense") item.data.relativeSpreadPct = typeof item.data.changePct === "number" && typeof benchmark?.data.changePct === "number" ? item.data.changePct-benchmark.data.changePct : null;
      const history = db.prepare(`SELECT CAST(o.timestamp / 86400000 AS INTEGER) AS day, AVG(json_extract(o.data_json,'$.changePct')) AS change,
        (SELECT MAX(a.z_score) FROM anomalies a WHERE a.domain != 'market' AND a.timestamp >= CAST(o.timestamp / 86400000 AS INTEGER)*86400000 AND a.timestamp < (CAST(o.timestamp / 86400000 AS INTEGER)+1)*86400000) AS z
        FROM observations o WHERE o.domain='market' AND o.entity_id=? AND o.timestamp>=? AND o.timestamp<? GROUP BY day`).all(item.entityId!,now-30*86400000,Math.floor(now/86400000)*86400000);
      item.data.transmission = fitTransmission(history.filter(r=>r.z!==null && r.change!==null).map(r=>({ z:Number(r.z),change:Number(r.change) })),currentZ);
    }
    try {
      const response = await safeFetch("https://gamma-api.polymarket.com/events?limit=30&active=true&closed=false", { timeoutMs: 12000 });
      if (response.ok) for (const event of eventSchema.parse(await response.json()).filter(e=>/conflict|war|iran|ukraine|ceasefire|invasion/i.test(e.title)).slice(0,8)) {
        for (const market of event.markets.filter(m=>m.active!==false && !m.closed).slice(0,2)) {
          try {
            const outcomes = z.array(z.string()).parse(JSON.parse(market.outcomes));
            const prices = z.array(z.coerce.number().min(0).max(1)).parse(JSON.parse(market.outcomePrices));
            const tokens = z.array(z.string().regex(/^\d+$/)).parse(JSON.parse(market.clobTokenIds || "[]"));
            const yes = outcomes.findIndex(o=>o.toLowerCase()==="yes"); if (yes<0 || prices[yes]===undefined) continue;
            let orderBook: ReturnType<typeof summarizeBook> | null = null;
            if (tokens[yes]) { const res = await safeFetch(`https://clob.polymarket.com/book?token_id=${tokens[yes]}`, { timeoutMs: 5000 }); if (res.ok) orderBook = summarizeBook(await res.json()); }
            observations.push({ id:`polymarket-${market.id}`,domain:"market",source:"polymarket",entityId:String(market.id),timestamp:now,data:{ title:market.question || event.title,yesProbability:prices[yes],tokenId:tokens[yes] ?? null,orderBook,category:"geopolitical_prediction" } });
          } catch { /* Malformed or unavailable contract is excluded. */ }
        }
      }
    } catch { /* Preserve available macro quotes during a prediction-feed outage. */ }
    if (!observations.length) throw new Error("All market feeds unavailable");
    return observations;
  }
}
