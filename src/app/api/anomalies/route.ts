import { NextResponse } from "next/server";
import { anomalyEngine } from "@/server/intelligence/anomalyEngine";
import { pipelineEngine } from "@/server/intelligence/pipelineEngine";
import { getDatabase } from "@/server/db/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const investigateSchema = z.object({
  anomalyId: z.string().min(1, "anomalyId is required"),
});

export async function GET() {
  try {
    const anomalies = anomalyEngine.getActiveAnomalies(30);
    return NextResponse.json({
      count: anomalies.length,
      anomalies,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch anomalies", message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = investigateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation Error", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { anomalyId } = parsed.data;
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT id, timestamp, domain, anomaly_type as anomalyType, z_score as zScore, confidence, lat, lon, summary, evidence_json as evidenceJson, status
      FROM anomalies
      WHERE id = ?
    `);

    const row = stmt.get(anomalyId) as any;
    if (!row) {
      return NextResponse.json(
        { error: "Anomaly not found", anomalyId },
        { status: 404 }
      );
    }

    const anomalyRecord = {
      id: row.id,
      timestamp: row.timestamp,
      domain: row.domain,
      anomalyType: row.anomalyType,
      zScore: row.zScore,
      confidence: row.confidence,
      lat: row.lat,
      lon: row.lon,
      summary: row.summary,
      evidence: JSON.parse(row.evidenceJson || "{}"),
      status: row.status,
    };

    // Run the 7-stage multi-role reasoning brain
    const dossier = await pipelineEngine.runPipeline(anomalyRecord);

    return NextResponse.json({
      status: "success",
      message: "Intelligence pipeline completed",
      dossier,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Pipeline execution failed", message: err.message },
      { status: 500 }
    );
  }
}
