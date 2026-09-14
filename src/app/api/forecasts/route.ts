import { NextResponse } from "next/server";
import { getDatabase } from "@/server/db/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const resolveForecastSchema = z.object({
  forecastId: z.string().min(1),
  outcome: z.union([z.literal(0), z.literal(1)]), // 0 = Did not occur, 1 = Occurred
});

export async function GET() {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT id, event_id as eventId, question, probability, target_date as targetDate, created_at as createdAt, outcome, brier_score as brierScore, resolved_at as resolvedAt, rationale
      FROM forecast_ledger
      ORDER BY created_at DESC
      LIMIT 100
    `);

    const rows = stmt.all() as any[];

    // Calculate aggregate Brier score across resolved forecasts
    const resolved = rows.filter((r) => r.outcome !== null);
    let meanBrierScore: number | null = null;

    if (resolved.length > 0) {
      const sum = resolved.reduce((acc, r) => acc + (r.brierScore || 0), 0);
      meanBrierScore = parseFloat((sum / resolved.length).toFixed(4));
    }

    return NextResponse.json({
      totalForecasts: rows.length,
      resolvedCount: resolved.length,
      meanBrierScore,
      calibrationGrade:
        meanBrierScore === null
          ? "PENDING_RESOLUTION"
          : meanBrierScore < 0.15
          ? "SUPERFORECASTER (ELITE)"
          : meanBrierScore < 0.25
          ? "ACCEPTABLE (BEATING_RANDOM)"
          : "NEEDS_CALIBRATION",
      forecasts: rows,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch forecasts", message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = resolveForecastSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation Error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { forecastId, outcome } = parsed.data;
    const db = getDatabase();

    const stmt = db.prepare("SELECT id, probability FROM forecast_ledger WHERE id = ?");
    const forecast = stmt.get(forecastId) as { id: string; probability: number } | undefined;

    if (!forecast) {
      return NextResponse.json({ error: "Forecast not found", forecastId }, { status: 404 });
    }

    // Compute quadratic Brier score: (probability - outcome)^2
    const brierScore = parseFloat(Math.pow(forecast.probability - outcome, 2).toFixed(4));
    const now = Date.now();

    const updateStmt = db.prepare(`
      UPDATE forecast_ledger
      SET outcome = ?, brier_score = ?, resolved_at = ?
      WHERE id = ?
    `);

    updateStmt.run(outcome, brierScore, now, forecastId);

    return NextResponse.json({
      status: "resolved",
      forecastId,
      probability: forecast.probability,
      outcome,
      brierScore,
      resolvedAt: new Date(now).toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Resolution failed", message: err.message },
      { status: 500 }
    );
  }
}
