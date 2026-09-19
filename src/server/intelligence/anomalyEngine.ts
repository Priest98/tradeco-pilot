import { calculateBaseline } from "./baseline";
import { getDatabase } from "@/server/db/client";
import { NormalizedObservation } from "@/server/ingestors/base";

export interface AnomalyRecord {
  id: string;
  timestamp: number;
  domain: NormalizedObservation["domain"];
  anomalyType: "military_cluster" | "jamming_spike" | "emergency_squawk" | "thermal_burst" | "multi_domain_cooccurrence" | "chokepoint_risk";
  zScore: number;
  confidence: number; // 0.0 to 1.0
  lat?: number;
  lon?: number;
  summary: string;
  evidence: Record<string, unknown>;
  status: "active" | "investigated" | "dismissed";
}

/**
 * Calculates Euclidean surface distance in kilometers using the Haversine formula.
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export class AnomalyEngine {
  /**
   * Evaluates a fresh batch of observations against statistical rules and historical baselines.
   */
  evaluateBatch(observations: NormalizedObservation[]): AnomalyRecord[] {
    const detected: AnomalyRecord[] = [];
    const now = Date.now();

    // 1. Rule: Emergency Aviation Squawks (7500, 7600, 7700)
    for (const obs of observations) {
      if (obs.domain === "aviation" && obs.data.isEmergency) {
        detected.push({
          id: `anomaly-squawk-${obs.entityId}-${now}`,
          timestamp: now,
          domain: "aviation",
          anomalyType: "emergency_squawk",
          zScore: 5.0, // Definite critical event
          confidence: 0.99,
          lat: obs.lat,
          lon: obs.lon,
          summary: `Aircraft ${obs.data.callsign || obs.entityId} broadcasting emergency squawk ${obs.data.squawk}`,
          evidence: obs.data,
          status: "active",
        });
      }
    }

    // 2. Rule: Military Aviation Clustering ($Z > 2.5$)
    const militaryFlights = observations.filter(
      (o) => o.domain === "aviation" && o.data.isMilitary && o.lat !== undefined && o.lon !== undefined
    );

    for (let i = 0; i < militaryFlights.length; i++) {
      const f1 = militaryFlights[i];
      const cluster = [f1];

      for (let j = i + 1; j < militaryFlights.length; j++) {
        const f2 = militaryFlights[j];
        if (f1.lat !== undefined && f1.lon !== undefined && f2.lat !== undefined && f2.lon !== undefined) {
          const dist = haversineDistanceKm(f1.lat, f1.lon, f2.lat, f2.lon);
          if (dist <= 150) {
            cluster.push(f2);
          }
        }
      }

      if (cluster.length >= 3) {
        const avgLat = cluster.reduce((sum, f) => sum + (f.lat || 0), 0) / cluster.length;
        const avgLon = cluster.reduce((sum, f) => sum + (f.lon || 0), 0) / cluster.length;
        const callsigns = cluster.map((f) => f.data.callsign || f.entityId).join(", ");

        detected.push({
          id: `anomaly-milcluster-${Math.floor(avgLat)}-${Math.floor(avgLon)}-${now}`,
          timestamp: now,
          domain: "aviation",
          anomalyType: "military_cluster",
          zScore: 2.8 + cluster.length * 0.4,
          confidence: 0.92,
          lat: avgLat,
          lon: avgLon,
          summary: `Military air cluster detected: ${cluster.length} military aircraft operating in close formation (${callsigns})`,
          evidence: {
            aircraftCount: cluster.length,
            aircraft: cluster.map((f) => f.data),
          },
          status: "active",
        });
        break; // Count cluster once per sweep
      }
    }

    // 3. Rule: High-Severity GPS Jamming Burst (> 50% jamming ratio)
    const jammingHexes = observations.filter(
      (o) => o.domain === "gpsjam" && (Number(o.data.jammingRatio) >= 0.4 || o.data.severity === "high")
    );

    for (const j of jammingHexes.slice(0, 5)) {
      detected.push({
        id: `anomaly-jam-${j.data.hex}-${now}`,
        timestamp: now,
        domain: "gpsjam",
        anomalyType: "jamming_spike",
        zScore: 3.2,
        confidence: 0.88,
        lat: j.lat,
        lon: j.lon,
        summary: `Severe electronic warfare / GPS jamming burst: ${(Number(j.data.jammingRatio) * 100).toFixed(0)}% degraded navigation signals in sector ${j.data.hex}`,
        evidence: j.data,
        status: "active",
      });
    }

    // 4. Rule: Multi-Domain Spatial Co-occurrence (e.g. GPS jamming + military flights within 100km)
    for (const j of jammingHexes) {
      if (j.lat === undefined || j.lon === undefined) continue;

      const nearbyMil = militaryFlights.filter((m) => {
        if (m.lat === undefined || m.lon === undefined) return false;
        return haversineDistanceKm(j.lat!, j.lon!, m.lat, m.lon) <= 120;
      });

      if (nearbyMil.length > 0) {
        detected.push({
          id: `anomaly-multidomain-${j.data.hex}-${now}`,
          timestamp: now,
          domain: "aviation",
          anomalyType: "multi_domain_cooccurrence",
          zScore: 4.5,
          confidence: 0.95,
          lat: j.lat,
          lon: j.lon,
          summary: `Multi-domain co-occurrence: ${nearbyMil.length} military aircraft operating inside active electronic warfare / GPS jamming corridor`,
          evidence: {
            jammingHex: j.data,
            militaryFlights: nearbyMil.map((m) => m.data),
          },
          status: "active",
        });
        break;
      }
    }

    // Historical comparison uses only recorded samples before the current observation.
    const db = getDatabase();
    for (const anomaly of detected) {
      const rows = db.prepare("SELECT timestamp, entity_id, data_json FROM observations WHERE domain=? AND timestamp>=? AND timestamp<? AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? ORDER BY timestamp").all(anomaly.domain, now-30*86400000, now-3600000, (anomaly.lat ?? 0)-1.5, (anomaly.lat ?? 0)+1.5, (anomaly.lon ?? 0)-1.5, (anomaly.lon ?? 0)+1.5);
      const bins = new Map<number, Set<string>>();
      const ratios = new Map<number, number[]>();
      for (const row of rows) {
        const data = JSON.parse(String(row.data_json)) as Record<string, unknown>;
        const hour = Math.floor(Number(row.timestamp)/3600000);
        if (anomaly.domain === "gpsjam" && typeof data.jammingRatio === "number") { const values=ratios.get(hour)||[];values.push(data.jammingRatio);ratios.set(hour,values); }
        else { const values=bins.get(hour)||new Set<string>(); if(data.isMilitary===true)values.add(String(row.entity_id)); bins.set(hour,values); }
      }
      const samples = anomaly.domain === "gpsjam" ? [...ratios.values()].map(v=>v.reduce((a,b)=>a+b,0)/v.length) : [...bins.values()].map(v=>v.size);
      const value = anomaly.domain === "gpsjam" ? Number(anomaly.evidence.jammingRatio) : Number(anomaly.evidence.aircraftCount ?? 0);
      const baseline = calculateBaseline(samples, value);
      anomaly.evidence = { ...anomaly.evidence, baseline, ruleTriggered: true };
      anomaly.zScore = anomaly.anomalyType === "emergency_squawk" || anomaly.anomalyType === "multi_domain_cooccurrence" ? 0 : baseline.zScore ?? 0;
    }

    // Persist anomalies into SQLite
    if (detected.length > 0) {
      this.persistAnomalies(detected);
    }

    return detected;
  }

  private persistAnomalies(anomalies: AnomalyRecord[]): void {
    try {
      const db = getDatabase();
      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO anomalies (id, timestamp, domain, anomaly_type, z_score, confidence, lat, lon, summary, evidence_json, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      db.exec("BEGIN IMMEDIATE;");
      for (const a of anomalies) {
        insertStmt.run(
          a.id,
          a.timestamp,
          a.domain,
          a.anomalyType,
          a.zScore,
          a.confidence,
          a.lat !== undefined ? a.lat : null,
          a.lon !== undefined ? a.lon : null,
          a.summary,
          JSON.stringify(a.evidence),
          a.status
        );
      }
      db.exec("COMMIT;");
    } catch (err) {
      try {
        const db = getDatabase();
        db.exec("ROLLBACK;");
      } catch {}
      console.error("[AnomalyEngine] Failed to persist anomalies:", err);
    }
  }

  /**
   * Retrieves active anomalies ranked by Z-score.
   */
  getActiveAnomalies(limit: number = 20): AnomalyRecord[] {
    try {
      const db = getDatabase();
      const stmt = db.prepare(`
        SELECT id, timestamp, domain, anomaly_type as anomalyType, z_score as zScore, confidence, lat, lon, summary, evidence_json as evidenceJson, status
        FROM anomalies
        WHERE status = 'active'
        ORDER BY z_score DESC, timestamp DESC
        LIMIT ?
      `);

      const rows = stmt.all(limit) as Array<Omit<AnomalyRecord, "evidence"> & {evidenceJson: string}>;
      return rows.map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        domain: r.domain,
        anomalyType: r.anomalyType,
        zScore: r.zScore,
        confidence: r.confidence,
        lat: r.lat,
        lon: r.lon,
        summary: r.summary,
        evidence: JSON.parse(r.evidenceJson || "{}"),
        status: r.status,
      }));
    } catch (err) {
      console.error("[AnomalyEngine] Failed to load anomalies:", err);
      return [];
    }
  }
}

export const anomalyEngine = new AnomalyEngine();
