"use client";

import React, { useState } from "react";
import { X, ShieldCheck, HelpCircle, TrendingUp, AlertOctagon, CheckCircle2, ChevronDown, ChevronRight, Scale } from "lucide-react";
import { IntelligenceDossier } from "@/server/intelligence/pipelineEngine";

interface ProvenanceDrawerProps {
  dossier: IntelligenceDossier | null;
  onClose: () => void;
}

export const ProvenanceDrawer: React.FC<ProvenanceDrawerProps> = ({ dossier, onClose }) => {
  const [expandedHypothesis, setExpandedHypothesis] = useState<number | null>(0);

  if (!dossier) return null;

  return (
    <aside className="fixed inset-y-0 right-0 w-full sm:w-[500px] lg:w-[580px] bg-[#070c14]/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-50 flex flex-col text-slate-200 animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="font-mono-hud text-xs font-bold uppercase tracking-wider text-slate-100">
            PROVENANCE DOSSIER // ASK WHY
          </h3>
          <span className="text-[10px] font-mono-hud px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
            AI ASSESSMENT
          </span>
        </div>
        <button
          aria-label="Close provenance drawer"
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* 1. BLUF: Bottom Line Up Front */}
        <section className="p-3.5 rounded bg-slate-900 border border-cyan-500/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono-hud font-bold text-cyan-400 uppercase tracking-wider">
              BOTTOM LINE UP FRONT (BLUF)
            </span>
            <span
              className={`font-mono-hud font-bold text-[10px] px-2 py-0.5 rounded ${
                dossier.threatLevel === "CRITICAL"
                  ? "bg-rose-950 text-rose-300 border border-rose-700"
                  : dossier.threatLevel === "HIGH"
                  ? "bg-amber-950 text-amber-300 border border-amber-700"
                  : "bg-yellow-950/70 text-yellow-300 border border-yellow-700"
              }`}
            >
              {dossier.threatLevel}
            </span>
          </div>
          <p className="text-slate-100 text-xs leading-relaxed font-medium">
            {dossier.bluf}
          </p>
        </section>

        {/* 2. Key Intelligence Drivers */}
        {dossier.keyDrivers && dossier.keyDrivers.length > 0 && (
          <section>
            <h4 className="text-[11px] font-mono-hud font-bold text-slate-400 uppercase mb-2">
              Primary Intelligence Drivers
            </h4>
            <ul className="space-y-1.5 font-mono-hud text-[11px] text-slate-300">
              {dossier.keyDrivers.map((driver, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{driver}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 3. Three Competing Hypotheses with Evidence & Counter-Evidence */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-[11px] font-mono-hud font-bold text-slate-400 uppercase">
              Competing Hypotheses & Evidence Check
            </h4>
            <span className="text-[10px] font-mono-hud text-slate-500">Σ P = 1.0</span>
          </div>

          <div className="space-y-2">
            {dossier.competingHypotheses?.map((hypo, idx) => {
              const isExpanded = expandedHypothesis === idx;
              return (
                <div
                  key={idx}
                  className="rounded border border-slate-800 bg-slate-900/60 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedHypothesis(isExpanded ? null : idx)}
                    className="w-full p-2.5 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span className="font-mono-hud font-bold text-cyan-300 text-[11px]">
                        H{idx + 1}
                      </span>
                      <span className="text-slate-200 text-xs line-clamp-1">
                        {hypo.hypothesis}
                      </span>
                    </div>
                    <span className="font-mono-hud font-bold text-xs bg-slate-800 px-2 py-0.5 rounded text-amber-300 ml-2 shrink-0">
                      {(hypo.probability * 100).toFixed(0)}%
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 space-y-2.5">
                      <p className="text-slate-300 text-xs">{hypo.hypothesis}</p>

                      {/* Supporting Evidence */}
                      <div>
                        <span className="text-[10px] font-mono-hud text-emerald-400 font-bold uppercase block mb-1">
                          Supporting Signals:
                        </span>
                        <ul className="space-y-1 text-[11px] text-slate-300 font-mono-hud">
                          {hypo.supportingEvidence.map((s, sIdx) => (
                            <li key={sIdx} className="flex items-start space-x-1.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Contradicting Evidence */}
                      <div>
                        <span className="text-[10px] font-mono-hud text-rose-400 font-bold uppercase block mb-1">
                          Contradicting / Mundane Signals:
                        </span>
                        <ul className="space-y-1 text-[11px] text-slate-300 font-mono-hud">
                          {hypo.contradictingEvidence.map((c, cIdx) => (
                            <li key={cIdx} className="flex items-start space-x-1.5">
                              <X className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Calibrated Forecast & Resolution Criteria */}
        {dossier.forecast && (
          <section className="p-3 rounded bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono-hud font-bold text-slate-400 uppercase">
                Forecast Estimate (Unvalidated)
              </span>
              <span className="font-mono-hud text-cyan-300 text-xs font-bold">
                P = {(dossier.forecast.probability * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-slate-100 text-xs font-medium">
              {dossier.forecast.question}
            </p>
            <div className="text-[10px] font-mono-hud text-slate-400 space-y-1 pt-1 border-t border-slate-800">
              <div>
                <strong>Resolution Date:</strong> {dossier.forecast.targetDate}
              </div>
              <div>
                <strong>Falsification Criteria:</strong> {dossier.forecast.falsifiableCriteria}
              </div>
            </div>
          </section>
        )}

        {/* 5. Macro Cross-Asset Transmission Channels */}
        {dossier.marketImpact && (
          <section className="p-3 rounded bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center space-x-1.5 text-[11px] font-mono-hud font-bold text-slate-400 uppercase">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Macro Asset Transmission</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-hud">
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[9px]">CRUDE OIL</span>
                <span className="text-slate-200">{dossier.marketImpact.crudeOil}</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[9px]">GOLD FUTURES</span>
                <span className="text-slate-200">{dossier.marketImpact.gold}</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[9px]">US DOLLAR (DXY)</span>
                <span className="text-slate-200">{dossier.marketImpact.usDollar}</span>
              </div>
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block text-[9px]">DEFENSE EQUITIES</span>
                <span className="text-slate-200">{dossier.marketImpact.defenseEquities}</span>
              </div>
            </div>
          </section>
        )}

        {/* 6. The "NO-TRADE" Gatekeeper Verdict */}
        {dossier.noTradeRecommendation && (
          <section className="p-3.5 rounded bg-rose-950/20 border border-rose-800/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-rose-400 font-mono-hud font-bold text-[11px] uppercase">
                <Scale className="w-3.5 h-3.5" />
                <span>No-Trade Discipline Filter</span>
              </div>
              <span className="font-mono-hud font-bold text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700">
                {dossier.noTradeRecommendation.verdict}
              </span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              {dossier.noTradeRecommendation.rationale}
            </p>
            <div className="text-[10px] font-mono-hud text-slate-400 pt-1 border-t border-rose-900/30">
              <strong>Falsification Trigger:</strong> {dossier.noTradeRecommendation.falsificationTrigger}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};
