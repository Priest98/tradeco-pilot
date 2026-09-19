import type { DatabaseSync } from "node:sqlite";
import { getDatabase } from "../db/client.ts";
import { isPointInPolygon, Point2D } from "../../lib/geoUtils.ts";
import { NormalizedObservation } from "../ingestors/base.ts";

export interface TripwireZone {
  id: string;
  name: string;
  coordinates: Point2D[];
  filterDomain?: string;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  createdAt: number;
}

export interface TripwireAlert {
  id: string;
  tripwireId: string;
  tripwireName: string;
  entityId: string;
  domain: string;
  callsignOrName: string;
  eventType: "ENTRY" | "EXIT";
  lat: number;
  lon: number;
  timestamp: number;
  details: Record<string, unknown>;
}

// Strategic pre-seeded Areas of Interest (AOIs)
export const STRATEGIC_AOIS: Omit<TripwireZone, "createdAt">[] = [
  {
    id: "aoi-hormuz",
    name: "Strait of Hormuz Chokepoint",
    filterDomain: "all",
    alertOnEntry: true,
    alertOnExit: true,
    coordinates: [
      { lat: 26.1, lon: 55.6 },
      { lat: 26.8, lon: 55.6 },
      { lat: 26.9, lon: 56.8 },
      { lat: 26.0, lon: 56.8 },
    ],
  },
  {
    id: "aoi-bab-el-mandeb",
    name: "Bab el-Mandeb / Southern Red Sea",
    filterDomain: "all",
    alertOnEntry: true,
    alertOnExit: true,
    coordinates: [
      { lat: 12.0, lon: 43.0 },
      { lat: 13.5, lon: 42.5 },
      { lat: 13.8, lon: 43.8 },
      { lat: 12.3, lon: 44.0 },
    ],
  },
  {
    id: "aoi-taiwan-strait",
    name: "Taiwan Strait Median Line",
    filterDomain: "aviation",
    alertOnEntry: true,
    alertOnExit: false,
    coordinates: [
      { lat: 23.0, lon: 118.5 },
      { lat: 25.5, lon: 120.0 },
      { lat: 25.8, lon: 121.2 },
      { lat: 23.2, lon: 119.8 },
    ],
  },
  {
    id: "aoi-baltic-suwalki",
    name: "Suwalki Gap Corridor",
    filterDomain: "all",
    alertOnEntry: true,
    alertOnExit: false,
    coordinates: [
      { lat: 53.8, lon: 22.8 },
      { lat: 54.6, lon: 22.8 },
      { lat: 54.6, lon: 24.2 },
      { lat: 53.8, lon: 24.2 },
    ],
  },
];

export class TripwireEngine {
  private activeZones: Map<string, TripwireZone> = new Map();
  private entityZoneState: Map<string, Set<string>> = new Map(); // entityId -> Set<tripwireId>

  private db: DatabaseSync | null = null;

  constructor(customDb?: DatabaseSync) {
    if (customDb) {
      this.db = customDb;
    }
    this.syncFromDatabase();
  }

  /**
   * Loads tripwires from SQLite or initializes strategic defaults.
   */
  syncFromDatabase(): void {
    try {
      const db = this.db || getDatabase();
      const rows = db.prepare("SELECT * FROM aoi_tripwires").all() as Array<{id:string;name:string;geometry_geojson:string;filter_domain:string;alert_on_entry:number;alert_on_exit:number;created_at:number}>;

      if (rows.length === 0) {
        // Seed strategic default zones
        const insertStmt = db.prepare(`
          INSERT INTO aoi_tripwires (id, name, geometry_geojson, filter_domain, alert_on_entry, alert_on_exit, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        db.exec("BEGIN TRANSACTION;");
        const now = Date.now();
        for (const zone of STRATEGIC_AOIS) {
          insertStmt.run(
            zone.id,
            zone.name,
            JSON.stringify(zone.coordinates),
            zone.filterDomain || "all",
            zone.alertOnEntry ? 1 : 0,
            zone.alertOnExit ? 1 : 0,
            now
          );
          this.activeZones.set(zone.id, { ...zone, createdAt: now });
        }
        db.exec("COMMIT;");
      } else {
        this.activeZones.clear();
        for (const row of rows) {
          let coords: Point2D[] = [];
          try {
            coords = JSON.parse(row.geometry_geojson || "[]");
          } catch {}

          this.activeZones.set(row.id, {
            id: row.id,
            name: row.name,
            coordinates: coords,
            filterDomain: row.filter_domain,
            alertOnEntry: !!row.alert_on_entry,
            alertOnExit: !!row.alert_on_exit,
            createdAt: row.created_at,
          });
        }
      }
    } catch (err) {
      console.warn("[TripwireEngine] Database sync warning:", err);
    }
  }

  getTripwires(): TripwireZone[] {
    return Array.from(this.activeZones.values());
  }

  createTripwire(name: string, coordinates: Point2D[], filterDomain: string = "all"): TripwireZone {
    const id = `aoi-custom-${Date.now()}`;
    const now = Date.now();
    const zone: TripwireZone = {
      id,
      name,
      coordinates,
      filterDomain,
      alertOnEntry: true,
      alertOnExit: true,
      createdAt: now,
    };

    try {
      const db = getDatabase();
      db.prepare(`
        INSERT INTO aoi_tripwires (id, name, geometry_geojson, filter_domain, alert_on_entry, alert_on_exit, created_at)
        VALUES (?, ?, ?, ?, 1, 1, ?)
      `).run(id, name, JSON.stringify(coordinates), filterDomain, now);
      this.activeZones.set(id, zone);
    } catch (err) {
      console.error("[TripwireEngine] Failed to persist tripwire:", err);
    }

    return zone;
  }

  deleteTripwire(id: string): boolean {
    try {
      const db = getDatabase();
      db.prepare("DELETE FROM aoi_tripwires WHERE id = ?").run(id);
      return this.activeZones.delete(id);
    } catch {
      return false;
    }
  }

  /**
   * Evaluates an observation against all tripwires and detects boundary crossings.
   */
  evaluateObservation(obs: NormalizedObservation): TripwireAlert[] {
    if (obs.lat === undefined || obs.lon === undefined || !obs.entityId) return [];

    const alerts: TripwireAlert[] = [];
    const point: Point2D = { lat: obs.lat, lon: obs.lon };
    const entityId = obs.entityId;

    if (!this.entityZoneState.has(entityId)) {
      this.entityZoneState.set(entityId, new Set());
    }
    const currentZones = this.entityZoneState.get(entityId)!;

    for (const zone of this.activeZones.values()) {
      if (zone.filterDomain && zone.filterDomain !== "all" && zone.filterDomain !== obs.domain) {
        continue;
      }

      const isInside = isPointInPolygon(point, zone.coordinates);
      const wasInside = currentZones.has(zone.id);

      // Detection: ENTRY
      if (isInside && !wasInside) {
        currentZones.add(zone.id);
        if (zone.alertOnEntry) {
          alerts.push({
            id: `alert-entry-${zone.id}-${entityId}-${Date.now()}`,
            tripwireId: zone.id,
            tripwireName: zone.name,
            entityId,
            domain: obs.domain,
            callsignOrName: String(obs.data?.callsign || obs.data?.name || entityId),
            eventType: "ENTRY",
            lat: obs.lat,
            lon: obs.lon,
            timestamp: Date.now(),
            details: obs.data || {},
          });
        }
      }

      // Detection: EXIT
      if (!isInside && wasInside) {
        currentZones.delete(zone.id);
        if (zone.alertOnExit) {
          alerts.push({
            id: `alert-exit-${zone.id}-${entityId}-${Date.now()}`,
            tripwireId: zone.id,
            tripwireName: zone.name,
            entityId,
            domain: obs.domain,
            callsignOrName: String(obs.data?.callsign || obs.data?.name || entityId),
            eventType: "EXIT",
            lat: obs.lat,
            lon: obs.lon,
            timestamp: Date.now(),
            details: obs.data || {},
          });
        }
      }
    }

    return alerts;
  }
}

export const tripwireEngine = new TripwireEngine();
