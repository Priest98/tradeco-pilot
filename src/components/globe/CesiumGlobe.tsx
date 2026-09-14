"use client";

import React, { useEffect, useRef, useState } from "react";
import { Layers, Eye, EyeOff, Radio, Plane, Anchor, Satellite, Zap, Compass, RefreshCw } from "lucide-react";

interface CesiumGlobeProps {
  onSelectEntity?: (entity: any) => void;
}

export const CesiumGlobe: React.FC<CesiumGlobeProps> = ({ onSelectEntity }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [cesiumReady, setCesiumReady] = useState(false);
  const [layers, setLayers] = useState({
    aviation: true,
    maritime: true,
    satellites: true,
    gpsjam: true,
    seismic: true,
    thermal: true,
  });

  const [replayHour, setReplayHour] = useState(0); // 0 = live, -1 to -72 hours
  const [entityCounts, setEntityCounts] = useState({
    flights: 0,
    vessels: 0,
    satellites: 0,
    jammingHexes: 0,
  });

  // Initialize Cesium Viewer dynamically in browser
  useEffect(() => {
    let viewer: any = null;
    let isMounted = true;

    async function initCesium() {
      if (typeof window === "undefined" || !containerRef.current) return;

      // Set Cesium base URL to locally served static assets (offline-capable)
      // @ts-expect-error window global
      window.CESIUM_BASE_URL = "/cesium";

      const Cesium = await import("cesium");

      // Set empty Ion token to prevent external credential warnings
      Cesium.Ion.defaultAccessToken = "";

      if (!isMounted || !containerRef.current) return;

      viewer = new Cesium.Viewer(containerRef.current, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        shouldAnimate: true,
      });

      // Dark tactical space styling
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#06090e");
      if (viewer.scene.skyAtmosphere) {
        viewer.scene.skyAtmosphere.show = true;
      }

      // Initial camera positioning: global overview
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(25.0, 30.0, 18000000.0),
        duration: 0,
      });

      viewerRef.current = viewer;
      setCesiumReady(true);
    }

    initCesium();

    return () => {
      isMounted = false;
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
      }
    };
  }, []);

  // Poll and render live entities
  useEffect(() => {
    if (!cesiumReady || !viewerRef.current) return;

    let timer: NodeJS.Timeout;

    async function updateGlobeEntities() {
      try {
        const Cesium = await import("cesium");
        const viewer = viewerRef.current;
        if (!viewer || viewer.isDestroyed()) return;

        // 1. Aviation
        if (layers.aviation) {
          const res = await fetch("/api/live/aviation");
          if (res.ok) {
            const data = await res.json();
            const flights = data.items || [];
            setEntityCounts((prev) => ({ ...prev, flights: flights.length }));

            for (const f of flights.slice(0, 300)) {
              if (f.lat === undefined || f.lon === undefined) continue;
              const entityId = `flight-${f.entityId}`;
              let entity = viewer.entities.getById(entityId);

              const position = Cesium.Cartesian3.fromDegrees(
                f.lon,
                f.lat,
                Math.max(1000, f.alt || 5000)
              );

              const isMil = f.data.isMilitary;
              const isEmerg = f.data.isEmergency;
              const color = isEmerg
                ? Cesium.Color.RED
                : isMil
                ? Cesium.Color.fromCssColorString("#f59e0b")
                : Cesium.Color.fromCssColorString("#06b6d4");

              if (!entity) {
                viewer.entities.add({
                  id: entityId,
                  name: f.data.callsign || f.entityId,
                  position,
                  point: {
                    pixelSize: isMil || isEmerg ? 7 : 5,
                    color,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 1,
                  },
                  description: `${f.data.callsign} (${f.data.typeCode || "Flight"})\nSpeed: ${f.data.speedKnots} kts\nAlt: ${f.alt} m`,
                });
              } else {
                entity.position = position;
              }
            }
          }
        }

        // 2. Maritime
        if (layers.maritime) {
          const res = await fetch("/api/live/maritime");
          if (res.ok) {
            const data = await res.json();
            const vessels = data.items || [];
            setEntityCounts((prev) => ({ ...prev, vessels: vessels.length }));

            for (const v of vessels.slice(0, 200)) {
              if (v.lat === undefined || v.lon === undefined) continue;
              const entityId = `vessel-${v.entityId}`;
              let entity = viewer.entities.getById(entityId);

              const position = Cesium.Cartesian3.fromDegrees(v.lon, v.lat, 0);
              const isChokepoint = v.source === "static_intelligence";
              const color = isChokepoint
                ? Cesium.Color.fromCssColorString("#ef4444")
                : Cesium.Color.fromCssColorString("#3b82f6");

              if (!entity) {
                viewer.entities.add({
                  id: entityId,
                  name: v.data.name || v.entityId,
                  position,
                  point: {
                    pixelSize: isChokepoint ? 9 : 5,
                    color,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 1,
                  },
                });
              }
            }
          }
        }

        // 3. Electronic Warfare / GPS Jamming
        if (layers.gpsjam) {
          const res = await fetch("/api/live/gpsjam");
          if (res.ok) {
            const data = await res.json();
            const hexes = data.items || [];
            setEntityCounts((prev) => ({ ...prev, jammingHexes: hexes.length }));

            for (const h of hexes.slice(0, 150)) {
              if (h.lat === undefined || h.lon === undefined) continue;
              const entityId = `jam-${h.data.hex}`;
              if (!viewer.entities.getById(entityId)) {
                const isHigh = h.data.severity === "high";
                viewer.entities.add({
                  id: entityId,
                  name: `GPS Jamming Hex ${h.data.hex}`,
                  position: Cesium.Cartesian3.fromDegrees(h.lon, h.lat, 0),
                  ellipse: {
                    semiMinorAxis: 25000.0,
                    semiMajorAxis: 25000.0,
                    material: isHigh
                      ? Cesium.Color.RED.withAlpha(0.35)
                      : Cesium.Color.YELLOW.withAlpha(0.25),
                    outline: true,
                    outlineColor: isHigh ? Cesium.Color.RED : Cesium.Color.YELLOW,
                  },
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("Globe entities render error:", err);
      }
    }

    updateGlobeEntities();
    timer = setInterval(updateGlobeEntities, 15000);

    return () => clearInterval(timer);
  }, [cesiumReady, layers]);

  return (
    <div className="relative flex-1 h-full w-full overflow-hidden bg-[#06090e]">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {/* Layer Toggles Floating Overlay */}
      <div className="absolute top-4 left-4 z-20 flex flex-col space-y-1.5 p-2 rounded bg-slate-950/80 backdrop-blur-md border border-slate-800 text-xs font-mono-hud text-slate-200">
        <div className="flex items-center space-x-1.5 pb-1 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>Active Layers</span>
        </div>

        <button
          onClick={() => setLayers((l) => ({ ...l, aviation: !l.aviation }))}
          className={`flex items-center justify-between space-x-3 px-2 py-1 rounded transition-colors ${
            layers.aviation ? "bg-cyan-950/60 text-cyan-300 border border-cyan-800/60" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <div className="flex items-center space-x-1.5">
            <Plane className="w-3 h-3" />
            <span>Aviation ({entityCounts.flights})</span>
          </div>
          {layers.aviation ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>

        <button
          onClick={() => setLayers((l) => ({ ...l, maritime: !l.maritime }))}
          className={`flex items-center justify-between space-x-3 px-2 py-1 rounded transition-colors ${
            layers.maritime ? "bg-blue-950/60 text-blue-300 border border-blue-800/60" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <div className="flex items-center space-x-1.5">
            <Anchor className="w-3 h-3" />
            <span>Maritime ({entityCounts.vessels})</span>
          </div>
          {layers.maritime ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>

        <button
          onClick={() => setLayers((l) => ({ ...l, gpsjam: !l.gpsjam }))}
          className={`flex items-center justify-between space-x-3 px-2 py-1 rounded transition-colors ${
            layers.gpsjam ? "bg-amber-950/60 text-amber-300 border border-amber-800/60" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <div className="flex items-center space-x-1.5">
            <Zap className="w-3 h-3" />
            <span>GPS Jamming ({entityCounts.jammingHexes})</span>
          </div>
          {layers.gpsjam ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
        </button>
      </div>

      {/* 72-Hour Temporal Scrubber Floating Bar */}
      <div className="absolute bottom-4 inset-x-8 lg:inset-x-24 z-20 p-2.5 rounded bg-slate-950/85 backdrop-blur-md border border-slate-800 flex items-center space-x-4 font-mono-hud text-xs text-slate-200">
        <span className="text-[10px] text-cyan-400 font-bold uppercase whitespace-nowrap">
          72H REPLAY SCRUBBER:
        </span>
        <input
          type="range"
          min="-72"
          max="0"
          step="1"
          value={replayHour}
          onChange={(e) => setReplayHour(parseInt(e.target.value, 10))}
          className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer"
        />
        <span
          className={`font-bold text-xs px-2 py-0.5 rounded whitespace-nowrap ${
            replayHour === 0
              ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
              : "bg-amber-950 text-amber-300 border border-amber-700"
          }`}
        >
          {replayHour === 0 ? "LIVE (T-0)" : `T${replayHour} HOURS`}
        </span>
      </div>
    </div>
  );
};
