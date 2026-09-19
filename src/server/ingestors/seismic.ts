import { BaseIngestor, NormalizedObservation } from "./base";
import { safeFetch } from "@/server/security/ssrfGuard";

const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";

export class SeismicIngestor extends BaseIngestor {
  readonly name = "USGS Seismic Feed";
  readonly domain = "seismic" as const;
  readonly pollIntervalMs = 5 * 60 * 1000; // 5 minutes

  async fetchData(): Promise<NormalizedObservation[]> {
    const res = await safeFetch(USGS_URL, { timeoutMs: 10000 });
    if (!res.ok) {
      throw new Error(`USGS HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const features = Array.isArray(data.features) ? data.features : [];

    return features.map((feat: {id: string; geometry?: {coordinates: number[]}; properties?: {mag?: number; place?: string; time?: number; tsunami?: number; url?: string; sig?: number}}): NormalizedObservation => {
      const [lon, lat, depth] = feat.geometry?.coordinates || [0, 0, 0];
      const mag = feat.properties?.mag ?? 0;
      const place = feat.properties?.place ?? "Unknown location";
      const eventTime = feat.properties?.time ?? Date.now();

      return {
        id: `usgs-${feat.id}`,
        domain: "seismic",
        source: "usgs",
        entityId: feat.id,
        lat,
        lon,
        alt: -depth * 1000, // Depth in meters below surface
        timestamp: eventTime,
        data: {
          magnitude: mag,
          place,
          depthKm: depth,
          tsunami: feat.properties?.tsunami ?? 0,
          url: feat.properties?.url,
          significance: feat.properties?.sig ?? 0,
        },
      };
    });
  }
}
