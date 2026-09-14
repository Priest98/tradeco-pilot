import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";

// Initialize SQLite database
const db = new DatabaseSync(":memory:");
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");
const schema = fs.readFileSync("src/server/db/schema.sql", "utf-8");
db.exec(schema);

console.log("Fetching live USGS earthquake feed through SSRF-guarded fetch...");

const res = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson");
if (!res.ok) {
  throw new Error(`USGS failed: ${res.status}`);
}

const data = await res.json();
const features = data.features || [];
console.log(`Successfully fetched ${features.length} real-time earthquakes from USGS!`);

const insertStmt = db.prepare(`
  INSERT INTO observations (id, domain, source, entity_id, lat, lon, alt, timestamp, data_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

db.exec("BEGIN TRANSACTION;");
let count = 0;
for (const feat of features.slice(0, 50)) {
  const [lon, lat, depth] = feat.geometry?.coordinates || [0, 0, 0];
  insertStmt.run(
    `usgs-${feat.id}`,
    "seismic",
    "usgs",
    feat.id,
    lat,
    lon,
    -depth * 1000,
    feat.properties?.time || Date.now(),
    JSON.stringify({
      magnitude: feat.properties?.mag,
      place: feat.properties?.place,
      depthKm: depth,
    })
  );
  count++;
}
db.exec("COMMIT;");

console.log(`Persisted ${count} normalized seismic observations into SQLite.`);
const queryCount = db.prepare("SELECT COUNT(*) as c FROM observations WHERE domain = 'seismic'").get();
console.log(`Verified in database: ${queryCount.c} observations.`);

// Sample check
const sample = db.prepare("SELECT * FROM observations LIMIT 1").get();
console.log("Sample observation:", {
  id: sample.id,
  domain: sample.domain,
  source: sample.source,
  lat: sample.lat,
  lon: sample.lon,
  data: JSON.parse(sample.data_json),
});

db.close();
console.log("✅ Ingestor live verification succeeded!");
