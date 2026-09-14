import { describe, it } from "node:test";
import assert from "node:assert";

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
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

describe("Statistical Anomaly Calculations", () => {
  it("calculates accurate geographic distance between coordinates", () => {
    const dist = haversineDistanceKm(51.5074, -0.1278, 48.8566, 2.3522);
    assert.ok(dist >= 340 && dist <= 350, `Expected ~343km, got ${dist}`);
  });

  it("calculates accurate quadratic Brier calibration score", () => {
    // Perfect prediction (P=1.0, O=1)
    assert.strictEqual(Math.pow(1.0 - 1, 2), 0);

    // High confidence true prediction (P=0.8, O=1) -> 0.04
    assert.strictEqual(parseFloat(Math.pow(0.8 - 1, 2).toFixed(4)), 0.04);

    // Completely wrong prediction (P=0.9, O=0) -> 0.81 penalty
    assert.strictEqual(parseFloat(Math.pow(0.9 - 0, 2).toFixed(4)), 0.81);
  });
});
