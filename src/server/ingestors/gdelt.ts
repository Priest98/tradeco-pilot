import { BaseIngestor, NormalizedObservation } from "./base";
import { safeFetch } from "@/server/security/ssrfGuard";

const GDELT_GEOJSON_URL = "https://api.gdeltproject.org/api/v2/geo/geo?query=military%20OR%20conflict%20OR%20sanctions%20OR%20protest&mode=pointdata&format=geojson";
const GDACS_RSS_URL = "https://www.gdacs.org/xml/rss.xml";

function sanitizeText(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]*>/g, "") // Strip any HTML tags completely (Fixing Finding #7 XSS)
    .trim();
}

export class GeopoliticalEventsIngestor extends BaseIngestor {
  readonly name = "GDELT 2.0 & GDACS Geopolitical Feed";
  readonly domain = "news" as const;
  readonly pollIntervalMs = 15 * 60 * 1000; // 15 minutes

  async fetchData(): Promise<NormalizedObservation[]> {
    const observations: NormalizedObservation[] = [];

    // 1. GDELT 2.0 Point GeoJSON
    try {
      const res = await safeFetch(GDELT_GEOJSON_URL, { timeoutMs: 15000 });
      if (res.ok) {
        const json = await res.json();
        const features = Array.isArray(json.features) ? json.features : [];

        for (const feat of features.slice(0, 50)) {
          const coords = feat.geometry?.coordinates;
          if (!coords || coords.length < 2) continue;

          const [lon, lat] = coords;
          const props = feat.properties || {};

          observations.push({
            id: `gdelt-${feat.id || Math.random().toString(36).substring(2, 9)}`,
            domain: "news",
            source: "gdelt_2.0",
            lat,
            lon,
            timestamp: Date.now(),
            data: {
              name: sanitizeText(props.name || "Geopolitical Event"),
              location: sanitizeText(props.location || ""),
              count: props.count || 1,
              shareUrl: props.shareurl || props.url,
            },
          });
        }
      }
    } catch (err) {
      console.warn("[GeopoliticalEventsIngestor] GDELT fetch failed:", err);
    }

    // 2. GDACS Real-time Disaster / Conflict Alert RSS
    try {
      const res = await safeFetch(GDACS_RSS_URL, { timeoutMs: 15000 });
      if (res.ok) {
        const xml = await res.text();
        const rawItems = xml.split(/<item>/i).slice(1);

        for (const rawItem of rawItems.slice(0, 30)) {
          const item = rawItem.split(/<\/item>/i)[0];
          const titleMatch = item.match(/<title>(.*?)<\/title>/i) || item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i);
          const linkMatch = item.match(/<link>(.*?)<\/link>/i);
          const descMatch = item.match(/<description>(.*?)<\/description>/i) || item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i);
          const latMatch = item.match(/<geo:lat>(.*?)<\/geo:lat>/i);
          const lngMatch = item.match(/<geo:long>(.*?)<\/geo:long>/i);
          const alertMatch = item.match(/<gdacs:alertlevel>(.*?)<\/gdacs:alertlevel>/i);

          if (!titleMatch || !latMatch || !lngMatch) continue;

          const lat = parseFloat(latMatch[1]);
          const lon = parseFloat(lngMatch[1]);
          if (isNaN(lat) || isNaN(lon)) continue;

          const title = sanitizeText(titleMatch[1]);
          const link = (linkMatch ? linkMatch[1] : "").trim();
          const desc = sanitizeText(descMatch ? descMatch[1] : "");
          const alertLevel = alertMatch ? alertMatch[1].toUpperCase() : "GREEN";

          observations.push({
            id: `gdacs-${Math.abs(Math.floor(lat * 10000 + lon * 10000))}`,
            domain: "news",
            source: "gdacs",
            lat,
            lon,
            timestamp: Date.now(),
            data: {
              title,
              link,
              description: desc,
              alertLevel,
            },
          });
        }
      }
    } catch (err) {
      console.warn("[GeopoliticalEventsIngestor] GDACS fetch failed:", err);
    }

    return observations;
  }
}
