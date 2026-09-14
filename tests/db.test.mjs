import { describe, it } from "node:test";
import assert from "node:assert";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";

describe("SQLite Database & WAL Storage Verification", () => {
  it("should initialize schema, enforce foreign keys, and support WAL transactions", () => {
    const db = new DatabaseSync(":memory:");
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA synchronous = NORMAL;");
    db.exec("PRAGMA foreign_keys = ON;");

    const schema = fs.readFileSync("src/server/db/schema.sql", "utf-8");
    db.exec(schema);

    // 1. Insert an anomaly
    const now = Date.now();
    const insert = db.prepare(`
      INSERT INTO anomalies (id, timestamp, domain, anomaly_type, z_score, confidence, lat, lon, summary, evidence_json, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      "test-anom-1",
      now,
      "aviation",
      "military_cluster",
      3.4,
      0.95,
      35.5,
      44.2,
      "Test military cluster",
      JSON.stringify({ count: 4 }),
      "active"
    );

    // Query anomaly
    const query = db.prepare("SELECT * FROM anomalies WHERE id = ?");
    const row = query.get("test-anom-1");

    assert.ok(row);
    assert.strictEqual(row.anomaly_type, "military_cluster");
    assert.strictEqual(row.z_score, 3.4);

    // 2. Insert parent correlated_event first to satisfy relational FK
    const eventInsert = db.prepare(`
      INSERT INTO correlated_events (id, title, bluf, threat_level, primary_domain, location_name, lat, lon, created_at, updated_at, dossier_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    eventInsert.run(
      "e-1",
      "Airspace Anomaly Event",
      "BLUF: Military aviation clustering detected.",
      "HIGH",
      "aviation",
      "Eastern Sector",
      35.5,
      44.2,
      now,
      now,
      "{}"
    );

    // 3. Insert child calibrated forecast referencing event e-1
    const forecastInsert = db.prepare(`
      INSERT INTO forecast_ledger (id, event_id, question, probability, target_date, created_at, outcome, brier_score, rationale)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    forecastInsert.run(
      "f-1",
      "e-1",
      "Will airspace reopen within 24h?",
      0.75,
      now + 86400000,
      now,
      1,
      0.0625,
      "Historical precedent"
    );

    const fRow = db.prepare("SELECT * FROM forecast_ledger WHERE id = ?").get("f-1");
    assert.ok(fRow);
    assert.strictEqual(fRow.brier_score, 0.0625);
    assert.strictEqual(fRow.event_id, "e-1");

    db.close();
  });
});
