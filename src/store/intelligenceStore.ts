"use client";
import { create } from "zustand";
import type { AnomalyItem } from "@/components/workstation/AnomalyRadarPanel";
import type { IntelligenceDossier } from "@/server/intelligence/pipelineEngine";
import { playAlert } from "@/lib/audioFX";

export interface Telemetry {
  id: string; domain: string; source: string; entityId?: string;
  lat?: number; lon?: number; alt?: number; timestamp: number;
  data: Record<string, unknown>;
}
interface IntelligenceState {
  anomalies: AnomalyItem[]; entities: Telemetry[]; markets: Telemetry[];
  selectedDossier: IntelligenceDossier | null; selectedEntity: Telemetry | null;
  investigatingId: string | null; replayStart: number | null; replayTime: number | null;
  speed: number; playing: boolean; muted: boolean; error: string | null;
  setReplay: (hours: number) => void;
  refresh: () => Promise<void>;
}
let revision = 0;
let replayDebounce: ReturnType<typeof setTimeout> | undefined;
let abort: AbortController | undefined;
export const useIntelligenceStore = create<IntelligenceState>((set, get) => ({
  anomalies: [], entities: [], markets: [], selectedDossier: null, selectedEntity: null,
  investigatingId: null, replayStart: null, replayTime: null, speed: 1, playing: false, muted: true, error: null,
  setReplay: hours => {
    const start = hours === 0 ? null : Date.now() + hours * 3600000;
    revision++; abort?.abort();
    set({ replayStart: start, replayTime: start, entities: [], playing: false });
    clearTimeout(replayDebounce);
    replayDebounce = setTimeout(() => void get().refresh(), 150);
  },
  refresh: async () => {
    abort?.abort(); abort = new AbortController();
    const signal = abort.signal; const version = ++revision; const { replayStart } = get();
    try {
      const read = async (url: string) => { const response = await fetch(url, { signal }); if (!response.ok) throw new Error(`Feed unavailable (${response.status})`); return response.json(); };
      const domains = ["aviation", "maritime", "gpsjam", "satellite", "seismic", "thermal"];
      const results = await Promise.allSettled(domains.map(domain => read(replayStart === null ? `/api/live/${domain}` : `/api/replay?domain=${domain}&start=${replayStart}`)));
      if (version !== revision) return;
      const entities: Telemetry[] = results.flatMap(result => result.status === "fulfilled" && Array.isArray(result.value.items) ? result.value.items : []);
      const old = new Set(get().entities.filter(e => ["7700", "7600"].includes(String(e.data.squawk))).map(e => e.entityId));
      if (replayStart === null && entities.some(e => ["7700", "7600"].includes(String(e.data.squawk)) && !old.has(e.entityId))) playAlert("emergency");
      set({ entities, error: results.some(r => r.status === "rejected") ? "Some telemetry feeds are unavailable" : null });
      if (replayStart !== null) return;
      const [a, m] = await Promise.all([read("/api/anomalies"), read("/api/live/market")]);
      if (version !== revision) return;
      const anomalies: AnomalyItem[] = a.anomalies || [];
      const known = new Set(get().anomalies.map(item => item.id));
      if (anomalies.some(item => item.zScore > 3 && !known.has(item.id))) playAlert("anomaly");
      set({ anomalies, markets: m.items || [] });
    } catch (error) { if (version === revision && !signal.aborted) set({ error: error instanceof Error ? error.message : "Telemetry unavailable" }); }
  },
}));

export function startIntelligencePolling() {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  const poll = async () => {
    if (useIntelligenceStore.getState().replayStart === null) await useIntelligenceStore.getState().refresh();
    if (!stopped) timer = setTimeout(poll, 30000);
  };
  void poll();
  const playback = setInterval(() => {
    const s = useIntelligenceStore.getState();
    if (!s.playing || s.replayTime === null || s.replayStart === null) return;
    const next = Math.min(s.replayTime + s.speed * 1000, s.replayStart + 3599999);
    useIntelligenceStore.setState({ replayTime: next, playing: next < s.replayStart + 3599999 });
  }, 1000);
  return () => { stopped = true; clearTimeout(replayDebounce); clearTimeout(timer); clearInterval(playback); revision++; abort?.abort(); };
}
