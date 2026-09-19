import { z } from "zod";
import { haversineDistanceKm } from "./anomalyEngine";
import { AnomalyRecord } from "./anomalyEngine";
import { llmProvider } from "./llmProvider";
import { wrapInQuarantineBlock } from "./promptDefense";
import { getDatabase } from "@/server/db/client";

export interface IntelligenceDossier {
  eventId: string;
  timestamp: number;
  anomalyId: string;
  threatLevel: "CRITICAL" | "HIGH" | "ELEVATED" | "LOW";
  bluf: string;
  summary: string;
  location?: { lat?: number; lon?: number; name?: string };
  keyDrivers: string[];
  competingHypotheses: Array<{
    hypothesis: string;
    probability: number;
    supportingEvidence: string[];
    contradictingEvidence: string[];
  }>;
  forecast?: {
    question: string;
    probability: number;
    targetDate: string;
    falsifiableCriteria: string;
  };
  marketImpact: {
    crudeOil: string;
    gold: string;
    usDollar: string;
    defenseEquities: string;
    polymarketImplication: string;
  };
  noTradeRecommendation: {
    verdict: "DO_NOTHING" | "WATCH_ONLY" | "HIGH_CONVICTION_HEDGE";
    rationale: string;
    falsificationTrigger: string;
  };
}

export class PipelineEngine {
  /**
   * Executes the full 7-stage AI intelligence reasoning pipeline for a target anomaly.
   */
  async runPipeline(anomaly: AnomalyRecord): Promise<IntelligenceDossier> {
    const now = Date.now();
    const eventId = `intel-${anomaly.id}-${now}`;

    // STAGE 1: WATCHER (Fast Triage)
    if (anomaly.zScore < 1.5 && anomaly.confidence < 0.7) {
      throw new Error(`Watcher: Anomaly ${anomaly.id} below triage threshold (Z=${anomaly.zScore}). Ignored.`);
    }

    // STAGE 2: INVESTIGATOR (Context & Evidence Gathering)
    const db = getDatabase();
    let contextualObservations: Array<{domain:string; source:string; lat:number|null; lon:number|null; data_json:string; timestamp:number}> = [];
    try {
      const stmt = db.prepare(`
        SELECT domain, source, entity_id, lat, lon, data_json, timestamp
        FROM observations
        WHERE timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp DESC
        LIMIT 250
      `);
      const windowStart = anomaly.timestamp - 3 * 60 * 60 * 1000;
      const windowEnd = anomaly.timestamp + 1 * 60 * 60 * 1000;
      contextualObservations = stmt.all(windowStart, windowEnd) as typeof contextualObservations;
    } catch {}

    // STAGE 3, 4, 5, 6, 7: NEURAL REASONING BRAIN WITH QUARANTINED CONTEXT
    const evidenceContext = wrapInQuarantineBlock("investigator_evidence", {
      anomaly,
      nearbyObservations: contextualObservations.map((o) => ({
        domain: o.domain,
        source: o.source,
        lat: o.lat,
        lon: o.lon,
        data: JSON.parse(o.data_json || "{}"),
      })),
    });

    const prompt = `
You are the Chief Intelligence Officer and Quantitative Geopolitical Analyst running a 7-stage military intelligence pipeline.
Analyze the quarantined observation data below and generate a rigorous Intelligence Dossier.

CRITICAL DIRECTIVES:
1. Deliver a concise BLUF (Bottom Line Up Front) in military intelligence style.
2. Formulate 3 competing hypotheses (H1, H2, H3) with assigned probabilities that sum to 1.0. Include supporting evidence AND counter-evidence for each.
3. Formulate one falsifiable, calibrated forecast question with an estimated probability (0.0 to 1.0) and resolution criteria.
4. Assess cross-asset transmission to Crude Oil, Gold, USD, Defense Equities.
5. Apply the "No-Trade Engine" filter: Default to "DO_NOTHING" or "WATCH_ONLY" unless there is an asymmetric, unpriced edge with verified independence.

${evidenceContext}

Respond ONLY with valid JSON matching this exact structure:
{
  "threatLevel": "CRITICAL" | "HIGH" | "ELEVATED" | "LOW",
  "bluf": "string",
  "summary": "string",
  "locationName": "string",
  "keyDrivers": ["driver 1", "driver 2"],
  "competingHypotheses": [
    {
      "hypothesis": "string",
      "probability": 0.5,
      "supportingEvidence": ["evidence 1"],
      "contradictingEvidence": ["counter evidence 1"]
    }
  ],
  "forecast": {
    "question": "string",
    "probability": 0.65,
    "targetDate": "YYYY-MM-DD",
    "falsifiableCriteria": "string"
  },
  "marketImpact": {
    "crudeOil": "string",
    "gold": "string",
    "usDollar": "string",
    "defenseEquities": "string",
    "polymarketImplication": "string"
  },
  "noTradeRecommendation": {
    "verdict": "DO_NOTHING" | "WATCH_ONLY" | "HIGH_CONVICTION_HEDGE",
    "rationale": "string",
    "falsificationTrigger": "string"
  }
}
`.trim();

    const text = z.string().max(8000);
    const schema = z.object({ threatLevel:z.enum(["CRITICAL","HIGH","ELEVATED","LOW"]),bluf:text,summary:text,locationName:text,
      keyDrivers:z.array(text).max(20),competingHypotheses:z.array(z.object({hypothesis:text,probability:z.number().min(0).max(1),supportingEvidence:z.array(text),contradictingEvidence:z.array(text)})).min(1).max(5).refine(h=>Math.abs(h.reduce((s,x)=>s+x.probability,0)-1)<0.01),
      forecast:z.object({question:text,probability:z.number().min(0).max(1),targetDate:z.string().refine(d=>Number.isFinite(Date.parse(d)) && Date.parse(d)>now),falsifiableCriteria:text}),
      marketImpact:z.object({crudeOil:text,gold:text,usDollar:text,defenseEquities:text,polymarketImplication:text}),
      noTradeRecommendation:z.object({verdict:z.enum(["DO_NOTHING","WATCH_ONLY","HIGH_CONVICTION_HEDGE"]),rationale:text,falsificationTrigger:text}) });
    let aiResult: z.infer<typeof schema>;
    let modelAvailable = true;
    try {
      const responseText = await llmProvider.generate(prompt, {
        jsonMode: true,
        temperature: 0.1,
      });
      aiResult = schema.parse(JSON.parse(responseText));
    } catch {
      modelAvailable = false;
      // Explicitly unvalidated offline summary.
      aiResult = {
        threatLevel: anomaly.zScore > 3.5 ? "HIGH" : "ELEVATED",
        bluf: `Statistical anomaly detected in domain ${anomaly.domain.toUpperCase()}: ${anomaly.summary}. Initial automated triage flags elevated activity requiring multi-source corroboration.`,
        summary: anomaly.summary,
        locationName: anomaly.lat && anomaly.lon ? `Sector (${anomaly.lat.toFixed(2)}, ${anomaly.lon.toFixed(2)})` : "Global Airspace/Maritime",
        keyDrivers: [
          `Recorded score ${anomaly.zScore.toFixed(1)}; inspect baseline evidence for sample coverage`,
          `Observed telemetry in ${anomaly.domain} domain`,
        ],
        competingHypotheses: [],
        forecast: {
          question: `Will heightened military/EW activity in this sector persist for more than 48 hours?`,
          probability: 0.40,
          targetDate: new Date(now + 48 * 3600 * 1000).toISOString().split("T")[0],
          falsifiableCriteria: "Official statement confirming bilateral exercises OR cessation of jamming signatures within 48h.",
        },
        marketImpact: {
          crudeOil: "Neutral to slight upward risk premium if adjacent to maritime chokepoints",
          gold: "Steady; no immediate flight-to-safety catalyst unless escalation confirmed",
          usDollar: "Neutral",
          defenseEquities: "Neutral",
          polymarketImplication: "Check geopolitical conflict prediction markets for widening spreads",
        },
        noTradeRecommendation: {
          verdict: "DO_NOTHING",
          rationale: "Default discipline gatekeeper: Information edge is not verified across kinetic feeds. High risk of chasing noise or priced-in volatility.",
          falsificationTrigger: "Verified kinetic engagement or formal state declaration.",
        },
      };
    }

    const dossier: IntelligenceDossier = {
      eventId,
      timestamp: now,
      anomalyId: anomaly.id,
      threatLevel: aiResult.threatLevel || "ELEVATED",
      bluf: aiResult.bluf,
      summary: aiResult.summary || anomaly.summary,
      location: {
        lat: anomaly.lat,
        lon: anomaly.lon,
        name: aiResult.locationName,
      },
      keyDrivers: aiResult.keyDrivers || [],
      competingHypotheses: aiResult.competingHypotheses || [],
      forecast: modelAvailable ? aiResult.forecast : undefined,
      marketImpact: modelAvailable ? aiResult.marketImpact : {crudeOil:"Unavailable",gold:"Unavailable",usDollar:"Unavailable",defenseEquities:"Unavailable",polymarketImplication:"Unavailable"},
      noTradeRecommendation: aiResult.noTradeRecommendation,
    };

    const nearby = contextualObservations.filter(o => o.lat !== null && o.lon !== null && anomaly.lat !== undefined && anomaly.lon !== undefined && haversineDistanceKm(anomaly.lat,anomaly.lon,o.lat,o.lon)<=120 && o.source !== "static_intelligence");
    const domains = new Set(nearby.map(o=>o.domain));
    const sources = new Set(nearby.map(o=>o.source));
    // Corroboration is necessary, but does not itself establish an unpriced edge.
    dossier.noTradeRecommendation = { verdict: "DO_NOTHING", rationale: domains.size<2 || sources.size<2 ? "NO-TRADE: insufficient independent multi-domain corroboration within 120 km." : "NO-TRADE: corroboration exists, but an independently verified unpriced edge has not been established.", falsificationTrigger: "Independent validation of evidence and market pricing is required." };
    if (!modelAvailable) dossier.bluf = "AI unavailable. Unvalidated rule-based observation summary: " + anomaly.summary;

    // Persist event dossier and forecast ledger into SQLite
    this.persistDossier(dossier, modelAvailable);

    return dossier;
  }

  private persistDossier(dossier: IntelligenceDossier, persistForecast: boolean): void {
    try {
      const db = getDatabase();
      db.exec("BEGIN IMMEDIATE");

      // 1. Save to correlated_events
      const eventStmt = db.prepare(`
        INSERT OR REPLACE INTO correlated_events (id, title, bluf, threat_level, primary_domain, location_name, lat, lon, created_at, updated_at, dossier_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      eventStmt.run(
        dossier.eventId,
        dossier.summary,
        dossier.bluf,
        dossier.threatLevel,
        "geopolitical",
        dossier.location?.name || "Global",
        dossier.location?.lat ?? null,
        dossier.location?.lon ?? null,
        dossier.timestamp,
        dossier.timestamp,
        JSON.stringify(dossier)
      );

      // 2. Save forecast to calibrated ledger
      if (persistForecast && dossier.forecast) {
        const forecastStmt = db.prepare(`
          INSERT OR REPLACE INTO forecast_ledger (id, event_id, question, probability, target_date, created_at, rationale)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const targetEpoch = new Date(dossier.forecast.targetDate).getTime() || Date.now() + 86400000;
        forecastStmt.run(
          `forecast-${dossier.eventId}`,
          dossier.eventId,
          dossier.forecast.question,
          dossier.forecast.probability,
          targetEpoch,
          dossier.timestamp,
          dossier.forecast.falsifiableCriteria
        );
      }
      db.exec("COMMIT");
    } catch (err) {
      try { getDatabase().exec("ROLLBACK"); } catch {}
      throw err;
    }
  }
}

export const pipelineEngine = new PipelineEngine();
