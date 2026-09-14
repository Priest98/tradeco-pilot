import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
let dbInstance: DatabaseSync | null = null;

function getLocalEnv() {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  return {
    DATA_DIR: process.env.DATA_DIR || (isServerless ? "/tmp" : "./data"),
    DATABASE_NAME: process.env.DATABASE_NAME || "intelligence.db",
  };
}

export function getDatabase(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const env = getLocalEnv();
  const dataDir = path.resolve(env.DATA_DIR);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, env.DATABASE_NAME);
  const db = new DatabaseSync(dbPath);

  // Configure high performance and durability settings
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");

  // Load and apply initial schema
  const schemaPath = path.resolve(process.cwd(), "src/server/db/schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    db.exec(schemaSql);
  }

  // Auto-seed initial tactical data if empty (e.g. in fresh serverless container)
  try {
    const obsCount = (db.prepare("SELECT COUNT(*) as c FROM observations").get() as any)?.c || 0;
    if (obsCount === 0) {
      const now = Date.now();
      const insertObs = db.prepare(`
        INSERT INTO observations (id, domain, source, entity_id, lat, lon, alt, timestamp, data_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertObs.run("obs-mil-1", "aviation", "adsb.fi", "F35-01", 26.2, 56.1, 8000, now, JSON.stringify({ callsign: "VIPER01", isMilitary: true, type: "F-35A Lightning II" }));
      insertObs.run("obs-mil-2", "aviation", "adsb.fi", "KC46-01", 26.3, 56.2, 8200, now, JSON.stringify({ callsign: "SHELL41", isMilitary: true, type: "KC-46A Pegasus" }));
      insertObs.run("obs-mil-3", "aviation", "adsb.fi", "E3-01", 26.25, 56.15, 9100, now, JSON.stringify({ callsign: "SENTRY01", isMilitary: true, type: "E-3 Sentry AWACS" }));
      insertObs.run("obs-jam-1", "gpsjam", "gpsjam.org", "842cb8bffffffff", 26.2, 56.2, 0, now, JSON.stringify({ hex: "842cb8bffffffff", jammingRatio: 0.68, severity: "high" }));
      insertObs.run("obs-ship-1", "maritime", "aisstream", "tanker-01", 26.15, 56.3, 0, now, JSON.stringify({ name: "PACIFIC VOYAGER", type: "VLCC Crude Carrier", speedKnots: 11.2 }));

      // Seed core macro tickers and prediction contracts
      insertObs.run("obs-mkt-1", "market", "yahoo_finance", "CL=F", 0, 0, 0, now, JSON.stringify({ symbol: "CL=F", name: "Crude Oil (WTI)", price: 78.45, changePct: 3.22, category: "commodity" }));
      insertObs.run("obs-mkt-2", "market", "yahoo_finance", "BZ=F", 0, 0, 0, now, JSON.stringify({ symbol: "BZ=F", name: "Brent Crude", price: 82.10, changePct: 3.58, category: "commodity" }));
      insertObs.run("obs-mkt-3", "market", "yahoo_finance", "GC=F", 0, 0, 0, now, JSON.stringify({ symbol: "GC=F", name: "Gold Futures", price: 2648.50, changePct: 1.42, category: "commodity" }));
      insertObs.run("obs-mkt-4", "market", "yahoo_finance", "LMT", 0, 0, 0, now, JSON.stringify({ symbol: "LMT", name: "Lockheed Martin", price: 472.30, changePct: 2.15, category: "defense" }));
      insertObs.run("obs-mkt-5", "market", "polymarket", "poly-101", 0, 0, 0, now, JSON.stringify({ title: "Strait of Hormuz commercial shipping transit drop >20%?", yesProbability: 0.72 }));
      insertObs.run("obs-mkt-6", "market", "polymarket", "poly-102", 0, 0, 0, now, JSON.stringify({ title: "Middle East military conflict escalation in next 30 days?", yesProbability: 0.68 }));

      const insertAnom = db.prepare(`
        INSERT INTO anomalies (id, timestamp, domain, anomaly_type, z_score, confidence, lat, lon, summary, evidence_json, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertAnom.run("anom-001", now, "aviation", "military_cluster", 4.82, 0.96, 26.25, 56.15,
        "Military Air Formation Convergence in Strait of Hormuz (F-35, KC-46 Refueler, E-3 AWACS)",
        JSON.stringify({ aircraftCount: 3, callsigns: ["VIPER01", "SHELL41", "SENTRY01"], jammingRatio: 0.68 }), "active");
      insertAnom.run("anom-002", now - 3600000, "gpsjam", "jamming_spike", 3.91, 0.91, 33.8, 35.1,
        "Electronic Warfare Spoofing Spike across Eastern Mediterranean Air Corridors",
        JSON.stringify({ jammingRatio: 0.74, affectedHexes: 4 }), "active");
      insertAnom.run("anom-003", now - 7200000, "aviation", "emergency_squawk", 3.10, 0.88, 14.5, 42.8,
        "Transponder Squawk 7700 (General Emergency) Declared in Southern Red Sea",
        JSON.stringify({ squawk: "7700", altitude: "FL240" }), "active");

      const insertEvent = db.prepare(`
        INSERT INTO correlated_events (id, title, bluf, threat_level, primary_domain, location_name, lat, lon, created_at, updated_at, dossier_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const dossier = {
        eventId: "event-hormuz-convergence",
        threatLevel: "CRITICAL",
        bluf: "BLUF: Multi-domain military airborne formation and intense GPS signal degradation (68%) detected simultaneously over the Strait of Hormuz. Commercial tanker traffic slowed.",
        keyDrivers: ["Z-Score 4.82 deviation above historical baseline", "High-power electronic countermeasure corridor", "Chokepoint transit vulnerability"],
        competingHypotheses: [
          { hypothesis: "Unannounced combat air patrol / defensive combat screen deployment", probability: 0.65, supporting: ["E-3 AWACS and tanker present"], contradicting: ["No public NOTAM"] },
          { hypothesis: "Tactical maritime interdiction drill", probability: 0.25, supporting: ["Proximity to sea lanes"], contradicting: ["High EW jamming footprint"] },
          { hypothesis: "Navigation spoofing failure / false-positive radar bounce", probability: 0.10, supporting: ["Known spoofing area"], contradicting: ["3 ADS-B verified military tails"] },
        ],
        marketImpact: {
          crudeOil: "Immediate +$2.50/bbl geopolitical risk premium on Brent Crude if maritime passage is contested.",
          defenseEquities: "Strong positive momentum for RTX, LMT, NOC.",
        },
        noTradeRecommendation: {
          verdict: "DO_NOTHING",
          rationale: "Information edge is not yet unique; wait for confirmed commercial VLCC tanker reroutes before opening commodity hedge.",
        },
      };
      insertEvent.run("event-hormuz-convergence",
        "Strait of Hormuz Multi-Domain Military Air Formation & Electronic Warfare",
        dossier.bluf, "CRITICAL", "aviation", "Strait of Hormuz", 26.25, 56.15, now, now, JSON.stringify(dossier));

      const insertForecast = db.prepare(`
        INSERT INTO forecast_ledger (id, event_id, question, probability, target_date, created_at, outcome, brier_score, rationale)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertForecast.run("forecast-001", "event-hormuz-convergence",
        "Will commercial tanker transit through the Strait of Hormuz drop >20% in next 48 hours?",
        0.72, now + 48 * 3600 * 1000, now, null, null,
        "Assigned 0.72 based on verified airborne tanker and AWACS presence plus 68% GPS spoofing ratio.");
    }
  } catch (err) {
    console.warn("[DatabaseSync] Seeding warning:", err);
  }

  dbInstance = db;
  return dbInstance;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
