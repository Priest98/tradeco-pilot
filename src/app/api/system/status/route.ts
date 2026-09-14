import { NextResponse } from "next/server";
import { ingestorRegistry } from "@/server/ingestors/registry";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  const ingestorHealth = ingestorRegistry.getAllHealth();

  let dbStats = {
    totalObservations: 0,
    totalAnomalies: 0,
    totalEvents: 0,
    totalForecasts: 0,
  };

  try {
    const db = getDatabase();
    const obsCount = db.prepare("SELECT COUNT(*) as c FROM observations").get() as { c: number };
    const anomalyCount = db.prepare("SELECT COUNT(*) as c FROM anomalies").get() as { c: number };
    const eventCount = db.prepare("SELECT COUNT(*) as c FROM correlated_events").get() as { c: number };
    const forecastCount = db.prepare("SELECT COUNT(*) as c FROM forecast_ledger").get() as { c: number };

    dbStats = {
      totalObservations: obsCount?.c || 0,
      totalAnomalies: anomalyCount?.c || 0,
      totalEvents: eventCount?.c || 0,
      totalForecasts: forecastCount?.c || 0,
    };
  } catch (err) {
    console.warn("DB stats fetch warning:", err);
  }

  return NextResponse.json({
    status: "operational",
    system: "TradeCo-Pilot Personal Global Intelligence System",
    version: "1.0.0",
    zuluTime: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbStats,
    ingestors: ingestorHealth,
    queryLatencyMs: Date.now() - startTime,
  });
}
