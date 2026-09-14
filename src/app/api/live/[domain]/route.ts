import { NextResponse } from "next/server";
import { ingestorRegistry } from "@/server/ingestors/registry";
import { anomalyEngine } from "@/server/intelligence/anomalyEngine";
import { getDatabase } from "@/server/db/client";

export const dynamic = "force-dynamic";

const VALID_DOMAINS = new Set([
  "aviation",
  "maritime",
  "satellite",
  "gpsjam",
  "seismic",
  "thermal",
  "news",
  "market",
  "cyber",
]);

export async function GET(
  request: Request,
  context: { params: Promise<{ domain: string }> }
) {
  const { domain } = await context.params;

  if (!VALID_DOMAINS.has(domain)) {
    return NextResponse.json(
      { error: "Invalid domain", validDomains: Array.from(VALID_DOMAINS) },
      { status: 400 }
    );
  }

  try {
    const db = getDatabase();

    // Query recent observations for this domain (last 2 hours)
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const stmt = db.prepare(`
      SELECT id, domain, source, entity_id as entityId, lat, lon, alt, timestamp, data_json as dataJson
      FROM observations
      WHERE domain = ? AND timestamp >= ?
      ORDER BY timestamp DESC
      LIMIT 1000
    `);

    let rows = stmt.all(domain, twoHoursAgo) as any[];

    // If database is empty on cold start, trigger active ingestor for domain
    if (rows.length === 0) {
      const matchingIngestor = Array.from(ingestorRegistry["ingestors"].values()).find(
        (i) => i.domain === domain
      );

      if (matchingIngestor) {
        const fresh = await matchingIngestor.poll();
        if (fresh.length > 0) {
          // Evaluate anomalies deterministically
          anomalyEngine.evaluateBatch(fresh);

          rows = fresh.map((f) => ({
            id: f.id,
            domain: f.domain,
            source: f.source,
            entityId: f.entityId,
            lat: f.lat,
            lon: f.lon,
            alt: f.alt,
            timestamp: f.timestamp,
            dataJson: JSON.stringify(f.data),
          }));
        }
      }
    }

    const items = rows.map((r) => ({
      id: r.id,
      domain: r.domain,
      source: r.source,
      entityId: r.entityId,
      lat: r.lat,
      lon: r.lon,
      alt: r.alt,
      timestamp: r.timestamp,
      data: JSON.parse(r.dataJson || "{}"),
    }));

    return NextResponse.json({
      domain,
      count: items.length,
      timestamp: Date.now(),
      items,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to retrieve live data for ${domain}`, message: err.message },
      { status: 500 }
    );
  }
}
