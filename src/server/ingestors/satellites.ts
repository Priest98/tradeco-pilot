import { BaseIngestor, NormalizedObservation } from "./base";
import { safeFetch } from "@/server/security/ssrfGuard";
import * as satellite from "satellite.js";

const CELESTRAK_GROUPS = [
  { group: "stations", category: "space_station" },
  { group: "visual", category: "brightest" },
  { group: "military", category: "military" },
  { group: "weather", category: "weather" },
];

const MILITARY_KEYWORDS = [
  "AEHF", "COSMOS", "DSP", "KH-", "LACROSSE", "MENTOR", "MILSTAR", "MUOS",
  "NAVSTAR", "NROL", "ONYX", "ORION", "PARUS", "SBIRS", "SICRAL", "SKYNET",
  "STRELA", "TRUMPET", "USA ", "YAOGAN", "SHIJIAN", "TJS"
];

export interface ParsedSatelliteRecord {
  name: string;
  noradId: string;
  line1: string;
  line2: string;
  category: string;
  isMilitary: boolean;
  lat?: number;
  lon?: number;
  altKm?: number;
  velocityKmS?: number;
}

export function isMilitarySatellite(name: string): boolean {
  const upper = name.toUpperCase();
  return MILITARY_KEYWORDS.some((kw) => upper.includes(kw));
}

export function propagateSatellite(
  line1: string,
  line2: string,
  date: Date = new Date()
): { lat: number; lon: number; altKm: number; velocityKmS: number } | null {
  try {
    const satrec = satellite.twoline2satrec(line1, line2);
    const positionAndVelocity = satellite.propagate(satrec, date);

    const positionEci = positionAndVelocity.position;
    const velocityEci = positionAndVelocity.velocity;

    if (!positionEci || typeof positionEci === "boolean" || !velocityEci || typeof velocityEci === "boolean") {
      return null;
    }

    const gmst = satellite.gstime(date);
    const positionGd = satellite.eciToGeodetic(positionEci, gmst);

    const lat = satellite.radiansToDegrees(positionGd.latitude);
    let lon = satellite.radiansToDegrees(positionGd.longitude);
    // Normalize longitude between -180 and 180
    while (lon > 180) lon -= 360;
    while (lon < -180) lon += 360;

    const altKm = positionGd.height;
    const velocityKmS = Math.sqrt(
      velocityEci.x * velocityEci.x +
      velocityEci.y * velocityEci.y +
      velocityEci.z * velocityEci.z
    );

    return { lat, lon, altKm, velocityKmS };
  } catch {
    return null;
  }
}

export class SatellitesIngestor extends BaseIngestor {
  readonly name = "CelesTrak Orbital Ingestor";
  readonly domain = "satellite" as const;
  readonly pollIntervalMs = 60 * 60 * 1000; // 1 hour

  async fetchData(): Promise<NormalizedObservation[]> {
    const observations: NormalizedObservation[] = [];
    const now = new Date();

    for (const groupConfig of CELESTRAK_GROUPS) {
      try {
        const url = `https://celestrak.org/NORAD/elements/gp.php?GROUP=${groupConfig.group}&FORMAT=tle`;
        const res = await safeFetch(url, { timeoutMs: 20000 });
        if (!res.ok) continue;

        const text = await res.text();
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

        for (let i = 0; i + 2 < lines.length; i += 3) {
          const name = lines[i];
          const line1 = lines[i + 1];
          const line2 = lines[i + 2];

          if (!line1.startsWith("1 ") || !line2.startsWith("2 ")) continue;

          const noradId = line1.slice(2, 7).trim();
          const isMil = groupConfig.category === "military" || isMilitarySatellite(name);
          const pos = propagateSatellite(line1, line2, now);

          observations.push({
            id: `sat-${noradId}`,
            domain: "satellite",
            source: "celestrak",
            entityId: noradId,
            lat: pos?.lat,
            lon: pos?.lon,
            alt: pos?.altKm ? pos.altKm * 1000 : undefined,
            timestamp: now.getTime(),
            data: {
              name,
              noradId,
              line1,
              line2,
              category: isMil ? "military" : groupConfig.category,
              isMilitary: isMil,
              velocityKmS: pos?.velocityKmS,
              altKm: pos?.altKm,
            },
          });
        }
      } catch (err) {
        console.warn(`[SatellitesIngestor] Failed to fetch group ${groupConfig.group}:`, err);
      }
    }

    return observations;
  }
}
