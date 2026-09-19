"use client";

import React, { useState } from "react";
import { AlertTriangle, Zap, Plane, Anchor, Activity, ShieldAlert, Cpu, Sparkles } from "lucide-react";

export interface AnomalyItem {
  id: string;
  timestamp: number;
  domain: string;
  anomalyType: string;
  zScore: number;
  confidence: number;
  lat?: number;
  lon?: number;
  summary: string;
  evidence: Record<string, unknown>;
  status: string;
}

interface AnomalyRadarProps {
  anomalies: AnomalyItem[];
  onInvestigate: (anomaly: AnomalyItem) => void;
  investigatingId?: string | null;
}

export const AnomalyRadarPanel: React.FC<AnomalyRadarProps> = ({
  anomalies,
  onInvestigate,
  investigatingId,
}) => {
  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case "aviation":
        return <Plane className="w-3.5 h-3.5 text-cyan-400" />;
      case "maritime":
        return <Anchor className="w-3.5 h-3.5 text-blue-400" />;
      case "gpsjam":
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case "cyber":
        return <Cpu className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-rose-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full hud-panel border-r border-slate-800 w-80 lg:w-96 text-slate-200">
      {/* Panel Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-bold tracking-wider uppercase font-mono-hud text-slate-100">
            Statistical Anomaly Radar
          </h2>
        </div>
        <span className="text-[10px] font-mono-hud bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-amber-300">
          RULES + STATISTICS
        </span>
      </div>

      {/* Anomaly List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {anomalies.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-mono-hud">
            No recorded anomalies. Feed coverage and baseline history may be incomplete.
          </div>
        ) : (
          anomalies.map((a) => {
            const isInvestigating = investigatingId === a.id;
            return (
              <div
                key={a.id}
                className="p-3 rounded bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all text-xs"
              >
                {/* Header row: Domain + Z-score */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-1.5 font-mono-hud uppercase text-[11px] text-slate-400">
                    {getDomainIcon(a.domain)}
                    <span>{a.domain}</span>
                    <span className="text-slate-600">•</span>
                    <span>{a.anomalyType.replace(/_/g, " ")}</span>
                  </div>
                  <span
                    className={`font-mono-hud font-bold px-1.5 py-0.2 rounded text-[10px] ${
                      a.zScore >= 4.0
                        ? "bg-rose-950 text-rose-300 border border-rose-800"
                        : "bg-amber-950 text-amber-300 border border-amber-800"
                    }`}
                  >
                    {a.zScore === 0 ? "RULE / Z unavailable" : `Z=${a.zScore.toFixed(1)}`}
                  </span>
                </div>

                {/* Summary */}
                <p className="text-slate-200 text-xs mb-2 leading-relaxed">
                  {a.summary}
                </p>

                {/* Coordinates & Timestamp */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-hud mb-2.5">
                  <span>
                    {a.lat && a.lon
                      ? `${a.lat.toFixed(2)}°, ${a.lon.toFixed(2)}°`
                      : "Multi-sector"}
                  </span>
                  <span>CONF: {(a.confidence * 100).toFixed(0)}%</span>
                </div>

                {/* 1-Click Multi-Stage AI Reasoning Trigger */}
                <button
                  onClick={() => onInvestigate(a)}
                  disabled={isInvestigating}
                  className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-600/50 hover:border-cyan-400 text-cyan-300 font-mono-hud text-[11px] font-semibold transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
                  <span>
                    {isInvestigating
                      ? "REASONING PIPELINE ACTIVE..."
                      : "TRIGGER 7-STAGE AI BRAIN"}
                  </span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
