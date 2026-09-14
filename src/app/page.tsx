"use client";

import React, { useState, useEffect } from "react";
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
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [selectedDossier, setSelectedDossier] = useState<IntelligenceDossier | null>(null);
  const [investigatingId, setInvestigatingId] = useState<string | null>(null);
  const [systemThreatLevel, setSystemThreatLevel] = useState<"CRITICAL" | "HIGH" | "ELEVATED" | "LOW">("ELEVATED");

  // Fetch active anomalies
  const loadAnomalies = async () => {
    try {
      const res = await fetch("/api/anomalies");
      if (res.ok) {
        const data = await res.json();
        setAnomalies(data.anomalies || []);

        // Derive overall system threat level
        const maxZ = Math.max(0, ...(data.anomalies || []).map((a: AnomalyItem) => a.zScore));
        if (maxZ >= 4.0) setSystemThreatLevel("CRITICAL");
        else if (maxZ >= 3.0) setSystemThreatLevel("HIGH");
        else if (maxZ >= 2.0) setSystemThreatLevel("ELEVATED");
        else setSystemThreatLevel("LOW");
      }
    } catch (err) {
      console.warn("Failed to load anomalies:", err);
    }
  };

  useEffect(() => {
    loadAnomalies();
    const interval = setInterval(loadAnomalies, 30000);
    return () => clearInterval(interval);
  }, []);

  // Trigger 7-Stage Multi-Role AI Reasoning Pipeline
  const handleInvestigateAnomaly = async (anomaly: AnomalyItem) => {
    setInvestigatingId(anomaly.id);
    try {
      const res = await fetch("/api/anomalies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anomalyId: anomaly.id }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.dossier) {
          setSelectedDossier(data.dossier);
        }
      }
    } catch (err) {
      console.error("Investigation failed:", err);
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
