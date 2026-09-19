"use client";
import React, { useEffect, useRef, useState } from "react";
import { loadCesium } from "@/lib/cesium";
import { positionAt } from "@/lib/replay";
import type { Viewer, PointPrimitiveCollection } from "cesium";
import { useIntelligenceStore, type Telemetry } from "@/store/intelligenceStore";

export const CesiumGlobe: React.FC<{ onSelectEntity?: (entity: Telemetry) => void }> = ({ onSelectEntity }) => {
  const container = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const points = useRef<PointPrimitiveCollection | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [layers, setLayers] = useState<Record<string, boolean>>({ aviation: true, maritime: true, gpsjam: true, satellite: true, seismic: true, thermal: true });
  const entities = useIntelligenceStore(s => s.entities);
  const replayStart = useIntelligenceStore(s => s.replayStart);
  const replayTime = useIntelligenceStore(s => s.replayTime);
  const playing = useIntelligenceStore(s => s.playing);
  const speed = useIntelligenceStore(s => s.speed);
  const select = useRef(onSelectEntity);
  select.current = onSelectEntity;
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium/";
    void loadCesium().then(C => {
      if (disposed || !container.current) return;
      (window as Window & { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = "/cesium/";
      C.Ion.defaultAccessToken = "";
      const v = new C.Viewer(container.current, { baseLayer: false, animation: false, baseLayerPicker: false, fullscreenButton: false, geocoder: false, homeButton: false, infoBox: false, sceneModePicker: false, selectionIndicator: false, timeline: false, navigationHelpButton: false, requestRenderMode: true });
      viewer.current = v;
      points.current = v.scene.primitives.add(new C.PointPrimitiveCollection());
      const provider = new C.UrlTemplateImageryProvider({ url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", maximumLevel: 19, credit: "© OpenStreetMap contributors" });
      const layer = v.imageryLayers.addImageryProvider(provider);
      layer.brightness = 0.55;
      const removeError = provider.errorEvent.addEventListener(() => setError("Basemap unavailable; telemetry remains available."));
      const lost = (event: Event) => { event.preventDefault(); setError("WebGL context lost. Reload to restore the globe."); };
      v.canvas.addEventListener("webglcontextlost", lost);
      const handler = new C.ScreenSpaceEventHandler(v.canvas);
      handler.setInputAction((event: { position: import("cesium").Cartesian2 }) => {
        const picked: unknown = v.scene.pick(event.position);
        if (picked && typeof picked === "object" && "id" in picked && typeof picked.id === "string") {
          const entity = useIntelligenceStore.getState().entities.find(e => `${e.domain}:${e.entityId || e.id}` === picked.id);
          if (entity) { useIntelligenceStore.setState({ selectedEntity: entity }); select.current?.(entity); }
        }
      }, C.ScreenSpaceEventType.LEFT_CLICK);
      v.camera.setView({ destination: C.Cartesian3.fromDegrees(56, 26, 4000000) });
      cleanup = () => { removeError(); handler.destroy(); v.canvas.removeEventListener("webglcontextlost", lost); if (!v.isDestroyed()) v.destroy(); viewer.current = null; points.current = null; };
      setReady(true);
    }).catch((error: unknown) => { console.error("Cesium initialization failed",error); setError(error instanceof Error ? error.message : "Unable to initialize WebGL globe."); });
    return () => { disposed = true; cleanup(); };
  }, []);
  useEffect(() => {
    let cancelled=false, frame=0;
    let unsubscribe=()=>{};
    void loadCesium().then(C=>{
      const v=viewer.current, collection=points.current;
      if(cancelled || !ready || !v || v.isDestroyed() || !collection)return;
      collection.removeAll();
      const groups=new Map<string,Telemetry[]>();
      for(const e of entities){
        if(!layers[e.domain] || typeof e.lat!=="number" || typeof e.lon!=="number" || !Number.isFinite(e.lat) || !Number.isFinite(e.lon) || Math.abs(e.lat)>90 || Math.abs(e.lon)>180)continue;
        const key=e.domain+":"+(e.entityId || e.id);const samples=groups.get(key)||[];samples.push(e);groups.set(key,samples);
      }
      const tracks=[...groups].map(([id,samples])=>{
        samples.sort((a,b)=>a.timestamp-b.timestamp);const e=samples[samples.length-1];
        return {samples,point:collection.add({id,show:false,pixelSize:e.domain==="gpsjam"?12:6,color:C.Color.fromCssColorString(e.data.isEmergency?"#ff3333":({aviation:"#22d3ee",maritime:"#60a5fa",gpsjam:"#fbbf24",satellite:"#c084fc",seismic:"#fb7185",thermal:"#f97316"}[e.domain]||"#ffffff"))})};
      });
      let anchor=performance.now();
      const draw=()=>{
        const state=useIntelligenceStore.getState();
        const time=state.replayTime===null?null:Math.min(state.replayTime+(state.playing?(performance.now()-anchor)*state.speed:0),(state.replayStart ?? state.replayTime)+3599999);
        for(const {samples,point} of tracks){const position=positionAt(samples,time);point.show=position!==null;if(position)point.position=C.Cartesian3.fromDegrees(position.lon,position.lat,position.alt);}
        v.scene.requestRender();
      };
      unsubscribe=useIntelligenceStore.subscribe((state,previous)=>{if(state.replayTime!==previous.replayTime || state.playing!==previous.playing || state.speed!==previous.speed){anchor=performance.now();draw();}});
      const animate=()=>{if(cancelled || v.isDestroyed())return;if(useIntelligenceStore.getState().playing)draw();frame=requestAnimationFrame(animate);};
      draw();animate();
    });
    return ()=>{cancelled=true;cancelAnimationFrame(frame);unsubscribe();};
  },[entities,layers,ready]);
  return <div className="relative flex-1 min-h-0 bg-slate-950">
    <div ref={container} className="absolute inset-0" />
    <div className="absolute top-3 left-3 bg-slate-950/90 p-3 text-xs space-y-2">{Object.entries(layers).map(([domain, visible]) => <label key={domain} className="block"><input type="checkbox" checked={visible} onChange={() => setLayers(l => ({ ...l, [domain]: !visible }))} /> {domain.toUpperCase()}</label>)}</div>
    {error && <div role="status" className="absolute top-3 right-3 text-amber-300 bg-slate-950 p-2 text-xs">{error}</div>}
    {replayTime !== null && <div className="absolute top-16 right-3 text-amber-300 bg-slate-950/90 p-2 text-xs">TEMPORAL REPLAY · {new Date(replayTime).toISOString()} {entities.length === 0 ? "· No recorded observations" : ""}</div>}
    <div className="absolute bottom-3 left-3 right-3 bg-slate-950/90 p-3 flex gap-3 items-center text-xs">
      <label htmlFor="replay">72H REPLAY</label><input id="replay" aria-label="Replay hours before now" type="range" min="-72" max="0" defaultValue="0" onChange={e => useIntelligenceStore.getState().setReplay(Number(e.target.value))} className="flex-1" />
      <span>{replayStart === null ? "LIVE" : "REPLAY"}</span>
      <button disabled={replayStart === null} onClick={() => useIntelligenceStore.setState({ playing: !playing })}>{playing ? "Pause" : "Play"}</button>
      <select aria-label="Playback speed" value={speed} onChange={e => useIntelligenceStore.setState({ speed: Number(e.target.value) })}>{[1, 5, 20].map(s => <option key={s} value={s}>{s}x</option>)}</select>
    </div>
  </div>;
};
