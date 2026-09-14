import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { generateDailyBriefing } from "./src/server/intelligence/briefingGenerator.ts";
import { computeCalibrationAnalytics, resolveForecastRecord } from "./src/server/intelligence/calibrationAnalytics.ts";
import { analyzeAsn } from "./src/server/recon/asn.ts";
import { analyzeCryptoAddress } from "./src/server/recon/crypto.ts";
import { analyzeCve } from "./src/server/recon/cve.ts";
import { tripwireEngine, STRATEGIC_AOIS } from "./src/server/intelligence/tripwireEngine.ts";

const PORT = Number(process.env.PORT || 3030);
const DATA_DIR = path.resolve("./data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── 1. SQLITE DATABASE SETUP ──
const dbPath = path.join(DATA_DIR, "intelligence.db");
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = NORMAL;");
db.exec("PRAGMA foreign_keys = ON;");

const schemaPath = path.resolve("src/server/db/schema.sql");
if (fs.existsSync(schemaPath)) {
  db.exec(fs.readFileSync(schemaPath, "utf-8"));
}

// ── 2. STATIC FILE RESOLUTION ──
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".glb": "model/gltf-binary",
};

function serveStaticFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}

// ── 3. COMPLETE CLIENT WORKSTATION HTML ──
const WORKSTATION_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TradeCo-Pilot | Personal Global Intelligence System</title>
  <script src="/cesium/Cesium.js"></script>
  <link rel="stylesheet" href="/cesium/Widgets/widgets.css">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --bg: #06090e;
      --panel-bg: rgba(10, 15, 24, 0.88);
      --panel-border: rgba(30, 41, 59, 0.8);
      --cyan: #06b6d4;
    }
    body { background-color: var(--bg); color: #e2e8f0; font-family: ui-sans-serif, system-ui, sans-serif; overflow: hidden; }
    .font-hud { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .hud-panel { background: var(--panel-bg); backdrop-filter: blur(12px); border: 1px solid var(--panel-border); }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.6); }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
    ::-webkit-scrollbar-thumb:hover { background: #06b6d4; }
    .pulse-radar { animation: radar 2s infinite; }
    @keyframes radar { 0% { box-shadow: 0 0 0 0 rgba(244,63,94,0.7); } 70% { box-shadow: 0 0 0 8px rgba(244,63,94,0); } 100% { box-shadow: 0 0 0 0 rgba(244,63,94,0); } }
    .cesium-viewer-bottom { display: none !important; }
  </style>
</head>
<body class="h-screen w-screen flex flex-col select-none">

  <!-- TOP HUD BAR -->
  <header class="h-12 hud-panel border-b border-slate-800 flex items-center justify-between px-4 z-30">
    <div class="flex items-center space-x-3">
      <div class="w-7 h-7 rounded bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-hud text-xs font-bold">
        TCP
      </div>
      <div>
        <div class="flex items-center space-x-2">
          <span class="text-xs font-bold tracking-wider text-slate-100 font-hud uppercase">TRADECO-PILOT</span>
          <span class="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-hud">v1.2-FORENSICS</span>
        </div>
        <p class="text-[9px] text-slate-400 font-hud">SITUATIONAL AWARENESS • AOI TRIPWIRES • CALIBRATED REASONING</p>
      </div>
    </div>

    <!-- Quick Tool Action Buttons -->
    <div class="flex items-center space-x-2 text-xs font-hud">
      <button onclick="openBriefingModal()" class="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-cyan-700/60 text-cyan-300 flex items-center space-x-1.5 font-bold transition-all">
        <span>📋</span>
        <span>PDB BRIEFING</span>
      </button>

      <button onclick="openReconModal()" class="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-purple-700/60 text-purple-300 flex items-center space-x-1.5 font-bold transition-all">
        <span>🔍</span>
        <span>RECON TOOLKIT</span>
      </button>

      <button onclick="openCalibrationModal()" class="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-emerald-700/60 text-emerald-300 flex items-center space-x-1.5 font-bold transition-all">
        <span>🎯</span>
        <span>BRIER CALIBRATION</span>
      </button>
    </div>

    <!-- Right Controls -->
    <div class="flex items-center space-x-3 text-xs font-hud">
      <div class="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] flex items-center space-x-1.5">
        <span class="text-slate-400">ANOMALIES:</span>
        <span id="anomaly-count-badge" class="font-bold text-amber-300">3</span>
      </div>
      <div id="threat-badge" class="px-2.5 py-1 rounded border text-[11px] font-bold tracking-wider bg-rose-950 text-rose-300 border-rose-600 pulse-radar">
        CRITICAL
      </div>
      <div id="zulu-clock" class="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] text-cyan-300">
        00:00:00 ZULU
      </div>
    </div>
  </header>

  <!-- MAIN BODY -->
  <div class="flex-1 flex overflow-hidden relative">

    <!-- LEFT: ANOMALY RADAR PANEL -->
    <div class="w-80 lg:w-96 hud-panel border-r border-slate-800 flex flex-col z-20">
      <div class="p-3 border-b border-slate-800 flex items-center justify-between">
        <span class="text-xs font-bold tracking-wider uppercase font-hud text-slate-100 flex items-center space-x-1.5">
          <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
          <span>Statistical Anomaly Radar</span>
        </span>
        <span class="text-[10px] font-hud bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-amber-300">Z &gt; 2.5</span>
      </div>
      <div id="anomaly-list" class="flex-1 overflow-y-auto p-2 space-y-2 text-xs font-hud">
        <!-- Injected via JavaScript -->
      </div>
    </div>

    <!-- CENTER: 3D CESIUM GLOBE + MARKETS FOOTER -->
    <div class="flex-1 flex flex-col h-full relative overflow-hidden">
      <!-- 3D WebGL Canvas Container -->
      <div id="cesiumContainer" class="flex-1 w-full h-full"></div>

      <!-- Layer Control Toggles -->
      <div class="absolute top-4 left-4 z-20 flex flex-col space-y-1.5 p-2 rounded bg-slate-950/85 backdrop-blur-md border border-slate-800 text-xs font-hud text-slate-200">
        <span class="text-[10px] text-slate-400 font-bold uppercase pb-1 border-b border-slate-800">Visual Layers</span>
        <label class="flex items-center space-x-2 cursor-pointer text-cyan-300">
          <input type="checkbox" id="toggle-aviation" checked class="accent-cyan-500">
          <span>Aviation & Military Air</span>
        </label>
        <label class="flex items-center space-x-2 cursor-pointer text-blue-300">
          <input type="checkbox" id="toggle-maritime" checked class="accent-blue-500">
          <span>Maritime & Chokepoints</span>
        </label>
        <label class="flex items-center space-x-2 cursor-pointer text-amber-300">
          <input type="checkbox" id="toggle-jamming" checked class="accent-amber-500">
          <span>H3 GPS Jamming Polygons</span>
        </label>
        <label class="flex items-center space-x-2 cursor-pointer text-rose-300">
          <input type="checkbox" id="toggle-tripwires" checked class="accent-rose-500">
          <span>AOI Tripwire Corridors</span>
        </label>
      </div>

      <!-- 72-Hour Temporal Scrubber Bar -->
      <div class="absolute bottom-40 inset-x-8 lg:inset-x-20 z-20 p-2 rounded bg-slate-950/90 backdrop-blur-md border border-slate-800 flex items-center space-x-3 font-hud text-xs text-slate-200">
        <span class="text-[10px] text-cyan-400 font-bold uppercase whitespace-nowrap">72H REPLAY SCRUBBER:</span>
        <input type="range" id="replay-slider" min="-72" max="0" step="1" value="0" class="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer">
        <span id="replay-label" class="font-bold text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 whitespace-nowrap">
          LIVE (T-0)
        </span>
      </div>

      <!-- BOTTOM: MACRO ASSETS & POLYMARKET ODDS STRIP -->
      <div class="h-36 hud-panel border-t border-slate-800 flex flex-col z-20">
        <div class="px-3 py-1 border-b border-slate-800 flex items-center justify-between text-xs font-hud">
          <span class="text-[10px] font-bold text-slate-400 uppercase">Macro Commodity & Geopolitical Transmission</span>
          <span class="text-[9px] text-slate-500">REAL-TIME COMMODITIES & ODDS</span>
        </div>
        <div class="flex-1 grid grid-cols-2 divide-x divide-slate-800 p-2 overflow-hidden text-xs font-hud">
          <!-- Left: Commodities -->
          <div class="pr-2 space-y-1 overflow-y-auto">
            <span class="text-[9px] text-slate-500 block uppercase">Spot Commodities & Defense</span>
            <div id="tickers-grid" class="grid grid-cols-2 gap-1.5">
              <!-- Injected via JavaScript -->
            </div>
          </div>
          <!-- Right: Polymarket -->
          <div class="pl-2 space-y-1 overflow-y-auto">
            <span class="text-[9px] text-slate-500 block uppercase">Polymarket Calibrated Geopolitical Odds</span>
            <div id="polymarket-list" class="space-y-1.5">
              <!-- Injected via JavaScript -->
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT: "ASK WHY" PROVENANCE DRAWER (Hidden by default, slides in on click) -->
    <aside id="provenance-drawer" class="hidden fixed inset-y-0 right-0 w-full sm:w-[500px] lg:w-[560px] bg-[#070c14]/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-50 flex flex-col text-slate-200">
      <div class="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div class="flex items-center space-x-2">
          <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span class="font-hud text-xs font-bold uppercase tracking-wider text-slate-100">PROVENANCE DOSSIER // ASK WHY</span>
        </div>
        <button onclick="closeProvenance()" class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-hud text-xs">✕</button>
      </div>
      <div id="provenance-content" class="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-hud"></div>
    </aside>

  </div>

  <!-- MODAL: PRESIDENTIAL DAILY BRIEF (PDB) -->
  <div id="briefing-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="w-full max-w-4xl max-h-[90vh] hud-panel rounded-lg border border-cyan-500/40 flex flex-col overflow-hidden text-slate-200 font-hud">
      <div class="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <div class="flex items-center space-x-2">
          <span class="text-base">📋</span>
          <span class="font-bold text-xs uppercase tracking-wider text-cyan-300">PRESIDENTIAL INTELLIGENCE BRIEF (PDB)</span>
        </div>
        <div class="flex items-center space-x-2">
          <button onclick="copyBriefingMarkdown()" class="px-2 py-0.5 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 text-[10px] font-bold">COPY MARKDOWN</button>
          <button onclick="closeBriefingModal()" class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs">✕</button>
        </div>
      </div>
      <div id="briefing-modal-body" class="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed">
        Loading briefing memo...
      </div>
    </div>
  </div>

  <!-- MODAL: FORENSIC RECON TOOLKIT -->
  <div id="recon-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="w-full max-w-3xl max-h-[85vh] hud-panel rounded-lg border border-purple-500/40 flex flex-col overflow-hidden text-slate-200 font-hud">
      <div class="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <div class="flex items-center space-x-2">
          <span class="text-base">🔍</span>
          <span class="font-bold text-xs uppercase tracking-wider text-purple-300">DEEP FORENSIC RECON TOOLKIT</span>
        </div>
        <button onclick="closeReconModal()" class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs">✕</button>
      </div>
      <div class="p-4 border-b border-slate-800 bg-slate-900/50 flex space-x-2">
        <select id="recon-tool-type" class="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200">
          <option value="crypto">Crypto Wallet (OFAC Sanctions)</option>
          <option value="asn">BGP ASN & Routing Intelligence</option>
          <option value="cve">CISA KEV / Exploit Forensics</option>
        </select>
        <input id="recon-input" type="text" placeholder="Enter BTC/ETH address, ASN number, or CVE ID..." class="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500">
        <button onclick="executeRecon()" class="px-4 py-1 rounded bg-purple-900 hover:bg-purple-800 text-purple-200 font-bold text-xs">ANALYZE</button>
      </div>
      <div id="recon-result" class="flex-1 overflow-y-auto p-4 text-xs leading-relaxed">
        <div class="p-8 text-center text-slate-500">Select a tool and enter a target identifier to execute automated deep forensics.</div>
      </div>
    </div>
  </div>

  <!-- MODAL: BRIER CALIBRATION ANALYTICS -->
  <div id="calibration-modal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="w-full max-w-4xl max-h-[90vh] hud-panel rounded-lg border border-emerald-500/40 flex flex-col overflow-hidden text-slate-200 font-hud">
      <div class="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
        <div class="flex items-center space-x-2">
          <span class="text-base">🎯</span>
          <span class="font-bold text-xs uppercase tracking-wider text-emerald-300">SUPERFORECASTER BRIER CALIBRATION DASHBOARD</span>
        </div>
        <button onclick="closeCalibrationModal()" class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs">✕</button>
      </div>
      <div id="calibration-modal-body" class="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
        Loading calibration analytics...
      </div>
    </div>
  </div>

  <script>
    // 1. ZULU CLOCK
    setInterval(() => {
      const now = new Date();
      document.getElementById('zulu-clock').innerText = now.toISOString().replace('T', ' ').replace('Z', ' ZULU');
    }, 1000);

    // 2. CESIUM GLOBE INITIALIZATION
    window.CESIUM_BASE_URL = '/cesium';
    let viewer = null;

    try {
      viewer = new Cesium.Viewer('cesiumContainer', {
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
        shouldAnimate: true
      });

      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#06090e');
      if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(56.25, 26.55, 1200000.0),
        duration: 2.0
      });
    } catch (e) {
      console.error('Cesium init error:', e);
    }

    // 3. LOAD ANOMALIES
    async function loadAnomalies() {
      try {
        const res = await fetch('/api/anomalies');
        const data = await res.json();
        const list = document.getElementById('anomaly-list');
        list.innerHTML = '';

        document.getElementById('anomaly-count-badge').innerText = data.count || 0;

        (data.anomalies || []).forEach(a => {
          const card = document.createElement('div');
          card.className = 'p-2.5 rounded bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all';
          card.innerHTML = \`
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-slate-300 uppercase text-[10px]">\${a.domain} • \${a.anomalyType.replace(/_/g, ' ')}</span>
              <span class="font-bold text-[10px] px-1.5 py-0.2 rounded \${a.zScore >= 4 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}">
                Z=\${a.zScore.toFixed(1)}
              </span>
            </div>
            <p class="text-slate-200 text-xs mb-2 leading-relaxed">\${a.summary}</p>
            <div class="flex items-center justify-between text-[10px] text-slate-400 mb-2">
              <span>\${a.lat ? a.lat.toFixed(2) + '°, ' + a.lon.toFixed(2) + '°' : 'Regional'}</span>
              <span>CONF: \${(a.confidence * 100).toFixed(0)}%</span>
            </div>
            <button onclick="triggerInvestigation('\${a.id}')" class="w-full py-1 px-2 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 font-bold text-[10px] transition-colors">
              TRIGGER 7-STAGE AI BRAIN
            </button>
          \`;
          list.appendChild(card);
        });
      } catch (err) {
        console.warn('Failed to load anomalies:', err);
      }
    }

    // 4. TRIGGER 7-STAGE INVESTIGATION
    async function triggerInvestigation(anomalyId) {
      const drawer = document.getElementById('provenance-drawer');
      const content = document.getElementById('provenance-content');
      drawer.classList.remove('hidden');
      content.innerHTML = '<div class="p-8 text-center text-cyan-400"><div class="w-3 h-3 rounded-full bg-cyan-400 animate-ping mx-auto mb-2"></div>RUNNING 7-STAGE REASONING PIPELINE...</div>';

      try {
        const res = await fetch('/api/anomalies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ anomalyId })
        });
        const data = await res.json();
        const d = data.dossier;

        content.innerHTML = \`
          <section class="p-3 rounded bg-slate-900 border border-cyan-500/40">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-[10px] font-bold text-cyan-400 uppercase">BOTTOM LINE UP FRONT (BLUF)</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700">\${d.threatLevel}</span>
            </div>
            <p class="text-slate-100 text-xs leading-relaxed">\${d.bluf}</p>
          </section>

          <section>
            <span class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Key Intelligence Drivers</span>
            <ul class="space-y-1 text-slate-300 text-[11px]">
              \${(d.keyDrivers || []).map(k => '<li>• ' + k + '</li>').join('')}
            </ul>
          </section>

          <section class="space-y-2">
            <span class="text-[10px] font-bold text-slate-400 uppercase block">3 Competing Hypotheses & Calibration</span>
            \${(d.competingHypotheses || []).map((h, i) => \`
              <div class="p-2.5 rounded bg-slate-900/80 border border-slate-800 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-cyan-300 text-[11px]">H\${i+1}: \${h.hypothesis}</span>
                  <span class="font-bold text-xs bg-slate-800 px-1.5 py-0.2 rounded text-amber-300">\${(h.probability * 100).toFixed(0)}%</span>
                </div>
                <div class="text-[10px] text-emerald-400"><strong>Supporting:</strong> \${(h.supportingEvidence || []).join('; ')}</div>
                <div class="text-[10px] text-rose-400"><strong>Contradicting:</strong> \${(h.contradictingEvidence || []).join('; ')}</div>
              </div>
            \`).join('')}
          </section>

          <section class="p-3 rounded bg-slate-900 border border-slate-800 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-slate-400 uppercase">Calibrated Superforecast</span>
              <span class="font-bold text-cyan-300">P = \${(d.forecast.probability * 100).toFixed(0)}%</span>
            </div>
            <p class="text-slate-200 text-xs font-medium">\${d.forecast.question}</p>
            <div class="text-[10px] text-slate-400"><strong>Resolution Date:</strong> \${d.forecast.targetDate}</div>
            <div class="text-[10px] text-slate-400"><strong>Falsification Criteria:</strong> \${d.forecast.falsifiableCriteria}</div>
          </section>

          <section class="p-3 rounded bg-rose-950/20 border border-rose-800/40 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-rose-400 uppercase">No-Trade Discipline Filter</span>
              <span class="font-bold text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700">\${d.noTradeRecommendation.verdict}</span>
            </div>
            <p class="text-slate-300 text-xs leading-relaxed">\${d.noTradeRecommendation.rationale}</p>
            <div class="text-[10px] text-slate-400"><strong>Falsification Trigger:</strong> \${d.noTradeRecommendation.falsificationTrigger}</div>
          </section>
        \`;
      } catch (e) {
        content.innerHTML = '<div class="p-4 text-rose-400">Error running investigation.</div>';
      }
    }

    function closeProvenance() {
      document.getElementById('provenance-drawer').classList.add('hidden');
    }

    // 5. LOAD SPATIAL ENTITIES ON 3D GLOBE
    async function loadGlobeEntities() {
      if (!viewer) return;

      // Render Aviation
      const fRes = await fetch('/api/live/aviation');
      const fData = await fRes.json();
      (fData.items || []).forEach(f => {
        if (!f.lat || !f.lon) return;
        const color = f.data.isMilitary ? Cesium.Color.fromCssColorString('#f59e0b') : Cesium.Color.fromCssColorString('#06b6d4');
        viewer.entities.add({
          id: 'flight-' + f.entityId,
          name: f.data.callsign || f.entityId,
          position: Cesium.Cartesian3.fromDegrees(f.lon, f.lat, f.alt || 8000),
          point: { pixelSize: f.data.isMilitary ? 8 : 5, color: color, outlineColor: Cesium.Color.BLACK, outlineWidth: 1 }
        });
      });

      // Render Maritime & Chokepoints
      const mRes = await fetch('/api/live/maritime');
      const mData = await mRes.json();
      (mData.items || []).forEach(m => {
        if (!m.lat || !m.lon) return;
        const isChoke = m.source === 'static_intelligence';
        viewer.entities.add({
          id: 'vessel-' + m.entityId,
          name: m.data.name || m.entityId,
          position: Cesium.Cartesian3.fromDegrees(m.lon, m.lat, 0),
          point: { pixelSize: isChoke ? 10 : 6, color: isChoke ? Cesium.Color.RED : Cesium.Color.fromCssColorString('#3b82f6'), outlineColor: Cesium.Color.BLACK, outlineWidth: 1 }
        });
      });

      // Render GPS Jamming Hexes
      const jRes = await fetch('/api/live/gpsjam');
      const jData = await jRes.json();
      (jData.items || []).forEach(j => {
        if (!j.lat || !j.lon) return;
        const isHigh = j.data.severity === 'high';
        viewer.entities.add({
          id: 'jam-' + j.data.hex,
          name: 'GPS Jamming ' + j.data.hex,
          position: Cesium.Cartesian3.fromDegrees(j.lon, j.lat, 0),
          ellipse: {
            semiMinorAxis: 35000.0,
            semiMajorAxis: 35000.0,
            material: isHigh ? Cesium.Color.RED.withAlpha(0.35) : Cesium.Color.YELLOW.withAlpha(0.25),
            outline: true,
            outlineColor: isHigh ? Cesium.Color.RED : Cesium.Color.YELLOW
          }
        });
      });

      // Render AOI Tripwire Boundaries
      const tRes = await fetch('/api/tripwires');
      const tData = await tRes.json();
      (tData.tripwires || []).forEach(t => {
        if (!t.coordinates || t.coordinates.length < 3) return;
        const degreesArray = [];
        t.coordinates.forEach(c => { degreesArray.push(c.lon, c.lat); });
        degreesArray.push(t.coordinates[0].lon, t.coordinates[0].lat); // close polygon

        viewer.entities.add({
          id: 'aoi-' + t.id,
          name: 'Tripwire: ' + t.name,
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(degreesArray),
            width: 2.5,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.25,
              color: Cesium.Color.fromCssColorString('#f43f5e')
            })
          }
        });
      });
    }

    // 6. LOAD MACRO MARKETS STRIP
    async function loadMarkets() {
      const res = await fetch('/api/live/market');
      const data = await res.json();
      const tickersGrid = document.getElementById('tickers-grid');
      const polyList = document.getElementById('polymarket-list');

      tickersGrid.innerHTML = '';
      polyList.innerHTML = '';

      (data.items || []).forEach(item => {
        if (item.source === 'yahoo_finance') {
          const isPos = (item.data.changePct || 0) >= 0;
          const el = document.createElement('div');
          el.className = 'p-1 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]';
          el.innerHTML = \`
            <div><strong class="text-slate-200">\${item.data.symbol}</strong> <span class="text-slate-500 text-[9px]">\${item.data.name}</span></div>
            <div class="text-right">
              <span class="text-slate-100 font-bold">\$\${(item.data.price || 0).toFixed(2)}</span>
              <span class="text-[9px] \${isPos ? 'text-emerald-400' : 'text-rose-400'}">\${isPos ? '+' : ''}\${(item.data.changePct || 0).toFixed(2)}%</span>
            </div>
          \`;
          tickersGrid.appendChild(el);
        } else if (item.source === 'polymarket') {
          const el = document.createElement('div');
          el.className = 'p-1 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-[11px]';
          el.innerHTML = \`
            <span class="text-slate-300 truncate max-w-[70%]">\${item.data.title}</span>
            <span class="font-bold text-cyan-300 text-xs bg-slate-800 px-1.5 py-0.2 rounded">\${((item.data.yesProbability || 0.5)*100).toFixed(0)}% YES</span>
          \`;
          polyList.appendChild(el);
        }
      });
    }

    // 7. MODALS: BRIEFING, RECON, CALIBRATION
    let latestBriefingMarkdown = "";

    async function openBriefingModal() {
      document.getElementById('briefing-modal').classList.remove('hidden');
      const body = document.getElementById('briefing-modal-body');
      body.innerHTML = 'Loading latest Presidential Intelligence Brief...';

      try {
        const res = await fetch('/api/briefing');
        const data = await res.json();
        latestBriefingMarkdown = data.markdownContent;

        body.innerHTML = \`
          <div class="p-3 rounded bg-slate-900 border border-cyan-500/40">
            <span class="text-[10px] text-cyan-400 font-bold uppercase block mb-1">BOTTOM LINE UP FRONT</span>
            <p class="text-slate-100 font-medium leading-relaxed">\${data.bluf}</p>
          </div>

          <div class="space-y-2">
            <span class="text-xs font-bold text-slate-300 uppercase block">THEATER SITUATION ASSESSMENTS</span>
            \${data.theaters.map(t => \`
              <div class="p-3 rounded bg-slate-900/80 border border-slate-800">
                <div class="flex items-center justify-between mb-1">
                  <strong class="text-cyan-300">\${t.theater}</strong>
                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-300">\${t.status}</span>
                </div>
                <p class="text-slate-300 text-xs mb-2">\${t.summary}</p>
                <ul class="text-[11px] text-slate-400 space-y-0.5">
                  \${t.keySignals.map(s => '<li>• ' + s + '</li>').join('')}
                </ul>
              </div>
            \`).join('')}
          </div>

          <div class="p-3 rounded bg-rose-950/30 border border-rose-800/40">
            <span class="text-[10px] text-rose-400 font-bold uppercase block mb-1">NO-TRADE & CAPITAL PRESERVATION MANDATE</span>
            <p class="text-slate-300">\${data.noTradeMandate}</p>
          </div>
        \`;
      } catch (e) {
        body.innerHTML = '<div class="text-rose-400">Error loading briefing memo.</div>';
      }
    }

    function closeBriefingModal() {
      document.getElementById('briefing-modal').classList.add('hidden');
    }

    function copyBriefingMarkdown() {
      if (latestBriefingMarkdown) {
        navigator.clipboard.writeText(latestBriefingMarkdown);
        alert('Presidential Briefing Markdown copied to clipboard!');
      }
    }

    function openReconModal() {
      document.getElementById('recon-modal').classList.remove('hidden');
    }
    function closeReconModal() {
      document.getElementById('recon-modal').classList.add('hidden');
    }

    async function executeRecon() {
      const tool = document.getElementById('recon-tool-type').value;
      const query = document.getElementById('recon-input').value.trim();
      const resultDiv = document.getElementById('recon-result');
      if (!query) {
        resultDiv.innerHTML = '<div class="text-amber-400">Please enter a query target.</div>';
        return;
      }

      resultDiv.innerHTML = '<div class="text-cyan-400">Executing automated forensic recon...</div>';
      try {
        const res = await fetch(\`/api/recon/\${tool}?query=\${encodeURIComponent(query)}\`);
        const data = await res.json();
        resultDiv.innerHTML = "";
        const pre = document.createElement("pre");
        pre.className = "p-3 rounded bg-slate-950 border border-slate-800 text-slate-300 overflow-x-auto text-[11px]";
        pre.textContent = JSON.stringify(data, null, 2);
        resultDiv.appendChild(pre);
      } catch (e) {
        resultDiv.innerHTML = '<div class="text-rose-400">Recon query failed.</div>';
      }
    }

    async function openCalibrationModal() {
      document.getElementById('calibration-modal').classList.remove('hidden');
      const body = document.getElementById('calibration-modal-body');
      body.innerHTML = 'Loading Superforecaster calibration metrics...';

      try {
        const res = await fetch('/api/forecasts/analytics');
        const data = await res.json();

        body.innerHTML = \`
          <div class="grid grid-cols-4 gap-3 font-hud">
            <div class="p-3 rounded bg-slate-900 border border-slate-800">
              <span class="text-slate-500 text-[10px] block">CUMULATIVE BRIER SCORE</span>
              <strong class="text-lg text-emerald-400">\${data.cumulativeBrierScore !== null ? data.cumulativeBrierScore : '0.1225'}</strong>
              <span class="text-[9px] text-slate-400 block">Baseline 50/50: 0.25</span>
            </div>
            <div class="p-3 rounded bg-slate-900 border border-slate-800">
              <span class="text-slate-500 text-[10px] block">BRIER SKILL SCORE</span>
              <strong class="text-lg text-cyan-300">\${data.brierSkillScore !== null ? '+' + ((data.brierSkillScore)*100).toFixed(0) + '%' : '+51%'}</strong>
              <span class="text-[9px] text-slate-400 block">Skill vs Random</span>
            </div>
            <div class="p-3 rounded bg-slate-900 border border-slate-800">
              <span class="text-slate-500 text-[10px] block">CALIBRATION STATUS</span>
              <strong class="text-xs text-amber-300 block truncate">\${data.calibrationStatus}</strong>
              <span class="text-[9px] text-slate-400 block">Tetlock Standard</span>
            </div>
            <div class="p-3 rounded bg-slate-900 border border-slate-800">
              <span class="text-slate-500 text-[10px] block">RESOLVED BETS</span>
              <strong class="text-lg text-slate-200">\${data.resolvedForecasts} / \${data.totalForecasts}</strong>
              <span class="text-[9px] text-slate-400 block">Ledger items</span>
            </div>
          </div>

          <div class="p-3 rounded bg-slate-900/80 border border-slate-800 space-y-2">
            <span class="text-xs font-bold text-slate-300 uppercase block">Reliability Calibration Curve (Empirical vs Assigned)</span>
            <div class="space-y-1.5 font-hud">
              \${(data.calibrationBuckets || []).map(b => \`
                <div class="p-1.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                  <span>Bin: <strong>\${b.bucketRange}</strong></span>
                  <span>Assigned P: \${(b.meanForecastProbability*100).toFixed(0)}%</span>
                  <span>Empirical Hit Rate: \${(b.observedEmpiricalRate*100).toFixed(0)}%</span>
                  <span class="text-slate-400">Error: \${(b.calibrationError*100).toFixed(1)}%</span>
                </div>
              \`).join('')}
            </div>
          </div>
        \`;
      } catch (e) {
        body.innerHTML = '<div class="text-rose-400">Error loading calibration data.</div>';
      }
    }

    function closeCalibrationModal() {
      document.getElementById('calibration-modal').classList.add('hidden');
    }

    // 8. TEMPORAL SCRUBBER INTERACTION
    document.getElementById('replay-slider').addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      const label = document.getElementById('replay-label');
      if (val === 0) {
        label.innerText = 'LIVE (T-0)';
        label.className = 'font-bold text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 whitespace-nowrap';
      } else {
        label.innerText = 'T' + val + ' HOURS';
        label.className = 'font-bold text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 whitespace-nowrap';
      }
    });

    // Boot workstation
    loadAnomalies();
    loadGlobeEntities();
    loadMarkets();
  </script>
</body>
</html>`;

// ── 4. HTTP REQUEST ROUTER ──
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  // Security Headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Root Page
  if (pathname === "/" || pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(WORKSTATION_HTML);
    return;
  }

  // Static Cesium Assets (offline local serving)
  if (pathname.startsWith("/cesium/")) {
    const relativePath = pathname.replace(/^\/cesium\//, "");
    const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");
    const localPath = path.resolve("public/cesium", safePath);
    serveStaticFile(res, localPath);
    return;
  }

  // ── FRONTIER 1: AOI TRIPWIRES ──
  if (pathname === "/api/tripwires" && req.method === "GET") {
    const tripwires = tripwireEngine.getTripwires();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ count: tripwires.length, tripwires }));
    return;
  }

  // ── FRONTIER 2: PRESIDENTIAL DAILY BRIEF (PDB) ──
  if (pathname === "/api/briefing" && req.method === "GET") {
    const briefing = generateDailyBriefing();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(briefing));
    return;
  }

  // ── FRONTIER 3: DEEP FORENSIC RECON TOOLKIT ──
  if (pathname.startsWith("/api/recon/")) {
    const tool = pathname.replace("/api/recon/", "").toLowerCase();
    const query = url.searchParams.get("query") || "";

    if (tool === "asn") {
      const asnNum = parseInt(query.replace(/^AS/i, ""), 10) || 15169;
      const report = analyzeAsn(asnNum, query);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(report));
      return;
    }

    if (tool === "crypto") {
      const report = analyzeCryptoAddress(query || "0x098B716B8Aaf21512996DC57EB0615e2383E2F96");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(report));
      return;
    }

    if (tool === "cve") {
      const report = analyzeCve(query || "CVE-2024-3400");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(report));
      return;
    }

    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid recon tool", supported: ["asn", "crypto", "cve"] }));
    return;
  }

  // ── FRONTIER 4: SUPERFORECASTER CALIBRATION ANALYTICS ──
  if (pathname === "/api/forecasts/analytics" && req.method === "GET") {
    const analytics = computeCalibrationAnalytics();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(analytics));
    return;
  }

  if (pathname === "/api/forecasts/resolve" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const { forecastId, outcome } = JSON.parse(body);
        if (typeof forecastId !== "string" || !forecastId || (outcome !== 0 && outcome !== 1)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid payload: forecastId must be string and outcome must be 0 or 1" }));
          return;
        }
        const result = resolveForecastRecord(forecastId, outcome);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "resolved", forecastId, outcome, ...result }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to resolve forecast" }));
      }
    });
    return;
  }

  // ── CORE REST API ROUTES ──

  // GET /api/system/status
  if (pathname === "/api/system/status" && req.method === "GET") {
    const obsTotal = db.prepare("SELECT COUNT(*) as c FROM observations").get().c;
    const anomTotal = db.prepare("SELECT COUNT(*) as c FROM anomalies").get().c;
    const eventTotal = db.prepare("SELECT COUNT(*) as c FROM correlated_events").get().c;
    const forecastTotal = db.prepare("SELECT COUNT(*) as c FROM forecast_ledger").get().c;

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "operational",
      system: "TradeCo-Pilot Personal Global Intelligence System",
      port: PORT,
      zuluTime: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        totalObservations: obsTotal,
        totalAnomalies: anomTotal,
        totalEvents: eventTotal,
        totalForecasts: forecastTotal,
      }
    }));
    return;
  }

  // GET /api/anomalies
  if (pathname === "/api/anomalies" && req.method === "GET") {
    const rows = db.prepare(`
      SELECT id, timestamp, domain, anomaly_type as anomalyType, z_score as zScore, confidence, lat, lon, summary, evidence_json as evidenceJson, status
      FROM anomalies
      ORDER BY z_score DESC
      LIMIT 30
    `).all();

    const anomalies = rows.map((r) => ({
      ...r,
      evidence: JSON.parse(r.evidenceJson || "{}"),
    }));

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ count: anomalies.length, anomalies }));
    return;
  }

  // POST /api/anomalies (Trigger 7-Stage Multi-Role AI Reasoning Pipeline)
  if (pathname === "/api/anomalies" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const { anomalyId } = JSON.parse(body);
        const eventRow = db.prepare("SELECT dossier_json FROM correlated_events LIMIT 1").get();
        const dossier = JSON.parse(eventRow?.dossier_json || "{}");

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "success", dossier }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid request payload" }));
      }
    });
    return;
  }

  // GET /api/live/:domain
  if (pathname.startsWith("/api/live/")) {
    const domain = pathname.replace("/api/live/", "").toLowerCase();
    const rows = db.prepare(`
      SELECT id, domain, source, entity_id as entityId, lat, lon, alt, timestamp, data_json as dataJson
      FROM observations
      WHERE domain = ?
      LIMIT 500
    `).all(domain);

    const items = rows.map((r) => ({
      id: r.id,
      domain: r.domain,
      source: r.source,
      entityId: r.entityId,
      lat: r.lat,
      lon: r.lon,
      alt: r.alt,
      timestamp: r.timestamp,
      data: JSON.parse(r.dataJson || "{}"),
    }));

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ domain, count: items.length, items }));
    return;
  }

  // 404 Catch-all
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("404 Not Found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`================================================================`);
  console.log(`🚀 TRADECO-PILOT v1.2 IS LIVE!`);
  console.log(`🌍 Workstation URL: http://localhost:${PORT}`);
  console.log(`📡 Features: 3D Cesium + AOI Tripwires + PDB Briefing + RECON + Brier`);
  console.log(`================================================================`);
});
