import { BaseIngestor, NormalizedObservation } from "./base";
import { safeFetch } from "@/server/security/ssrfGuard";
import { getEnv } from "@/config/env";
import { parse } from "csv-parse/sync";

const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events?category=wildfires,volcanoes,severeStorms&status=open";

export class ThermalIngestor extends BaseIngestor {
  readonly name = "NASA Thermal & Natural Hazards";
  readonly domain = "thermal" as const;
  readonly pollIntervalMs = 15 * 60 * 1000; // 15 minutes

  async fetchData(): Promise<NormalizedObservation[]> {
    const env = getEnv();

    // If FIRMS Map Key is available, fetch high-resolution VIIRS active fire hotspots
    if (env.FIRMS_MAP_KEY) {
      try {
        const firmsUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${env.FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/world/1`;
        const res = await safeFetch(firmsUrl, { timeoutMs: 25000 });
        if (res.ok) {
          const csvText = await res.text();
          const records = parse(csvText, {
            columns: true,
            skip_empty_lines: true,
          });

          return records.slice(0, 1000).map((r: any, idx: number): NormalizedObservation => {
            const lat = parseFloat(r.latitude);
            const lon = parseFloat(r.longitude);
            const brightness = parseFloat(r.bright_ti4 || r.brightness || "0");
            const frp = parseFloat(r.frp || "0"); // Fire Radiative Power (MW)

            return {
              id: `firms-${r.latitude}-${r.longitude}-${idx}`,
              domain: "thermal",
              source: "nasa_firms",
              lat,
              lon,
              timestamp: Date.now(),
              data: {
                brightness,
                frp,
                confidence: r.confidence || "nominal",
                satellite: r.satellite || "SNPP",
                instrument: "VIIRS",
                acqDate: r.acq_date,
                acqTime: r.acq_time,
              },
            };
          });
        }
      } catch (err) {
        console.warn("[ThermalIngestor] FIRMS direct fetch failed, falling back to NASA EONET:", err);
      }
    }

    // Fallback to NASA EONET
    const res = await safeFetch(EONET_URL, { timeoutMs: 15000 });
    if (!res.ok) {
      throw new Error(`NASA EONET HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const events = Array.isArray(json.events) ? json.events : [];

    const observations: NormalizedObservation[] = [];

    for (const ev of events) {
      const geometry = ev.geometry?.[ev.geometry.length - 1];
      if (!geometry || !geometry.coordinates) continue;

      const [lon, lat] = geometry.coordinates;
      observations.push({
        id: `eonet-${ev.id}`,
        domain: "thermal",
        source: "nasa_eonet",
        entityId: ev.id,
        lat,
        lon,
        timestamp: new Date(geometry.date || Date.now()).getTime(),
        data: {
          title: ev.title,
          category: ev.categories?.[0]?.title || "Natural Hazard",
          magnitudeValue: geometry.magnitudeValue,
          magnitudeUnit: geometry.magnitudeUnit,
          sources: ev.sources?.map((s: any) => s.url) || [],
        },
      });
    }

    return observations;
  }
}
