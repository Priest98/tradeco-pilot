import type { Telemetry } from "@/store/intelligenceStore";
/** Interpolate recorded samples only; never interpolate a gap longer than five minutes. */
export function positionAt(samples: Telemetry[], time: number | null): {lat:number;lon:number;alt:number} | null {
  if(!samples.length)return null;
  const before=time===null?samples.at(-1):samples.findLast(s=>s.timestamp<=time);
  if(!before || typeof before.lat!=="number" || typeof before.lon!=="number")return null;
  const result={lat:before.lat,lon:before.lon,alt:before.alt ?? 0};
  if(time===null)return result;
  const after=samples.find(s=>s.timestamp>time);
  if(!after || after.timestamp-before.timestamp>300000 || typeof after.lat!=="number" || typeof after.lon!=="number")return time-before.timestamp>300000 && ["aviation","maritime","satellite"].includes(before.domain)?null:result;
  const t=(time-before.timestamp)/(after.timestamp-before.timestamp);
  const delta=((after.lon-before.lon+540)%360)-180;
  return {lat:before.lat+(after.lat-before.lat)*t,lon:((before.lon+delta*t+540)%360)-180,alt:result.alt+((after.alt ?? 0)-result.alt)*t};
}
