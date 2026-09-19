"use client";
import { useIntelligenceStore, startIntelligencePolling } from "@/store/intelligenceStore";
import { playAlert } from "@/lib/audioFX";


import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import { WorkstationHeader } from "@/components/workstation/WorkstationHeader";
import { AnomalyRadarPanel, AnomalyItem } from "@/components/workstation/AnomalyRadarPanel";
import { ProvenanceDrawer } from "@/components/workstation/ProvenanceDrawer";
import { MarketsPanel } from "@/components/workstation/MarketsPanel";
import { IntelligenceDossier } from "@/server/intelligence/pipelineEngine";

// Dynamically load Cesium Globe without SSR (WebGL / window required)
const CesiumGlobe = dynamic(
  () => import("@/components/globe/CesiumGlobe").then((mod) => mod.CesiumGlobe),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#06090e] text-cyan-400 font-mono-hud text-sm">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
          <span>INITIALIZING 3D CESIUM SPATIAL ENGINE & SGP4 ORBITAL MECHANICS...</span>
        </div>
      </div>
    ),
  }
);

export default function WorkstationPage() {
  const anomalies = useIntelligenceStore(s => s.anomalies);
  const selectedDossier = useIntelligenceStore(s => s.selectedDossier);
  const investigatingId = useIntelligenceStore(s => s.investigatingId);
  const error = useIntelligenceStore(s => s.error);
  const setInvestigatingId = (investigatingId: string | null) => useIntelligenceStore.setState({ investigatingId });
  const setSelectedDossier = (selectedDossier: IntelligenceDossier | null) => useIntelligenceStore.setState({ selectedDossier });
  const maxZ = Math.max(0, ...anomalies.map(a => a.zScore));
  const systemThreatLevel = anomalies.some(a=>a.anomalyType === "emergency_squawk") ? "HIGH" : maxZ >= 4 ? "CRITICAL" : maxZ >= 3 ? "HIGH" : maxZ >= 2 ? "ELEVATED" : "LOW";
  useEffect(startIntelligencePolling, []);

  // Trigger 7-Stage Multi-Role AI Reasoning Pipeline
  const handleInvestigateAnomaly = async (anomaly: AnomalyItem) => {
    setInvestigatingId(anomaly.id);
    try {
      const res = await fetch("/api/anomalies", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-system-key": sessionStorage.getItem("system-key") || "" },
        body: JSON.stringify({ anomalyId: anomaly.id }),
      });

      if (!res.ok) throw new Error(res.status === 401 ? "Set the system API key to investigate." : "Investigation unavailable.");
      if (res.ok) {
        const data = await res.json();
        if (data.dossier) {
          setSelectedDossier(data.dossier);
          playAlert("dossier");
        }
      }
    } catch (err) {
      useIntelligenceStore.setState({error:err instanceof Error ? err.message : "Investigation failed"});
    } finally {
      setInvestigatingId(null);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#06090e]">
      {/* Tactical Top Telemetry Bar */}
      <WorkstationHeader
        threatLevel={systemThreatLevel}
        activeAnomalyCount={anomalies.length}
      />

      {error && <div role="status" className="text-xs text-amber-300 px-4 py-1">{error}</div>}
      {/* Main Viewport */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Statistical Anomaly Radar */}
        <AnomalyRadarPanel
          anomalies={anomalies}
          onInvestigate={handleInvestigateAnomaly}
          investigatingId={investigatingId}
        />

        {/* Center: 3D Globe + Bottom Macro Markets Strip */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <CesiumGlobe onSelectEntity={(entity) => console.log("Selected:", entity)} />
          <MarketsPanel />
        </div>

        {/* Right: "ASK WHY" Provenance Drawer (Slides out upon AI trigger) */}
        <ProvenanceDrawer
          dossier={selectedDossier}
          onClose={() => setSelectedDossier(null)}
        />
      </div>
    </div>
  );
}
