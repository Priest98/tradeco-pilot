import { BaseIngestor, NormalizedObservation } from "./base";
import { getEnv } from "@/config/env";
import WebSocket from "ws";

export interface MaritimePort {
  name: string;
  country: string;
  lat: number;
  lon: number;
  type: "container" | "energy" | "naval";
  volume?: string;
  fleet?: string;
  rank?: number;
}

export interface MaritimeChokepoint {
  name: string;
  lat: number;
  lon: number;
  traffic: string;
  risk: "CRITICAL" | "HIGH" | "ELEVATED" | "MODERATE" | "LOW";
}

export const GLOBAL_PORTS: MaritimePort[] = [
  { name: "Shanghai", country: "CN", lat: 31.23, lon: 121.47, type: "container", volume: "47.3M TEU", rank: 1 },
  { name: "Singapore", country: "SG", lat: 1.26, lon: 103.84, type: "container", volume: "37.2M TEU", rank: 2 },
  { name: "Ningbo-Zhoushan", country: "CN", lat: 29.87, lon: 121.55, type: "container", volume: "33.3M TEU", rank: 3 },
  { name: "Shenzhen", country: "CN", lat: 22.54, lon: 114.05, type: "container", volume: "30.0M TEU", rank: 4 },
  { name: "Guangzhou", country: "CN", lat: 23.08, lon: 113.32, type: "container", volume: "24.2M TEU", rank: 5 },
  { name: "Busan", country: "KR", lat: 35.10, lon: 129.04, type: "container", volume: "22.7M TEU", rank: 6 },
  { name: "Qingdao", country: "CN", lat: 36.07, lon: 120.38, type: "container", volume: "22.0M TEU", rank: 7 },
  { name: "Rotterdam", country: "NL", lat: 51.90, lon: 4.50, type: "container", volume: "14.5M TEU", rank: 8 },
  { name: "Dubai (Jebel Ali)", country: "AE", lat: 25.01, lon: 55.06, type: "container", volume: "14.0M TEU", rank: 9 },
  { name: "Port Klang", country: "MY", lat: 2.99, lon: 101.39, type: "container", volume: "13.2M TEU", rank: 10 },
  { name: "Antwerp", country: "BE", lat: 51.30, lon: 4.40, type: "container", volume: "12.0M TEU", rank: 11 },
  { name: "Los Angeles", country: "US", lat: 33.74, lon: -118.27, type: "container", volume: "9.9M TEU", rank: 13 },
  { name: "Long Beach", country: "US", lat: 33.75, lon: -118.19, type: "container", volume: "8.0M TEU", rank: 15 },
  // Energy ports
  { name: "Ras Tanura", country: "SA", lat: 26.64, lon: 50.16, type: "energy", volume: "6.5M bpd" },
  { name: "Fujairah", country: "AE", lat: 25.14, lon: 56.35, type: "energy", volume: "3.5M bpd" },
  { name: "Novorossiysk", country: "RU", lat: 44.72, lon: 37.77, type: "energy", volume: "2.8M bpd" },
  { name: "Kharg Island", country: "IR", lat: 29.24, lon: 50.33, type: "energy", volume: "2.0M bpd" },
  { name: "Primorsk", country: "RU", lat: 60.35, lon: 28.70, type: "energy", volume: "1.6M bpd" },
  // Naval bases
  { name: "Norfolk Naval Station", country: "US", lat: 36.95, lon: -76.33, type: "naval", fleet: "US Atlantic Fleet" },
  { name: "San Diego Naval Base", country: "US", lat: 32.69, lon: -117.15, type: "naval", fleet: "US Pacific Fleet" },
  { name: "Pearl Harbor", country: "US", lat: 21.35, lon: -157.97, type: "naval", fleet: "US Pacific Fleet" },
  { name: "Yokosuka", country: "JP", lat: 35.28, lon: 139.67, type: "naval", fleet: "US 7th Fleet" },
  { name: "Severomorsk", country: "RU", lat: 69.07, lon: 33.42, type: "naval", fleet: "Russian Northern Fleet" },
  { name: "Tartus", country: "SY", lat: 34.89, lon: 35.89, type: "naval", fleet: "Russian Med Squadron" },
  { name: "Zhanjiang", country: "CN", lat: 21.20, lon: 110.39, type: "naval", fleet: "PLAN South Sea Fleet" },
];

export const CHOKEPOINTS: MaritimeChokepoint[] = [
  { name: "Strait of Hormuz", lat: 26.57, lon: 56.25, traffic: "21M bpd oil", risk: "HIGH" },
  { name: "Strait of Malacca", lat: 2.50, lon: 101.50, traffic: "16M bpd oil", risk: "MODERATE" },
  { name: "Suez Canal", lat: 30.43, lon: 32.34, traffic: "12% world trade", risk: "ELEVATED" },
  { name: "Bab el-Mandeb", lat: 12.58, lon: 43.33, traffic: "6.2M bpd oil", risk: "CRITICAL" },
  { name: "Panama Canal", lat: 9.08, lon: -79.68, traffic: "5% world trade", risk: "LOW" },
  { name: "Turkish Straits", lat: 41.12, lon: 29.07, traffic: "3M bpd oil", risk: "MODERATE" },
  { name: "Danish Straits", lat: 55.70, lon: 12.60, traffic: "3.2M bpd oil", risk: "LOW" },
  { name: "Cape of Good Hope", lat: -34.36, lon: 18.47, traffic: "Alt route Suez", risk: "LOW" },
  { name: "Taiwan Strait", lat: 24.00, lon: 119.00, traffic: "88% large container ships", risk: "ELEVATED" },
  { name: "Lombok Strait", lat: -8.47, lon: 115.72, traffic: "Alt Malacca", risk: "LOW" },
];

const MILITARY_SHIP_PATTERNS = [
  /\bmilitary\b/i, /\bnavy\b/i, /\bnaval\b/i, /\bwarship\b/i, /\bcoast\s*guard\b/i,
  /\bpatrol\b/i, /\bfrigate\b/i, /\bdestroyer\b/i, /\bcorvette\b/i, /\bsubmarine\b/i,
  /\bcarrier\b/i, /^uss\s/i, /^usns\s/i, /^hms\s/i, /^fs\s/i, /^its\s/i, /^tcg\s/i,
  /^ins\s/i, /^cgc\s/i,
];

// Global vessel cache for live WebSocket updates
const vesselCache = new Map<number, NormalizedObservation>();
let wsClient: WebSocket | null = null;
let wsConnecting = false;

export class MaritimeIngestor extends BaseIngestor {
  readonly name = "Maritime AIS & Strategic Chokepoints";
  readonly domain = "maritime" as const;
  readonly pollIntervalMs = 60 * 1000; // 1 minute

  constructor() {
    super();
    this.initWebSocketClient();
  }

  private initWebSocketClient(): void {
    const env = getEnv();
    if (!env.AISSTREAM_API_KEY || wsClient || wsConnecting) return;

    wsConnecting = true;
    try {
      const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");

      ws.on("open", () => {
        console.log("[MaritimeIngestor] Connected to AISStream WebSocket");
        wsConnecting = false;
        // Subscribe to global strategic bounding boxes (Hormuz, Red Sea, Malacca, etc.)
        const subMessage = {
          APIKey: env.AISSTREAM_API_KEY,
          BoundingBoxes: [
            [[10.0, 40.0], [32.0, 60.0]], // Red Sea, Gulf of Aden, Arabian Sea, Persian Gulf
            [[0.0, 95.0], [25.0, 125.0]], // Malacca, South China Sea, Taiwan Strait
            [[50.0, -10.0], [60.0, 15.0]], // North Sea, English Channel
          ],
          FiltersShipMMSI: [],
          FilterMessageTypes: ["PositionReport", "ShipStaticData", "StandardClassBPositionReport"],
        };
        ws.send(JSON.stringify(subMessage));
      });

      ws.on("message", (raw: string) => {
        try {
          const msg = JSON.parse(raw.toString());
          this.handleAisMessage(msg);
        } catch {}
      });

      ws.on("error", (err) => {
        console.warn("[MaritimeIngestor] AISStream error:", err.message);
      });

      ws.on("close", () => {
        console.log("[MaritimeIngestor] AISStream disconnected. Reconnecting in 10s...");
        wsClient = null;
        wsConnecting = false;
        setTimeout(() => this.initWebSocketClient(), 10000);
      });

      wsClient = ws;
    } catch (e) {
      wsConnecting = false;
    }
  }

  private handleAisMessage(msg: any): void {
    const meta = msg.MetaData;
    if (!meta || !meta.MMSI) return;

    const mmsi = meta.MMSI;
    const now = Date.now();
    const shipName = (meta.ShipName || "").trim();
    const isMilitary = MILITARY_SHIP_PATTERNS.some((re) => re.test(shipName));

    let lat = meta.latitude;
    let lon = meta.longitude;
    let sog = 0;
    let cog = 0;

    if (msg.MessageType === "PositionReport" || msg.MessageType === "StandardClassBPositionReport") {
      const pos = msg.Message?.PositionReport || msg.Message?.StandardClassBPositionReport;
      if (pos) {
        lat = pos.Latitude ?? lat;
        lon = pos.Longitude ?? lon;
        sog = pos.Sog ?? 0;
        cog = pos.Cog ?? 0;
      }
    }

    if (lat === undefined || lon === undefined) return;

    const obs: NormalizedObservation = {
      id: `vessel-${mmsi}`,
      domain: "maritime",
      source: "aisstream",
      entityId: String(mmsi),
      lat,
      lon,
      timestamp: now,
      data: {
        mmsi,
        name: shipName || `MMSI ${mmsi}`,
        country: meta.flag || "Unknown",
        speedKnots: sog,
        heading: cog,
        isMilitary,
        type: isMilitary ? "military" : "commercial",
      },
    };

    vesselCache.set(mmsi, obs);

    // Keep cache bounded to most recent 2,000 vessels
    if (vesselCache.size > 2000) {
      const oldestKey = vesselCache.keys().next().value;
      if (oldestKey !== undefined) vesselCache.delete(oldestKey);
    }
  }

  async fetchData(): Promise<NormalizedObservation[]> {
    const liveVessels = Array.from(vesselCache.values());

    // Also return chokepoints and top ports as persistent maritime entities
    const infrastructure: NormalizedObservation[] = [
      ...CHOKEPOINTS.map((c): NormalizedObservation => ({
        id: `chokepoint-${c.name.toLowerCase().replace(/\s+/g, "-")}`,
        domain: "maritime",
        source: "static_intelligence",
        lat: c.lat,
        lon: c.lon,
        timestamp: Date.now(),
        data: {
          name: c.name,
          category: "chokepoint",
          traffic: c.traffic,
          risk: c.risk,
        },
      })),
      ...GLOBAL_PORTS.map((p): NormalizedObservation => ({
        id: `port-${p.name.toLowerCase().replace(/[\s\(\)]+/g, "-")}`,
        domain: "maritime",
        source: "static_intelligence",
        lat: p.lat,
        lon: p.lon,
        timestamp: Date.now(),
        data: {
          name: p.name,
          country: p.country,
          category: p.type,
          volume: p.volume,
          fleet: p.fleet,
        },
      })),
    ];

    return [...liveVessels, ...infrastructure];
  }
}
