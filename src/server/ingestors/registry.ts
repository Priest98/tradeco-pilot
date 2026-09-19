import { anomalyEngine } from "../intelligence/anomalyEngine";
import { BaseIngestor, IngestorHealth } from "./base";
import { SeismicIngestor } from "./seismic";
import { ThermalIngestor } from "./thermal";
import { GpsJammingIngestor } from "./gpsJamming";
import { SatellitesIngestor } from "./satellites";
import { CyberThreatIngestor } from "./cyber";
import { GeopoliticalEventsIngestor } from "./gdelt";
import { MaritimeIngestor } from "./maritime";
import { AviationIngestor } from "./aviation";
import { MarketsIngestor } from "./markets";

class IngestorRegistry {
  private ingestors: Map<string, BaseIngestor> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  constructor() {
    this.register(new SeismicIngestor());
    this.register(new ThermalIngestor());
    this.register(new GpsJammingIngestor());
    this.register(new SatellitesIngestor());
    this.register(new CyberThreatIngestor());
    this.register(new GeopoliticalEventsIngestor());
    this.register(new MaritimeIngestor());
    this.register(new AviationIngestor());
    this.register(new MarketsIngestor());
  }

  register(ingestor: BaseIngestor): void {
    this.ingestors.set(ingestor.name, ingestor);
  }

  get(name: string): BaseIngestor | undefined {
    return this.ingestors.get(name);
  }

  getAllHealth(): IngestorHealth[] {
    return Array.from(this.ingestors.values()).map((ing) => ing.getHealth());
  }

  async runAll(): Promise<void> {
    const promises = Array.from(this.ingestors.values()).map((ing) => ing.poll().then(observations=>{anomalyEngine.evaluateBatch(observations);}));
    await Promise.allSettled(promises);
  }

  startSchedulers(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Run initial ingestion pass
    this.runAll().catch((err) => console.error("[IngestorRegistry] Initial run error:", err));

    // Schedule intervals
    for (const [name, ingestor] of this.ingestors.entries()) {
      const timer = setInterval(() => {
        ingestor.poll().then(observations=>{anomalyEngine.evaluateBatch(observations);}).catch((err) => {
          console.error(`[IngestorRegistry] Interval poll error for ${name}:`, err);
        });
      }, ingestor.pollIntervalMs);

      this.timers.set(name, timer);
    }
  }

  stopSchedulers(): void {
    for (const timer of this.timers.values()) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.isInitialized = false;
  }
}

// Global singleton instance
const globalForRegistry = globalThis as unknown as {
  registryInstance?: IngestorRegistry;
};

export const ingestorRegistry = globalForRegistry.registryInstance ?? new IngestorRegistry();
if (process.env.NODE_ENV !== "production") {
  globalForRegistry.registryInstance = ingestorRegistry;
}
