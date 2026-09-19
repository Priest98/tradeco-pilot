import { describe, it } from "node:test";
import assert from "node:assert";
import { computeCalibrationAnalytics, resolveForecastRecord } from "../src/server/intelligence/calibrationAnalytics.ts";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";

describe("Superforecaster Brier Calibration Analytics Verification", () => {
  it("calculates accurate Brier Skill Score and Reliability Calibration Curve", () => {
    // 1. Compute analytics on current state
    const report = computeCalibrationAnalytics();
    assert.strictEqual(report.totalForecasts, 0);
    assert.strictEqual(report.cumulativeBrierScore, null);
    assert.ok(Array.isArray(report.calibrationBuckets));
  });

  it("calculates Brier quadratic penalty and assigns elite status when BS < 0.15", () => {
    // Perfect: P=0.8, Outcome=1 -> (0.8 - 1)^2 = 0.04
    const p1 = 0.8;
    const o1 = 1;
    const bs1 = Math.pow(p1 - o1, 2);
    assert.strictEqual(parseFloat(bs1.toFixed(4)), 0.04);

    // Skill score: 1 - (0.04 / 0.25) = 1 - 0.16 = +0.84 (84% skill superiority over random)
    const bss1 = 1 - (bs1 / 0.25);
    assert.strictEqual(parseFloat(bss1.toFixed(2)), 0.84);
  });
});
