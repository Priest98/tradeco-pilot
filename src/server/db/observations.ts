import { getDatabase } from "./client";

export function queryObservations(domain: string, start: number, end: number, limit = 10000) {
  const rows = getDatabase().prepare(`SELECT id, domain, source, entity_id AS entityId,
    lat, lon, alt, timestamp, data_json FROM observations
    WHERE domain = ? AND timestamp >= ? AND timestamp < ? ORDER BY timestamp ASC LIMIT ?`).all(domain, start, end, limit);
  return rows.map(row => ({ id:String(row.id), domain:String(row.domain), source:String(row.source), entityId:row.entityId===null ? undefined : String(row.entityId), lat:row.lat===null ? undefined : Number(row.lat), lon:row.lon===null ? undefined : Number(row.lon), alt:row.alt===null ? undefined : Number(row.alt), timestamp:Number(row.timestamp), data: JSON.parse(String(row.data_json)) as Record<string, unknown> }));
}
