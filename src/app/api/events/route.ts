import { NextResponse } from "next/server";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT id, title, bluf, threat_level as threatLevel, primary_domain as primaryDomain, location_name as locationName, lat, lon, created_at as createdAt, updated_at as updatedAt, dossier_json as dossierJson
      FROM correlated_events
      ORDER BY updated_at DESC
      LIMIT 50
    `);

    const rows = stmt.all() as any[];
    const events = rows.map((r) => ({
      id: r.id,
      title: r.title,
      bluf: r.bluf,
      threatLevel: r.threatLevel,
      primaryDomain: r.primaryDomain,
      locationName: r.locationName,
      lat: r.lat,
      lon: r.lon,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      dossier: JSON.parse(r.dossierJson || "{}"),
    }));

    return NextResponse.json({
      count: events.length,
      events,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch events", message: err.message },
      { status: 500 }
    );
  }
}
