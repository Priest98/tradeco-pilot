import { BaseIngestor, NormalizedObservation } from "./base";
import { safeFetch } from "@/server/security/ssrfGuard";

const YAHOO_FINANCE_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const POLYMARKET_EVENTS_URL = "https://gamma-api.polymarket.com/events?limit=15&active=true&closed=false&order=volume24hr&ascending=false&tag_id=100265";

const CORE_TICKERS = [
  { symbol: "CL=F", name: "Crude Oil (WTI)", category: "commodity" },
  { symbol: "BZ=F", name: "Brent Crude", category: "commodity" },
  { symbol: "GC=F", name: "Gold Futures", category: "commodity" },
  { symbol: "DX-Y.NYB", name: "US Dollar Index", category: "fx" },
  { symbol: "LMT", name: "Lockheed Martin", category: "defense" },
  { symbol: "RTX", name: "RTX Corp", category: "defense" },
  { symbol: "BTC-USD", name: "Bitcoin USD", category: "crypto" },
];

export class MarketsIngestor extends BaseIngestor {
  readonly name = "Financial & Prediction Markets (Yahoo & Polymarket)";
  readonly domain = "market" as const;
  readonly pollIntervalMs = 5 * 60 * 1000; // 5 minutes

  async fetchData(): Promise<NormalizedObservation[]> {
    const observations: NormalizedObservation[] = [];

    // 1. Fetch Core Macro & Commodity Tickers from Yahoo Finance
    for (const item of CORE_TICKERS) {
      try {
        const url = `${YAHOO_FINANCE_BASE}/${encodeURIComponent(item.symbol)}?interval=1d&range=5d`;
        const res = await safeFetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
          timeoutMs: 8000,
        });

        if (res.ok) {
          const json = await res.json();
          const meta = json.chart?.result?.[0]?.meta;
          if (meta) {
            const price = meta.regularMarketPrice ?? 0;
            const prevClose = meta.chartPreviousClose ?? price;
            const changePct = prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0;

            observations.push({
              id: `ticker-${item.symbol}`,
              domain: "market",
              source: "yahoo_finance",
              entityId: item.symbol,
              timestamp: Date.now(),
              data: {
                symbol: item.symbol,
                name: item.name,
                category: item.category,
                price,
                prevClose,
                changePct,
                currency: meta.currency || "USD",
              },
            });
          }
        }
      } catch (err) {
        // Continue to next ticker
      }
    }

    // 2. Fetch Top Geopolitical Prediction Markets from Polymarket Gamma API
    try {
      const res = await safeFetch(POLYMARKET_EVENTS_URL, { timeoutMs: 12000 });
      if (res.ok) {
        const events = await res.json();
        if (Array.isArray(events)) {
          for (const ev of events.slice(0, 10)) {
            const primaryMarket = ev.markets?.[0];
            if (!primaryMarket) continue;

            let outcomePrices: number[] = [];
            try {
              outcomePrices = JSON.parse(primaryMarket.outcomePrices || "[]").map(Number);
            } catch {}

            const yesProbability = outcomePrices[0] !== undefined ? outcomePrices[0] : 0.5;

            observations.push({
              id: `polymarket-${ev.id}`,
              domain: "market",
              source: "polymarket",
              entityId: String(ev.id),
              timestamp: Date.now(),
              data: {
                title: ev.title,
                description: ev.description,
                volume24hr: ev.volume24hr,
                yesProbability,
                category: "geopolitical_prediction",
                endDate: ev.endDate,
              },
            });
          }
        }
      }
    } catch (err) {
      console.warn("[MarketsIngestor] Polymarket fetch failed:", err);
    }

    return observations;
  }
}
