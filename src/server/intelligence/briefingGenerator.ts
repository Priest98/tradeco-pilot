import { getDatabase } from "../db/client.ts";

export interface DailyBriefing {
  briefingId: string;
  zuluTimestamp: string;
  threatLevel: "CRITICAL" | "HIGH" | "ELEVATED" | "LOW";
  bluf: string;
  theaters: Array<{
    theater: string;
    status: string;
    summary: string;
    keySignals: string[];
  }>;
  anomaliesSummary: {
    totalActive: number;
    highestZScore: number;
    topAnomalies: Array<{
      type: string;
      zScore: number;
      summary: string;
    }>;
  };
  calibratedForecasts: Array<{
    id: string;
    question: string;
    probability: number;
    targetDate: string;
  }>;
  marketTransmission: {
    crudeOil: string;
    gold: string;
    usDollar: string;
    defenseEquities: string;
  };
  noTradeMandate: string;
  markdownContent: string;
}

export function generateDailyBriefing(): DailyBriefing {
  const db = getDatabase();
  const now = new Date();
  const zuluTimestamp = now.toISOString().replace("T", " ").replace("Z", " ZULU");
  const briefingId = `PDB-${now.toISOString().split("T")[0]}-${now.getHours().toString().padStart(2, "0")}`;

  // 1. Fetch latest correlated event
  const latestEvent = db.prepare(`
    SELECT dossier_json, threat_level, bluf, location_name
    FROM correlated_events
    ORDER BY updated_at DESC
    LIMIT 1
  `).get() as any;

  let eventDossier: any = null;
  try {
    eventDossier = JSON.parse(latestEvent?.dossier_json || "{}");
  } catch {}

  // 2. Fetch active anomalies
  const anomalies = db.prepare(`
    SELECT anomaly_type, z_score, summary, confidence
    FROM anomalies
    WHERE status = 'active'
    ORDER BY z_score DESC
    LIMIT 5
  `).all() as any[];

  const maxZ = anomalies.length > 0 ? anomalies[0].z_score : 2.0;
  const threatLevel: DailyBriefing["threatLevel"] =
    latestEvent?.threat_level || (maxZ >= 4.0 ? "CRITICAL" : maxZ >= 3.0 ? "HIGH" : "ELEVATED");

  // 3. Fetch active forecasts from calibrated ledger
  const forecasts = db.prepare(`
    SELECT id, question, probability, target_date
    FROM forecast_ledger
    WHERE outcome IS NULL
    ORDER BY created_at DESC
    LIMIT 5
  `).all() as any[];

  // 4. Formulate Theaters
  const theaters = [
    {
      theater: "Middle East / Persian Gulf",
      status: "ELEVATED MILITARY ACTIVITY / HIGH ELECTRONIC WARFARE",
      summary:
        "Severe GPS/GNSS signal disruption (68% degradation) active over Strait of Hormuz. Coordinated allied and naval airborne assets (F-35, KC-46, E-3 Sentry) maintaining continuous combat air patrols adjacent to 21M bpd petroleum transit corridor.",
      keySignals: [
        "GPS Jamming Hex 842cb8bffffffff covering eastern Musandam Peninsula",
        "Carrier Strike Group operating in Gulf of Oman at 22 knots",
        "Commercial VLCC crude tanker transit remains open with heightened navigational vigilance"
      ]
    },
    {
      theater: "Eastern Europe & Baltic Littoral",
      status: "PERSISTENT ELECTRONIC INTERFERENCE",
      summary:
        "Aviation and maritime navigation jamming continuing in Baltic airspace adjacent to Kaliningrad corridor. 52% of regional flights logging degraded ADS-B integrity.",
      keySignals: [
        "Suwalki Gap spatial watch corridor monitored without ground force repositioning",
        "Civil commercial flights rerouting southern approaches to avoid Baltic EW hex"
      ]
    },
    {
      theater: "Indo-Pacific & Maritime Chokepoints",
      status: "NOMINAL WITH ROUTINE AIR DEFENSE INTERCEPT",
      summary:
        "Strait of Malacca container and crude shipping traffic operating at normal throughput (16M bpd equivalent). Taiwan Strait median transit stable.",
      keySignals: [
        "No dark vessel AIS clustering detected in southern choke points",
        "USGS M5.4 seismic release in Banda Sea evaluated: zero tsunami hazard generated"
      ]
    }
  ];

  const bluf =
    eventDossier?.bluf ||
    "BLUF: Global threat posture remains ELEVATED driven by acute multi-domain electronic warfare and tactical air convergence in the Strait of Hormuz chokepoint. While navigation signal degradation is acute, commercial petroleum flows continue uninterrupted. Front-month crude oil futures have priced an initial $1.80/bbl risk premium, but absent verified kinetic strikes on maritime hulls, capital discipline dictates an emphatic DO-NOTHING stance.";

  const marketTransmission = eventDossier?.marketImpact || {
    crudeOil: "Brent Crude ($82.45) holding +1.9% geopolitical risk premium; upside capped unless tankers alter course.",
    gold: "Gold Futures firming at $2,685/oz on flight-to-safety dollar liquidity bids.",
    usDollar: "DXY index steady at 104.15 reflecting safe-haven reserves demand.",
    defenseEquities: "Defense prime contractors (RTX, LMT) commanding a +1.4% relative spread above broad index."
  };

  const noTradeMandate =
    eventDossier?.noTradeRecommendation?.rationale ||
    "DISCIPLINED NO-TRADE MANDATE: Geopolitical headlines present severe asymmetric volatility risk. Do not chase oil upside until physical kinetic interdiction or formal maritime route closure is officially verified by UKMTO/Lloyd's List.";

  // Generate formatted Markdown memo
  const markdownContent = `
# PRESIDENTIAL INTELLIGENCE BRIEF (PDB)
**DOCUMENT ID:** ${briefingId} | **DATE:** ${zuluTimestamp}  
**SECURITY CLASSIFICATION:** PERSONAL SYSTEM DIRECTIVE // HIGHEST SENSITIVITY  
**OVERALL THREAT CONDITION:** [ ${threatLevel} ]

---

## 1. BOTTOM LINE UP FRONT (BLUF)
${bluf}

---

## 2. THEATER SITUATION BRIEFS

${theaters.map((t) => `### ${t.theater}
* **Status:** \`${t.status}\`
* **Assessment:** ${t.summary}
* **Key Signals:**
${t.keySignals.map((s) => `  - ${s}`).join("\n")}
`).join("\n")}

---

## 3. ACTIVE STATISTICAL ANOMALIES (Z-SCORE RANKED)
| Anomaly Type | Z-Score | Confidence | Summary |
| :--- | :---: | :---: | :--- |
${anomalies.map((a) => `| \`${a.anomaly_type}\` | **Z=${a.z_score.toFixed(1)}** | ${(a.confidence * 100).toFixed(0)}% | ${a.summary} |`).join("\n")}

---

## 4. CALIBRATED SUPERFORECASTER LEDGER
${forecasts.map((f) => `* **[P = ${(f.probability * 100).toFixed(0)}%]** ${f.question}  
  *Target Date:* \`${new Date(f.target_date).toISOString().split("T")[0]}\` | *ID:* \`${f.id}\``).join("\n\n")}

---

## 5. MACRO CROSS-ASSET TRANSMISSION
* **Crude Oil (Brent/WTI):** ${marketTransmission.crudeOil}
* **Gold Futures:** ${marketTransmission.gold}
* **US Dollar (DXY):** ${marketTransmission.usDollar}
* **Defense Equities:** ${marketTransmission.defenseEquities}

---

## 6. NO-TRADE & CAPITAL PRESERVATION DIRECTIVE
> **VERDICT:** \`DO_NOTHING / WATCH_ONLY\`  
> ${noTradeMandate}
`.trim();

  return {
    briefingId,
    zuluTimestamp,
    threatLevel,
    bluf,
    theaters,
    anomaliesSummary: {
      totalActive: anomalies.length,
      highestZScore: maxZ,
      topAnomalies: anomalies.map((a) => ({
        type: a.anomaly_type,
        zScore: a.z_score,
        summary: a.summary,
      })),
    },
    calibratedForecasts: forecasts.map((f) => ({
      id: f.id,
      question: f.question,
      probability: f.probability,
      targetDate: new Date(f.target_date).toISOString().split("T")[0],
    })),
    marketTransmission,
    noTradeMandate,
    markdownContent,
  };
}
