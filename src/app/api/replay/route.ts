import { NextResponse } from "next/server";
import { queryObservations } from "@/server/db/observations";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const start = Number(params.get("start"));
  const domain = params.get("domain") || "aviation";
  if (!params.has("start") || !Number.isFinite(start) || start < Date.now() - 73 * 3600000 || start > Date.now() || !["aviation", "maritime", "gpsjam", "satellite", "seismic", "thermal"].includes(domain)) {
    return NextResponse.json({ error: "Invalid replay window or domain" }, { status: 400 });
  }
  try {
    const items = queryObservations(domain, start, start + 3600000);
    return NextResponse.json({ items, start, end: start + 3600000, truncated: items.length === 10000 });
  } catch { return NextResponse.json({ error: "Replay unavailable" }, { status: 503 }); }
}
