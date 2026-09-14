import { getDatabase } from "../db/client.ts";

export interface CalibrationBucket {
  bucketRange: string; // e.g. "0.0 - 0.2"
  forecastCount: number;
  meanForecastProbability: number;
  observedEmpiricalRate: number;
  calibrationError: number; // |meanForecast - observedRate|
}

export interface CalibrationAnalyticsReport {
  totalForecasts: number;
  resolvedForecasts: number;
  unresolvedForecasts: number;
  cumulativeBrierScore: number | null;
  brierSkillScore: number | null; // 1 - (BS / 0.25)
  calibrationStatus: "SUPERFORECASTER (ELITE)" | "ACCEPTABLE (BEATING_RANDOM)" | "NEEDS_CALIBRATION" | "PENDING_RESOLUTION";
  calibrationBuckets: CalibrationBucket[];
  recentResolvedForecasts: Array<{
    id: string;
    question: string;
    probability: number;
    outcome: number;
    brierScore: number;
    resolvedAt: number;
  }>;
}

export function computeCalibrationAnalytics(): CalibrationAnalyticsReport {
  const db = getDatabase();

  const allRows = db.prepare(`
    SELECT id, question, probability, outcome, brier_score, target_date, created_at, resolved_at
    FROM forecast_ledger
    ORDER BY created_at DESC
  `).all() as any[];

  const resolved = allRows.filter((r) => r.outcome !== null && r.outcome !== undefined);
  const unresolved = allRows.filter((r) => r.outcome === null || r.outcome === undefined);

  if (resolved.length === 0) {
    return {
      totalForecasts: allRows.length,
      resolvedForecasts: 0,
      unresolvedForecasts: unresolved.length,
      cumulativeBrierScore: null,
      brierSkillScore: null,
      calibrationStatus: "PENDING_RESOLUTION",
      calibrationBuckets: [],
      recentResolvedForecasts: [],
    };
  }

  // 1. Cumulative Brier Score: mean of (probability - outcome)^2
  const brierSum = resolved.reduce((acc, r) => {
    const p = Number(r.probability);
    const o = Number(r.outcome);
    const itemScore = r.brier_score !== null ? Number(r.brier_score) : Math.pow(p - o, 2);
    return acc + itemScore;
  }, 0);

  const cumulativeBrierScore = parseFloat((brierSum / resolved.length).toFixed(4));

  // Brier Skill Score against 50/50 baseline (BS_ref = 0.25)
  const brierSkillScore = parseFloat((1 - cumulativeBrierScore / 0.25).toFixed(4));

  let calibrationStatus: CalibrationAnalyticsReport["calibrationStatus"] = "NEEDS_CALIBRATION";
  if (cumulativeBrierScore < 0.15) {
    calibrationStatus = "SUPERFORECASTER (ELITE)";
  } else if (cumulativeBrierScore < 0.25) {
    calibrationStatus = "ACCEPTABLE (BEATING_RANDOM)";
  }

  // 2. Reliability Calibration Buckets (5 bins across [0.0, 1.0])
  const BUCKET_DEFS = [
    { label: "0.0 - 0.2", min: 0.0, max: 0.2 },
    { label: "0.2 - 0.4", min: 0.2, max: 0.4 },
    { label: "0.4 - 0.6", min: 0.4, max: 0.6 },
    { label: "0.6 - 0.8", min: 0.6, max: 0.8 },
    { label: "0.8 - 1.0", min: 0.8, max: 1.01 },
  ];

  const calibrationBuckets: CalibrationBucket[] = BUCKET_DEFS.map((b) => {
    const inBucket = resolved.filter((r) => r.probability >= b.min && r.probability < b.max);
    if (inBucket.length === 0) {
      return {
        bucketRange: b.label,
        forecastCount: 0,
        meanForecastProbability: parseFloat(((b.min + Math.min(1.0, b.max)) / 2).toFixed(2)),
        observedEmpiricalRate: 0,
        calibrationError: 0,
      };
    }

    const meanP = inBucket.reduce((acc, r) => acc + r.probability, 0) / inBucket.length;
    const empiricalRate = inBucket.filter((r) => r.outcome === 1).length / inBucket.length;
    const err = Math.abs(meanP - empiricalRate);

    return {
      bucketRange: b.label,
      forecastCount: inBucket.length,
      meanForecastProbability: parseFloat(meanP.toFixed(4)),
      observedEmpiricalRate: parseFloat(empiricalRate.toFixed(4)),
      calibrationError: parseFloat(err.toFixed(4)),
    };
  });

  return {
    totalForecasts: allRows.length,
    resolvedForecasts: resolved.length,
    unresolvedForecasts: unresolved.length,
    cumulativeBrierScore,
    brierSkillScore,
    calibrationStatus,
    calibrationBuckets,
    recentResolvedForecasts: resolved.slice(0, 10).map((r) => ({
      id: r.id,
      question: r.question,
      probability: r.probability,
      outcome: r.outcome,
      brierScore: r.brier_score !== null ? r.brier_score : Math.pow(r.probability - r.outcome, 2),
      resolvedAt: r.resolved_at || Date.now(),
    })),
  };
}

/**
 * Resolves a forecast in SQLite and records Brier score.
 */
export function resolveForecastRecord(forecastId: string, outcome: 0 | 1): { brierScore: number } {
  const db = getDatabase();
  const row = db.prepare("SELECT probability FROM forecast_ledger WHERE id = ?").get(forecastId) as any;

  if (!row) {
    throw new Error(`Forecast with ID ${forecastId} not found`);
  }

  const p = Number(row.probability);
  const brierScore = parseFloat(Math.pow(p - outcome, 2).toFixed(4));
  const now = Date.now();

  db.prepare(`
    UPDATE forecast_ledger
    SET outcome = ?, brier_score = ?, resolved_at = ?
    WHERE id = ?
  `).run(outcome, brierScore, now, forecastId);

  return { brierScore };
}
