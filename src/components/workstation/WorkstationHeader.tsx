"use client";

import React, { useEffect, useState } from "react";
import { Shield, Radio, Activity, Globe, Satellite, AlertTriangle, Clock } from "lucide-react";

import { useIntelligenceStore } from "@/store/intelligenceStore";
import { enableAudio } from "@/lib/audioFX";

interface HeaderProps {
  threatLevel?: "CRITICAL" | "HIGH" | "ELEVATED" | "LOW";
  activeAnomalyCount: number;
  systemStatus?: string;
}

export const WorkstationHeader: React.FC<HeaderProps> = ({
  threatLevel = "ELEVATED",
  activeAnomalyCount,
  systemStatus = "OPERATIONAL",
}) => {
  const muted = useIntelligenceStore(s => s.muted);
  const [zuluTime, setZuluTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setZuluTime(now.toISOString().replace("T", " ").replace("Z", " ZULU"));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getThreatBadge = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "bg-rose-950 text-rose-300 border-rose-600 animate-radar-pulse";
      case "HIGH":
        return "bg-amber-950 text-amber-300 border-amber-500";
      case "ELEVATED":
        return "bg-yellow-950/60 text-yellow-300 border-yellow-600";
      default:
        return "bg-emerald-950 text-emerald-300 border-emerald-600";
    }
  };

  return (
    <header className="h-14 hud-panel border-b border-slate-800 flex items-center justify-between px-4 z-40 relative">
      {/* Brand & System Identity */}
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
          <Globe className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-semibold tracking-wider text-slate-100 font-mono-hud uppercase">
              TRADECO-PILOT
            </h1>
            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono-hud">
              v1.0-INTEL
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Personal Global Situational Awareness & Calibrated Reasoning System
          </p>
        </div>
      </div>

      {/* Center: Live Feeds Telemetry */}
      <div className="hidden lg:flex items-center space-x-6 text-xs text-slate-300 font-mono-hud">
        <div className="flex items-center space-x-1.5">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>ADS-B: <strong className="text-cyan-300">FEED</strong></span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Satellite className="w-3.5 h-3.5 text-emerald-400" />
          <span>SGP4 ORBIT: <strong className="text-emerald-300">FEED</strong></span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span>H3 JAMMING: <strong className="text-amber-300">FEED</strong></span>
        </div>
      </div>

      {/* Right Controls: Zulu Clock & Threat Level */}
      <div className="flex items-center space-x-3">
        <button className="text-xs" onClick={async () => { try { await enableAudio(muted); useIntelligenceStore.setState({ muted: !muted }); } catch { useIntelligenceStore.setState({ error: "Audio unavailable" }); } }}>{muted ? "UNMUTE" : "MUTE"}</button>
        <a className="text-xs" href="/api/briefing?format=markdown" download>PDB MD</a>
        <a className="text-xs" href="/api/briefing?format=pdf" download>PDB PDF</a>
        <button className="text-xs" onClick={() => { const key = window.prompt("System API key (stored for this tab only)"); if (key) sessionStorage.setItem("system-key", key); }}>API KEY</button>
        {/* Active Anomalies Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono-hud">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">ANOMALIES:</span>
          <span className={`font-bold ${activeAnomalyCount > 0 ? "text-amber-300" : "text-slate-300"}`}>
            {activeAnomalyCount}
          </span>
        </div>

        {/* Threat Level */}
        <div
          className={`px-2.5 py-1 rounded border text-xs font-bold tracking-wider font-mono-hud flex items-center space-x-1.5 ${getThreatBadge(
            threatLevel
          )}`}
        >
          <Shield className="w-3 h-3" />
          <span>{threatLevel}</span>
        </div>

        {/* Zulu Clock */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-cyan-300 font-mono-hud">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{zuluTime || "00:00:00 ZULU"}</span>
        </div>
      </div>
    </header>
  );
};
