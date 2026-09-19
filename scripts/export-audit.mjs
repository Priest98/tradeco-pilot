import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.cwd().replaceAll('\\','/');
const cite=(file,needle)=>{const lines=fs.readFileSync(file,'utf8').split(/\r?\n/);const index=lines.findIndex(line=>line.includes(needle));if(index<0)throw new Error('Missing citation '+file+':'+needle);return `[${file}:${index+1}](${root}/${file}:${index+1})`;};
const report=`# TradeCo-Pilot: security, architecture and quantitative audit

## Part 1: Executive scorecard

**Security rating: 🟠 NEEDS WORK. Initial state: 🔴 CRITICAL.** Local source changes address concrete security and integrity defects, but this is not a production certification. No deployment, production mutation, account provisioning, or live trading was performed.

Scope: application-owned files in src/, original public/ assets, tests/, and root configuration. Generated Cesium assets are reproduced from the installed package; dependency code, ignored reference repositories, secret values, and complete Git history are outside manual source review. The supplied mission names four audit vectors despite saying six; all listed checks and all six upgrades are covered below.

### Security

| Check | Initial | Current | Evidence and limits |
|---|---|---|---|
| A1. Secret hygiene | ❌ FAIL | ✅ PASS (source scope) | Removed deterministic production/development fallback keys. Missing keys cannot authorize mutations. Environment files are ignored; only .env.example was tracked. ${cite('src/config/env.ts','SYSTEM_API_KEY: process.env')}; ${cite('.gitignore','.env*')} |
| A2. Timing-safe authentication | ❌ FAIL | ✅ PASS | SHA-256 produces equal-length buffers passed to node:crypto timingSafeEqual. Middleware and cron use this helper and fail closed. ${cite('src/server/security/auth.ts','timingSafeEqual')}; ${cite('src/middleware.ts','verifySystemKey(key')} |
| A3. SSRF and DNS rebinding | ❌ FAIL | ⚠️ PARTIAL | HTTP connections now use validated, pinned DNS answers; redirects are revalidated and cross-origin authorization/cookies removed. Private, loopback, link-local, CGNAT and metadata addresses are blocked. AIS has pinned DNS too. Fixed-host LLM SDK requests remain SDK-managed. Full adversarial network/redirect testing is not complete. ${cite('src/server/security/ssrfGuard.ts','new Agent')}; ${cite('src/server/ingestors/maritime.ts','validateHost("stream')} |
| A4. Prompt boundaries | ⚠️ PARTIAL | ⚠️ PARTIAL | XML metacharacters escaped, labels constrained, input bounded; model output validated with Zod. Delimiters do not guarantee immunity to semantic prompt injection. Deterministic no-trade gate is outside model control. ${cite('src/server/intelligence/promptDefense.ts','const safeData')}; ${cite('src/server/intelligence/pipelineEngine.ts','const schema')} |
| A5. DOM/XSS | ❌ FAIL | ✅ PASS (application sinks) | Removed the standalone interpolated-innerHTML UI by routing the workstation through React/Next. Application source has no innerHTML/dangerouslySetInnerHTML sinks. Vendor DOM internals are excluded from this assertion. ${cite('server.mjs','getRequestHandler')} |
| A6. Error leaks | ❌ FAIL | ✅ PASS (reviewed APIs) | Client-facing failures use generic messages; status redacts ingestor lastError. ${cite('src/app/api/anomalies/route.ts','Pipeline execution failed')}; ${cite('src/app/api/system/status/route.ts','Feed unavailable')} |
| Authentication surface | ❌ FAIL | ⚠️ PARTIAL | Mutations are protected; listed telemetry, replay and brief GET endpoints are intentionally public. For a private deployment, remove that allowlist and supply a proper session layer. ${cite('src/middleware.ts','const publicReads')} |
| Rate limiting | ❌ FAIL | ⚠️ PARTIAL | Atomic SQLite fixed-window quotas and Retry-After are wired into middleware; failure denies requests. The quota is global per database and is not distributed across serverless instances. ${cite('src/server/security/rateLimiter.ts','ON CONFLICT')}; ${cite('src/middleware.ts','const quota')} |

### Database and concurrency

| Check | Initial | Current | Evidence and limits |
|---|---|---|---|
| B1. WAL, locking and transactions | ⚠️ PARTIAL | ⚠️ PARTIAL | WAL, foreign keys, 5-second busy timeout, BEGIN IMMEDIATE for ingest/anomalies and atomic dossier/forecast writes. Synchronous SQLite can still block the event loop; sustained multiprocess contention was not load-tested. Legacy tripwire transaction error recovery needs further work. ${cite('src/server/db/client.ts','PRAGMA busy_timeout')}; ${cite('src/server/ingestors/base.ts','BEGIN IMMEDIATE')}; ${cite('src/server/intelligence/pipelineEngine.ts','BEGIN IMMEDIATE')} |
| B2. Serverless durability | ❌ FAIL | ❌ FAIL (architectural limit) | /tmp survives neither replacement nor cross-instance routing. Durable 72-hour replay, 30-day history, forecast scoring and daily briefs cannot be guaranteed on Vercel with this local database. Status now exposes ephemeral_instance_local. ${cite('src/server/db/client.ts','isServerless')}; ${cite('src/app/api/system/status/route.ts','durability:')} |
| B3. Query indexes | ⚠️ PARTIAL | ✅ PASS (tested plans) | Domain/time, active-anomaly ordering and forecast outcome plans are checked using EXPLAIN QUERY PLAN; added global timestamp and status/Z/time indexes. ${cite('src/server/db/schema.sql','idx_obs_domain_time')}; ${cite('src/server/db/schema.sql','idx_anomalies_status_z')}; ${cite('tests/upgrade.test.ts','selects indexed plans')} |
| Historical integrity | ❌ FAIL | ⚠️ PARTIAL | Observation keys now preserve timestamped samples, and automatic fabricated intelligence seeding is removed. Existing operational database rows were deliberately not deleted or rewritten; previously seeded/demo rows may still require operator review. ${cite('src/server/ingestors/base.ts','obs.id}@')}; ${cite('src/server/db/client.ts','dbInstance = db')} |

For cloud persistence, use a remote authoritative store and asynchronous repositories throughout the request path. Turso/libSQL is a relatively direct SQL migration, but requires replacing DatabaseSync calls and reviewing transaction behavior. A managed PostgreSQL service is another option, with schema, JSON-query and migration changes. Neither is a drop-in promise wrapper around synchronous SQLite. Keep local SQLite for an offline workstation, explicitly label replication lag, back up before migration, and verify historical counts and forecast outcomes after import. Vercel documents the permanent-storage limitation in [its SQLite guidance](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel); see [Turso TypeScript reference](https://docs.turso.tech/sdk/ts/reference) for remote-client semantics. No provider account or database was created.

### Cesium and quantitative rigor

| Check | Initial | Current | Evidence and limits |
|---|---|---|---|
| C1. Lifecycle and pruning | ❌ FAIL | ✅ PASS (source lifecycle) | Viewer, input handler, event subscriptions and animation frames are disposed; stale marker collections are rebuilt only when samples/layers change. ${cite('src/components/globe/CesiumGlobe.tsx','cleanup =')}; ${cite('src/components/globe/CesiumGlobe.tsx','cancelAnimationFrame')} |
| C2. Asset/network resilience | ❌ FAIL | ⚠️ PARTIAL | Same-version local browser runtime/workers/CSS avoid CDN version drift and a verified Next/Cesium minifier failure. Tile failures are shown; context loss leaves controls available but requires reload. Full network-loss/429/context-restoration testing remains outstanding. ${cite('src/lib/cesium.ts','script.src')}; ${cite('src/components/globe/CesiumGlobe.tsx','webglcontextlost')} |
| C3. Marker batching | ⚠️ PARTIAL | ✅ PASS (implementation) | One PointPrimitiveCollection replaces per-entity labels/ellipses. No measured production FPS target is claimed. GPS jamming currently uses point markers rather than geographic H3 coverage polygons. ${cite('src/components/globe/CesiumGlobe.tsx','PointPrimitiveCollection')} |
| D1. 30-day baselines | ❌ FAIL | ⚠️ PARTIAL | Hardcoded severity values are overwritten by sample-variance baselines drawn from recorded prior data. Missing/constant history yields no statistical Z (legacy numeric storage uses 0 with evidence status). Hourly observed-count baselines and snapshot cluster counts still need cohort/coverage normalization and backtesting before scientific use. Emergency/co-occurrence rules are not statistical Z-scores. ${cite('src/server/intelligence/baseline.ts','calculateBaseline')}; ${cite('src/server/intelligence/anomalyEngine.ts','Historical comparison')} |
| D2. Brier and buckets | ⚠️ PARTIAL | ⚠️ PARTIAL | Recomputes (P-O)^2, validates binary resolutions, includes p=0 and p=1 in reliability bins. Formula/boundaries tested. Existing elite labels and the 0.25 reference are heuristics, not proof of calibration; small samples and a climatology benchmark need separate analysis. ${cite('src/server/intelligence/calibrationAnalytics.ts','const itemScore')}; ${cite('tests/upgrade.test.ts','recomputes Brier')} |
| D3. No-trade gate | ❌ FAIL | ✅ PASS | The application overrides model verdicts to DO_NOTHING. Fewer than two nearby domains/sources explicitly fails corroboration; even corroboration alone does not authorize a hedge. ${cite('src/server/intelligence/pipelineEngine.ts','dossier.noTradeRecommendation =')} |

### Upgrade delivery matrix

| Upgrade | Status | Delivered behavior / remaining limitation |
|---|---|---|
| 1. Zustand | ✅ Implemented | Central anomalies, telemetry, markets, selections, replay clock/speed and shared polling with cancellation. ${cite('src/store/intelligenceStore.ts','create<IntelligenceState>')} |
| 2. Market intelligence | ⚠️ Partial | Yahoo quotes, annualized daily-return volatility, LMT/RTX minus SPY spread, descriptive history-based associations, validated Polymarket YES token book/depth. Uses crude futures, not a licensed spot-crude series; causal risk premiums and statistical validation are not established. Contract discovery is bounded, not exhaustive. ${cite('src/server/ingestors/markets.ts','fitTransmission')}; ${cite('src/server/ingestors/markets.ts','clob.polymarket.com/book')} |
| 3. Tactical audio | ✅ Implemented | Opt-in Web Audio chirp for new Z>3 anomalies, squawk 7600/7700 alert and dossier ping, with mute and cooldown. Audible hardware output requires operator confirmation. ${cite('src/lib/audioFX.ts','playAlert')} |
| 4. Replay | ✅ Implemented (local history required) | SQLite 60-minute windows across 72-hour selector, watermark, 1x/5x/20x, timestamped samples and short-gap interpolation with dateline handling. Selected window stops after 60 minutes; missing history stays empty. Responses are capped at 10,000 records. ${cite('src/app/api/replay/route.ts','queryObservations')}; ${cite('src/lib/replay.ts','positionAt')} |
| 5. PDB | ✅ Implemented locally / ⚠️ cloud durability | Past-24-hour database facts, explicit unavailable data, Markdown/PDF downloads, idempotent daily records at 06:00 UTC. Vercel route requires CRON_SECRET; deployment/cron activation was not performed. ${cite('src/server/intelligence/briefingGenerator.ts','generateDailyBriefing')}; ${cite('src/server/intelligence/briefingSchedule.ts','INSERT OR IGNORE')}; ${cite('vercel.json','crons')} |
| 6. Strict types | ✅ Compiler / ⚠️ external payload validation | Explicit any types removed from application source; strict compiler and production build checked. Some legacy upstream JSON boundaries still rely on structural assumptions; strict TypeScript alone does not validate network JSON. Node emits its documented experimental SQLite runtime warning. |

### Vulnerability cards

> **HIGH — Authentication bypass / fallback credentials (fixed)**  
> **Location:** ${cite('src/middleware.ts','if (!publicRead)')}, ${cite('src/config/env.ts','SYSTEM_API_KEY: process.env')}  
> **CWE:** CWE-306, CWE-798, CWE-208.  
> **Finding:** Unconfigured keys allowed protected requests, and environment parsing supplied predictable defaults.  
> **Fix:** Fail-closed mutation gate and fixed-size digest comparison. Existing deployed credentials were not rotated.

> **HIGH — External/LLM text injected into HTML (fixed application sinks)**  
> **Location:** ${cite('server.mjs','getRequestHandler')}  
> **CWE:** CWE-79.  
> **Finding:** The previous standalone HTML interpolated observation and model content into innerHTML.  
> **Fix:** One Next/React rendering path; preserve legacy API equivalents. The old standalone dashboard layout is replaced by the unified workstation.

> **HIGH — DNS validation/connection race (hardened; network regression coverage partial)**  
> **Location:** ${cite('src/server/security/ssrfGuard.ts','new Agent')}  
> **CWE:** CWE-918, CWE-367.  
> **Finding:** Validation and fetch previously resolved DNS independently.  
> **Fix:** Pin the validated address while preserving hostname/TLS verification, validate redirects, bound response bodies.

> **HIGH — Fabricated intelligence and unsupported statistical authority (partly fixed)**  
> **Location:** ${cite('src/server/db/client.ts','dbInstance = db')}, ${cite('src/server/intelligence/briefingGenerator.ts','generateDailyBriefing')}, ${cite('src/server/intelligence/anomalyEngine.ts','Historical comparison')}  
> **CWE:** No single precise CWE; data-integrity/model-validity defect.  
> **Finding:** Fresh databases and briefings presented invented military activity, prices, forecasts and heuristic Z-scores as current evidence.  
> **Fix:** Remove automatic seeds/static brief claims; disclose absent baselines and offline AI. Remaining baseline comparability and pre-existing rows require review.

> **HIGH — Serverless state loss (open)**  
> **Location:** ${cite('src/server/db/client.ts','isServerless')}  
> **CWE:** Architecture/durability gap; not assigned a misleading CWE.  
> **Fix required:** Durable authoritative database plus asynchronous repository migration and backup/restore testing before relying on cloud history.

> **MEDIUM — Static forensic reference maps (open)**  
> **Location:** ${cite('src/server/recon/crypto.ts','OFAC_SANCTIONED_WALLETS')}, ${cite('src/server/recon/asn.ts','HIGH_RISK_ASNS')}, ${cite('src/server/recon/cve.ts','NOTABLE_KEVS')}  
> **CWE:** Data freshness/provenance gap.  
> **Finding:** These hardcoded snapshots cannot establish current sanctions, routing ownership or exploitation status; an unmatched record is not proof of safety.  
> **Containment:** Restored recon endpoint wraps results with an explicit static-snapshot notice. Replace with timestamped authoritative feeds before operational decisions.

## Part 2: Complete implementations

All modified and added application/config/test files are provided in **IMPLEMENTATIONS.md**, as complete file bodies, without omitted-code placeholders. The working tree is the primary implementation. Generated vendor assets are reproduced by the predev/prebuild copy script. package-lock.json pins the resolved dependency tree. Local secrets, databases, node_modules, .next and ignored reference repositories are not included in the code bundle.

Key operational changes: server.mjs now starts the shared Next application on 127.0.0.1:3030; it no longer serves a second unsafe dashboard. Existing briefing, recon, tripwire and forecast analytics/resolve API equivalents exist in src/app/api. Set a strong SYSTEM_API_KEY for mutation access and a separate CRON_SECRET for scheduled cloud generation. The header key entry is held in sessionStorage for that tab. No live Vercel deployment was changed.

## Part 3: Verification and production acceptance

Run from the repository root with a Node runtime supporting node:sqlite:

~~~powershell
npm ci --include=dev
npm run typecheck
npm run test:unit
npm test
npm run build
npm start -- --hostname 127.0.0.1 --port 3030
# Alternatively, the local shared-server entrypoint:
npm run workstation
~~~

Unit tests use temporary databases and do not require upstream credentials. The old live_ingestor_test.mjs and end_to_end_intelligence_flow.mjs are legacy examples, are not in npm test's glob, and do not establish real end-to-end coverage. In particular, the former uses raw fetch despite claiming SSRF protection.

Production acceptance checklist:

1. Seed controlled historical samples only in a nonproduction database. Select T-12h; verify requests to /api/replay with a one-hour half-open window, historical watermark, advancing 1x/5x/20x clock, interpolated positions and removal when layers are disabled. Test a missing window and >10,000-row truncation explicitly.
2. Unmute using an operator gesture. Inject a new Z>3 anomaly and 7600/7700 observations in a test feed. Check deduplication, audible chirp/squawk, mute suppression, and dossier ping after a successful authenticated investigation. Human listening is still needed for hardware-volume verification.
3. Export both formats. Compare briefing evidence IDs and 24-hour boundaries, inspect PDF pages for clipping, and confirm no stale fixed military or pricing claims.
4. Verify missing/wrong mutation keys return 401, malformed input fails, SQL errors stay generic, and quotas return 429 plus Retry-After. Use an isolated deployment for load tests; do not exhaust production's shared quota. Confirm cold-start behavior separately because SQLite quotas do not span instances.
5. Exercise basemap offline/429 behavior and WebGL context loss on a real supported GPU. Confirm controls remain usable and document reload recovery. Benchmark representative entity counts rather than infer FPS from the primitive API.
6. Configure CRON_SECRET before deployment, confirm 06:00 UTC scheduling and one persisted briefing per UTC date, and test durable storage across replacements before cloud acceptance.
7. Validate actual upstream contracts, timestamps, rate limits and keys. No absence of results should be interpreted as an absence of geopolitical activity. Polymarket's [order-book API](https://docs.polymarket.com/api-reference/market-data/get-order-book) is read-only and token-specific; this system does not submit orders.

Detailed run outcomes and browser evidence are recorded separately in VERIFICATION.md. Passing the build is not treated as proof that WebGL or upstream data works.
`;
fs.writeFileSync('docs/AUDIT.md',report);
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(f=>f.startsWith('src/')||f.startsWith('tests/')||f.startsWith('public/')||(!f.includes('/')&&!f.startsWith('.env')&&f!=='package-lock.json'));
const inventory=files.filter(f=>fs.existsSync(f)).map(f=>{const bytes=fs.readFileSync(f);return `| ${f} | ${bytes.length} | ${createHash('sha256').update(bytes).digest('hex')} |`;});
fs.writeFileSync('docs/INVENTORY.md','# Audit file inventory\n\nOriginal application/public/test files and root configuration. Generated vendor assets are excluded. Hashes identify the reviewed snapshot; they are not a security certification.\n\n| File | Bytes | SHA-256 |\n|---|---:|---|\n'+inventory.join('\n')+'\n');
const changed=execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split(/\r?\n/);
const added=execFileSync('git',['ls-files','--others','--exclude-standard'],{encoding:'utf8'}).trim().split(/\r?\n/);
const codeFiles=[...new Set([...changed,...added])].filter(f=>f && fs.existsSync(f) && !f.startsWith('docs/')&&!f.startsWith('output/')&&!f.startsWith('.env') && !f.endsWith('.png') && !f.endsWith('.pdf')).sort();
fs.writeFileSync('docs/IMPLEMENTATIONS.md','# Complete implementation files\n\nThese are full working-tree files. Copy each body to the indicated repository-relative path.\n\n'+codeFiles.map(f=>`## ${f}\n\n~~~~${path.extname(f).slice(1)}\n${fs.readFileSync(f,'utf8')}\n~~~~\n`).join('\n'));
console.log(JSON.stringify({inventoryFiles:inventory.length,implementationFiles:codeFiles.length}));
