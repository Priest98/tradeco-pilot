import { BaseIngestor, NormalizedObservation } from "./base";
import { safeFetch } from "@/server/security/ssrfGuard";
import { parse as parseCsv } from "csv-parse/sync";
import * as h3 from "h3-js";

const GPS_JAMMING_SOURCE_URL = "https://gpsjam.org/data";

export interface GpsJammingHexRecord {
  hex: string;
  lat: number;
  lon: number;
  countGood: number;
  countBad: number;
  total: number;
  jammingRatio: number; // 0.0 to 1.0
  severity: "low" | "medium" | "high";
}

export class GpsJammingIngestor extends BaseIngestor {
  readonly name = "GPSJam.org Electronic Warfare Feed";
  readonly domain = "gpsjam" as const;
  readonly pollIntervalMs = 60 * 60 * 1000; // 1 hour

  private formatDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  async fetchData(): Promise<NormalizedObservation[]> {
    const now = new Date();
    let csvText: string | null = null;
    let dataDate = now;

    // Daily CSVs might be 1-3 days delayed on gpsjam.org
    for (let offset = 0; offset <= 3; offset++) {
      const probeDate = new Date(now);
      probeDate.setUTCDate(probeDate.getUTCDate() - offset);
      const dateStr = this.formatDate(probeDate);
      const url = `${GPS_JAMMING_SOURCE_URL}/${dateStr}-h3_4.csv`;

      try {
        const res = await safeFetch(url, { timeoutMs: 15000 });
        if (res.ok) {
          csvText = await res.text();
          dataDate = probeDate;
          break;
        }
      } catch {
        // Try preceding day
      }
    }

    if (!csvText) {
      throw new Error("Unable to locate recent GPS jamming CSV from gpsjam.org");
    }

    const records = parseCsv(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const observations: NormalizedObservation[] = [];

    for (const row of records) {
      const hex = row.hex;
      if (!hex) continue;

      const countGood = parseInt(row.count_good_aircraft, 10) || 0;
      const countBad = parseInt(row.count_bad_aircraft, 10) || 0;
      const total = countGood + countBad;
      if (total === 0) continue;

      const jammingRatio = countBad / total;

      // Filter out hexes with minimal aircraft traffic unless high severity
      if (total < 3 && jammingRatio < 0.5) continue;

      let lat = 0;
      let lon = 0;
      try {
        const [hLat, hLon] = h3.cellToLatLng(hex);
        lat = hLat;
        lon = hLon;
      } catch {
        continue;
      }

      let severity: GpsJammingHexRecord["severity"] = "low";
      if (jammingRatio >= 0.5) severity = "high";
      else if (jammingRatio >= 0.2) severity = "medium";

      observations.push({
        id: `jam-${hex}-${this.formatDate(dataDate)}`,
        domain: "gpsjam",
        source: "gpsjam.org",
        entityId: hex,
        lat,
        lon,
        timestamp: dataDate.getTime(),
        data: {
          hex,
          countGood,
          countBad,
          total,
          jammingRatio,
          severity,
          observationDate: this.formatDate(dataDate),
        },
      });
    }

    return observations;
  }
}
