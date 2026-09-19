import { getDatabase } from "../db/client.ts";
export interface DailyBriefing {
  briefingId: string; zuluTimestamp: string; threatLevel: "CRITICAL" | "HIGH" | "ELEVATED" | "LOW";
  bluf: string;
  theaters: Array<{ theater: string; status: string; summary: string; keySignals: string[] }>;
  anomaliesSummary: { totalActive: number; highestZScore: number; topAnomalies: Array<{ type: string; zScore: number; summary: string }> };
  calibratedForecasts: Array<{ id: string; question: string; probability: number; targetDate: string }>;
  marketTransmission: { crudeOil: string; gold: string; usDollar: string; defenseEquities: string };
  noTradeMandate: string; markdownContent: string;
}
export function generateDailyBriefing(now = Date.now()): DailyBriefing {
  const db = getDatabase(), start = now-86400000;
  const anomalies = db.prepare("SELECT id,domain,anomaly_type,z_score,summary,timestamp FROM anomalies WHERE timestamp>=? AND timestamp<=? ORDER BY z_score DESC LIMIT 100").all(start,now);
  const total = Number(db.prepare("SELECT COUNT(*) AS n FROM anomalies WHERE timestamp>=? AND timestamp<=?").get(start,now)?.n ?? 0);
  const forecasts = db.prepare("SELECT id,question,probability,target_date FROM forecast_ledger WHERE outcome IS NULL AND created_at>=? AND created_at<=? ORDER BY created_at DESC LIMIT 20").all(start,now);
  const maxZ = Math.max(0,...anomalies.map(a=>Number(a.z_score)));
  const threatLevel = maxZ>=4 ? "CRITICAL" : maxZ>=3 ? "HIGH" : maxZ>=2 ? "ELEVATED" : "LOW";
  const briefingId = `PDB-${new Date(now).toISOString().slice(0,10)}`;
  const zuluTimestamp = new Date(now).toISOString();
  const bluf = `${total} recorded deviations in the preceding 24 hours. Highest recorded statistical score: ${maxZ.toFixed(2)}. Coverage is limited to available ingested observations; missing telemetry is not evidence of normal conditions.`;
  const theaters = [...new Set(anomalies.map(a=>String(a.domain)))].map(domain=>({ theater:domain,status:"RECORDED OBSERVATIONS",summary:`${anomalies.filter(a=>a.domain===domain).length} deviations in displayed sample.`,keySignals:anomalies.filter(a=>a.domain===domain).slice(0,5).map(a=>`${a.id}: ${a.summary}`) }));
  const quote = (symbols: string[]) => symbols.map(symbol=>{
    const row=db.prepare("SELECT timestamp,data_json FROM observations WHERE domain='market' AND entity_id=? AND timestamp>=? AND timestamp<=? ORDER BY timestamp DESC LIMIT 1").get(symbol,start,now);
    if(!row)return `${symbol}: unavailable`;
    const data=JSON.parse(String(row.data_json)) as Record<string,unknown>;
    return `${symbol}: ${data.price ?? 'unavailable'}; daily change ${data.changePct ?? 'unavailable'}%; observed ${new Date(Number(row.timestamp)).toISOString()}. Association does not establish a geopolitical risk premium.`;
  }).join(" ");
  const marketTransmission={crudeOil:quote(["CL=F","BZ=F"]),gold:quote(["GC=F"]),usDollar:quote(["DX-Y.NYB"]),defenseEquities:quote(["LMT","RTX","SPY"])};
  const noTradeMandate="NO-TRADE: DO_NOTHING. This descriptive briefing does not establish an independently verified, unpriced trading edge.";
  const calibratedForecasts=forecasts.map(f=>({id:String(f.id),question:String(f.question),probability:Number(f.probability),targetDate:new Date(Number(f.target_date)).toISOString()}));
  const safe=(value:unknown)=>String(value).replace(/[<>|`]/g," ").replace(/[\r\n]+/g," ");
  const markdownContent=["# PRESIDENTIAL INTELLIGENCE BRIEF (PDB)","Personal OSINT briefing - not a government document",`${briefingId} | ${zuluTimestamp} | ${threatLevel}`,"## 1. BOTTOM LINE UP FRONT (BLUF)",bluf,"## 2. OBSERVED DOMAINS",...theaters.flatMap(t=>[`### ${t.theater}`,t.summary,...t.keySignals.map(s=>`- ${safe(s)}`)]),"## 3. RECORDED DEVIATIONS",...anomalies.slice(0,20).map(a=>`- ${safe(a.id)} | Z=${Number(a.z_score).toFixed(2)} | ${safe(a.summary)}`),"## 4. UNRESOLVED FORECASTS (NOT VALIDATED AS CALIBRATED)",...calibratedForecasts.map(f=>`- ${(f.probability*100).toFixed(0)}%: ${safe(f.question)} | ${f.targetDate}`),"## 5. MACRO TRANSMISSION",...Object.entries(marketTransmission).map(([k,v])=>`- ${k}: ${v}`),"## 6. NO-TRADE & CAPITAL PRESERVATION DIRECTIVE",noTradeMandate].join("\n\n");
  return {briefingId,zuluTimestamp,threatLevel,bluf,theaters,anomaliesSummary:{totalActive:total,highestZScore:maxZ,topAnomalies:anomalies.slice(0,5).map(a=>({type:String(a.anomaly_type),zScore:Number(a.z_score),summary:String(a.summary)}))},calibratedForecasts,marketTransmission,noTradeMandate,markdownContent};
}
