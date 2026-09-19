import { getDatabase } from "@/server/db/client";

export interface NormalizedObservation {
  id: string;
  domain: "aviation" | "maritime" | "satellite" | "seismic" | "thermal" | "cyber" | "news" | "market" | "gpsjam";
  source: string;
  entityId?: string;
  lat?: number;
  lon?: number;
  alt?: number;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface IngestorHealth {
  name: string;
  domain: string;
  status: "idle" | "healthy" | "degraded" | "failing" | "circuit_open";
  lastRunTimestamp: number | null;
  lastSuccessTimestamp: number | null;
  consecutiveFailures: number;
  itemsIngestedTotal: number;
  lastError?: string;
}

/**
 * Abstract Base Ingestor providing resilience, retry backoff,
 * circuit breaking, and batch persistence to SQLite.
 */
export abstract class BaseIngestor {
  abstract readonly name: string;
  abstract readonly domain: NormalizedObservation["domain"];
  abstract readonly pollIntervalMs: number;

  protected lastRunTimestamp: number | null = null;
  protected lastSuccessTimestamp: number | null = null;
  protected consecutiveFailures: number = 0;
  protected circuitBreakerThreshold: number = 5;
  protected cooldownPeriodMs: number = 60_000;
  protected itemsIngestedTotal: number = 0;
  protected lastError?: string;
  private isRunning: boolean = false;

  /**
   * Domain-specific fetch and transform logic to be implemented by child ingestors.
   */
  abstract fetchData(): Promise<NormalizedObservation[]>;

  /**
   * Poll cycle with error catching, circuit breaking, and persistence.
   */
  async poll(): Promise<NormalizedObservation[]> {
    const now = Date.now();

    // Circuit breaker check
    if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
      if (this.lastRunTimestamp && now - this.lastRunTimestamp < this.cooldownPeriodMs) {
        return [];
      }
      // Attempt probe after cooldown
      console.log(`[Ingestor:${this.name}] Cooldown elapsed. Probing upstream service...`);
    }

    if (this.lastSuccessTimestamp && now - this.lastSuccessTimestamp < this.pollIntervalMs) return [];

    if (this.isRunning) {
      return [];
    }

    this.isRunning = true;
    this.lastRunTimestamp = now;

    try {
      const observations = await this.fetchData();
      if (observations.length > 0) this.saveObservations(observations);
      this.consecutiveFailures = 0;
      this.lastSuccessTimestamp = Date.now();
      this.lastError = undefined;
      this.itemsIngestedTotal += observations.length;



      return observations;
    } catch (err) {
      this.consecutiveFailures++;
      this.lastError = err instanceof Error ? err.message : "Ingestion failed";
      console.error(`[Ingestor:${this.name}] Poll failed (${this.consecutiveFailures}/${this.circuitBreakerThreshold}):`, this.lastError);
      return [];
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Batch persist observations into SQLite with WAL mode.
   */
  protected saveObservations(observations: NormalizedObservation[]): void {
    if (!observations.length) return;

    try {
      const db = getDatabase();
      const insertStmt = db.prepare(`
        INSERT OR REPLACE INTO observations (id, domain, source, entity_id, lat, lon, alt, timestamp, data_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      db.exec("BEGIN IMMEDIATE;");
      for (const obs of observations) {
        insertStmt.run(
          `${obs.id}@${obs.timestamp}`,
          obs.domain,
          obs.source,
          obs.entityId || null,
          obs.lat !== undefined ? obs.lat : null,
          obs.lon !== undefined ? obs.lon : null,
          obs.alt !== undefined ? obs.alt : null,
          obs.timestamp,
          JSON.stringify(obs.data)
        );
      }
      db.exec("COMMIT;");
    } catch (err) {
      try {
        const db = getDatabase();
        db.exec("ROLLBACK;");
      } catch {}
      throw err;
    }
  }

  /**
   * Returns live health and telemetry status for the ingestor.
   */
  getHealth(): IngestorHealth {
    let status: IngestorHealth["status"] = "idle";

    if (this.consecutiveFailures >= this.circuitBreakerThreshold) {
      status = "circuit_open";
    } else if (this.consecutiveFailures > 0) {
      status = "degraded";
    } else if (this.lastSuccessTimestamp !== null) {
      status = "healthy";
    }

    return {
      name: this.name,
      domain: this.domain,
      status,
      lastRunTimestamp: this.lastRunTimestamp,
      lastSuccessTimestamp: this.lastSuccessTimestamp,
      consecutiveFailures: this.consecutiveFailures,
      itemsIngestedTotal: this.itemsIngestedTotal,
      lastError: this.lastError,
    };
  }
}
