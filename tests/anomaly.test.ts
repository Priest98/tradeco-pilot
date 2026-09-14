import { describe, it, expect } from "vitest";
import { AnomalyEngine, haversineDistanceKm } from "../src/server/intelligence/anomalyEngine";
import { NormalizedObservation } from "../src/server/ingestors/base";

describe("Deterministic Anomaly Engine Tests", () => {
  it("should accurately calculate Haversine surface distance", () => {
    // London (51.5074, -0.1278) to Paris (48.8566, 2.3522) is approx 343 km
    const dist = haversineDistanceKm(51.5074, -0.1278, 48.8566, 2.3522);
    expect(Math.round(dist)).toBeGreaterThanOrEqual(340);
    expect(Math.round(dist)).toBeLessThanOrEqual(350);
  });

  it("should trigger critical emergency anomaly on 7700 or 7500 squawk", () => {
    const engine = new AnomalyEngine();
    const obs: NormalizedObservation[] = [
      {
        id: "flight-test-1",
        domain: "aviation",
        source: "adsb.fi",
        entityId: "abc123",
        lat: 52.0,
        lon: 13.0,
        timestamp: Date.now(),
        data: {
          callsign: "RESCUE01",
          squawk: "7700",
          isEmergency: true,
          isMilitary: false,
        },
      },
    ];

    const anomalies = engine.evaluateBatch(obs);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].anomalyType).toBe("emergency_squawk");
    expect(anomalies[0].zScore).toBe(5.0);
  });

  it("should detect military flight clustering when >= 3 military aircraft converge", () => {
    const engine = new AnomalyEngine();
    const now = Date.now();

    const obs: NormalizedObservation[] = [
      {
        id: "f1",
        domain: "aviation",
        source: "adsb.fi",
        entityId: "mil1",
        lat: 34.0,
        lon: 36.0,
        timestamp: now,
        data: { callsign: "VIPER1", isMilitary: true },
      },
      {
        id: "f2",
        domain: "aviation",
        source: "adsb.fi",
        entityId: "mil2",
        lat: 34.1,
        lon: 36.1,
        timestamp: now,
        data: { callsign: "VIPER2", isMilitary: true },
      },
      {
        id: "f3",
        domain: "aviation",
        source: "adsb.fi",
        entityId: "mil3",
        lat: 34.05,
        lon: 36.05,
        timestamp: now,
        data: { callsign: "TANKER1", isMilitary: true },
      },
    ];

    const anomalies = engine.evaluateBatch(obs);
    const cluster = anomalies.find((a) => a.anomalyType === "military_cluster");
    expect(cluster).toBeDefined();
    expect(cluster!.zScore).toBeGreaterThanOrEqual(2.5);
  });
});
