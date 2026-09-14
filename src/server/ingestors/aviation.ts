import { BaseIngestor, NormalizedObservation } from "./base";
import { safeFetch } from "@/server/security/ssrfGuard";
import { getEnv } from "@/config/env";

const ADSB_FI_BASE = "https://opendata.adsb.fi/api/v2";

// Priority strategic corridors to poll
const PRIORITY_CORRIDORS = [
  { name: "Middle East / Persian Gulf", lat: 26.0, lon: 52.0 },
  { name: "Eastern Europe / Baltics", lat: 53.0, lon: 24.0 },
  { name: "Taiwan Strait / East Asia", lat: 24.0, lon: 120.0 },
  { name: "Central Europe", lat: 50.0, lon: 14.0 },
  { name: "US Northeast", lat: 40.0, lon: -75.0 },
];

const MILITARY_AIRCRAFT_TYPES = new Set([
  "C17", "C5M", "C130", "C30J", "KC10", "KC46", "KC35", "E3CF", "E3TF", "E8A",
  "B1B", "B2", "B52", "F16", "F15", "F18", "F22", "F35", "A10", "F117",
  "RC135", "E6B", "P8A", "P3", "MQ9", "RQ4", "U2", "EP3", "RC12",
  "V22", "CH47", "UH60", "AH64", "AH1Z", "MV22", "EUFI", "RFAL", "TORD", "TYP", "GR4"
]);

const EMERGENCY_SQUAWKS = new Set(["7500", "7600", "7700"]);

export class AviationIngestor extends BaseIngestor {
  readonly name = "Aviation Surveillance (OpenSky & ADS-B)";
  readonly domain = "aviation" as const;
  readonly pollIntervalMs = 30 * 1000; // 30 seconds

  async fetchData(): Promise<NormalizedObservation[]> {
    const observations: NormalizedObservation[] = [];
    const env = getEnv();

    // 1. Try OpenSky API if username/password are provided
    if (env.OPENSKY_USERNAME && env.OPENSKY_PASSWORD) {
      try {
        const auth = Buffer.from(`${env.OPENSKY_USERNAME}:${env.OPENSKY_PASSWORD}`).toString("base64");
        const res = await safeFetch("https://opensky-network.org/api/states/all", {
          headers: { Authorization: `Basic ${auth}` },
          timeoutMs: 15000,
        });

        if (res.ok) {
          const json = await res.json();
          const states = Array.isArray(json.states) ? json.states : [];

          for (const s of states.slice(0, 500)) {
            const [
              icao24, callsignRaw, originCountry, , , lon, lat, baroAlt,
              onGround, velocity, trueTrack, verticalRate, , , squawk
            ] = s;

            if (lon === null || lat === null) continue;

            const callsign = (callsignRaw || "").trim();
            const isEmergency = squawk && EMERGENCY_SQUAWKS.has(String(squawk));

            observations.push({
              id: `flight-${icao24}`,
              domain: "aviation",
              source: "opensky",
              entityId: icao24,
              lat,
              lon,
              alt: baroAlt || 0,
              timestamp: Date.now(),
              data: {
                icao24,
                callsign: callsign || icao24.toUpperCase(),
                country: originCountry,
                speedKnots: velocity ? velocity * 1.94384 : 0,
                heading: trueTrack || 0,
                verticalRate: verticalRate || 0,
                altitudeMeters: baroAlt || 0,
                onGround: !!onGround,
                squawk: squawk ? String(squawk) : undefined,
                isEmergency,
                category: "commercial",
              },
            });
          }

          if (observations.length > 0) return observations;
        }
      } catch (err) {
        console.warn("[AviationIngestor] OpenSky fetch failed, falling back to adsb.fi:", err);
      }
    }

    // 2. Query regional strategic corridors from adsb.fi
    for (const corridor of PRIORITY_CORRIDORS) {
      try {
        const url = `${ADSB_FI_BASE}/lat/${corridor.lat}/lon/${corridor.lon}/dist/250`;
        const res = await safeFetch(url, { timeoutMs: 10000 });
        if (!res.ok) continue;

        const json = await res.json();
        const aircraftList = Array.isArray(json.ac) ? json.ac : [];

        for (const ac of aircraftList) {
          if (!ac.lat || !ac.lon) continue;

          const icao = (ac.hex || "").toLowerCase();
          const typeCode = (ac.t || "").toUpperCase();
          const isMilitary = ac.military === 1 || MILITARY_AIRCRAFT_TYPES.has(typeCode);
          const squawk = ac.squawk ? String(ac.squawk) : undefined;
          const isEmergency = squawk ? EMERGENCY_SQUAWKS.has(squawk) : false;

          observations.push({
            id: `flight-${icao}`,
            domain: "aviation",
            source: "adsb.fi",
            entityId: icao,
            lat: ac.lat,
            lon: ac.lon,
            alt: (ac.alt_baro || 0) * 0.3048, // Convert feet to meters
            timestamp: Date.now(),
            data: {
              icao24: icao,
              callsign: (ac.flight || ac.r || icao).trim(),
              typeCode,
              registration: ac.r,
              speedKnots: ac.gs || 0,
              heading: ac.track || 0,
              verticalRate: ac.baro_rate || 0,
              squawk,
              isMilitary,
              isEmergency,
              corridor: corridor.name,
              category: isMilitary ? "military" : "commercial",
            },
          });
        }
      } catch (err) {
        // Continue to next corridor
      }
    }

    return observations;
  }
}
