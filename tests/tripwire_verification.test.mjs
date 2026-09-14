import { describe, it } from "node:test";
import assert from "node:assert";

// Self-contained ray-casting verification
function isPointInPolygon(point, polygon) {
  if (polygon.length < 3) return false;
  let inside = false;
  const x = point.lon;
  const y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon;
    const yi = polygon[i].lat;
    const xj = polygon[j].lon;
    const yj = polygon[j].lat;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

class TestTripwireTracker {
  constructor(zones) {
    this.zones = zones;
    this.state = new Map(); // entityId -> Set(zoneId)
  }

  evaluate(entityId, lat, lon) {
    if (!this.state.has(entityId)) {
      this.state.set(entityId, new Set());
    }
    const currentZones = this.state.get(entityId);
    const alerts = [];

    for (const zone of this.zones) {
      const isInside = isPointInPolygon({ lat, lon }, zone.coordinates);
      const wasInside = currentZones.has(zone.id);

      if (isInside && !wasInside) {
        currentZones.add(zone.id);
        alerts.push({ type: "ENTRY", zone: zone.name, entityId, lat, lon });
      } else if (!isInside && wasInside) {
        currentZones.delete(zone.id);
        alerts.push({ type: "EXIT", zone: zone.name, entityId, lat, lon });
      }
    }
    return alerts;
  }
}

describe("Geospatial Ray-Casting & Tripwire State Transition", () => {
  const hormuzBox = [
    { lat: 26.0, lon: 55.5 },
    { lat: 27.0, lon: 55.5 },
    { lat: 27.0, lon: 57.0 },
    { lat: 26.0, lon: 57.0 },
  ];

  it("accurately detects coordinates inside vs outside polygon", () => {
    // Inside Strait of Hormuz (26.55, 56.25)
    assert.strictEqual(isPointInPolygon({ lat: 26.55, lon: 56.25 }, hormuzBox), true);

    // Outside (North in Iran)
    assert.strictEqual(isPointInPolygon({ lat: 28.5, lon: 56.25 }, hormuzBox), false);

    // Outside (South in Oman)
    assert.strictEqual(isPointInPolygon({ lat: 24.5, lon: 56.25 }, hormuzBox), false);
  });

  it("accurately tracks transition states: OUTSIDE -> ENTRY -> INSIDE -> EXIT", () => {
    const tracker = new TestTripwireTracker([
      { id: "aoi-1", name: "Strait of Hormuz Chokepoint", coordinates: hormuzBox }
    ]);

    // Step 1: Aircraft approaches outside the box
    const step1 = tracker.evaluate("VIPER01", 25.5, 54.0);
    assert.strictEqual(step1.length, 0);

    // Step 2: Aircraft crosses polygon boundary -> triggers ENTRY
    const step2 = tracker.evaluate("VIPER01", 26.55, 56.25);
    assert.strictEqual(step2.length, 1);
    assert.strictEqual(step2[0].type, "ENTRY");
    assert.strictEqual(step2[0].zone, "Strait of Hormuz Chokepoint");

    // Step 3: Aircraft maneuvers inside the box -> NO duplicate entry
    const step3 = tracker.evaluate("VIPER01", 26.70, 56.50);
    assert.strictEqual(step3.length, 0);

    // Step 4: Aircraft exits the polygon -> triggers EXIT
    const step4 = tracker.evaluate("VIPER01", 25.20, 58.10);
    assert.strictEqual(step4.length, 1);
    assert.strictEqual(step4[0].type, "EXIT");
  });
});
