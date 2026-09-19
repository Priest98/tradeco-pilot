"use client";

import React from "react";
import { useIntelligenceStore } from "@/store/intelligenceStore";
import { TrendingUp, TrendingDown, DollarSign, Vote, RefreshCw } from "lucide-react";

export const MarketsPanel: React.FC = () => {
  const marketItems = useIntelligenceStore(s => s.markets);
  const loading = false;
  const fetchMarkets = () => useIntelligenceStore.getState().refresh();
  const tickers = marketItems.filter((m) => m.source === "yahoo_finance");
  const predictions = marketItems.filter((m) => m.source === "polymarket");

  return (
    <div className="hud-panel border-t border-slate-800 h-44 flex flex-col text-slate-200">
      {/* Panel Header */}
      <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider font-mono-hud text-slate-100">
            Macro Assets & Prediction Markets
          </h3>
        </div>
        <button
          onClick={fetchMarkets}
          className="text-[10px] font-mono-hud text-slate-400 hover:text-cyan-400 flex items-center space-x-1"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          <span>REFRESH</span>
        </button>
      </div>

      {/* Two-column layout: Tickers on left, Polymarket on right */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-x divide-slate-800 overflow-hidden text-xs">
        {/* Left Column: Commodities & Defense Tickers */}
        <div className="overflow-y-auto p-2 space-y-1.5">
          <span className="text-[10px] font-mono-hud text-slate-500 uppercase block mb-1">
            Global Commodities & Defense Equities
          </span>
          {tickers.length === 0 ? (
            <div className="text-slate-500 text-[11px] font-mono-hud py-2">
              Loading financial feeds...
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 font-mono-hud">
              {tickers.map((t) => {
                const isPositive = Number(t.data.changePct ?? 0) >= 0;
                return (
                  <div
                    key={t.id}
                    className="p-1.5 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-200 block text-[11px]">
                        {String(t.data.symbol ?? "")}
                      </span>
                      <span className="text-slate-500 text-[9px] truncate block max-w-[90px]">
                        {String(t.data.name ?? "")}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-100 font-bold block text-[11px]">
                        ${Number(t.data.price ?? 0).toFixed(2)}
                      </span>
                      <span
                        className={`text-[9px] flex items-center justify-end space-x-0.5 ${
                          isPositive ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-2.5 h-2.5" />
                        ) : (
                          <TrendingDown className="w-2.5 h-2.5" />
                        )}
                        <span>{Number(t.data.changePct ?? 0).toFixed(2)}%</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Polymarket Geopolitical Odds */}
        <div className="overflow-y-auto p-2 space-y-1.5">
          <span className="text-[10px] font-mono-hud text-slate-500 uppercase block mb-1">
            Polymarket Geopolitical Odds (Gamma API)
          </span>
          {predictions.length === 0 ? (
            <div className="text-slate-500 text-[11px] font-mono-hud py-2">
              No active prediction contracts loaded.
            </div>
          ) : (
            <div className="space-y-1.5 font-mono-hud">
              {predictions.map((p) => (
                <div
                  key={p.id}
                  className="p-1.5 rounded bg-slate-900/90 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-1.5 max-w-[70%]">
                    <Vote className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="text-[11px] text-slate-200 truncate">
                      {String(p.data.title ?? "")}
                    </span>
                  </div>
                  <span className="text-cyan-300 font-bold text-xs bg-slate-800 px-2 py-0.5 rounded">
                    {(Number(p.data.yesProbability ?? 0.5) * 100).toFixed(0)}% YES
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
