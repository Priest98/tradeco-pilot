# TradeCo-Pilot: security, architecture and quantitative audit

## Part 1: Executive scorecard

**Security rating: 🟠 NEEDS WORK. Initial state: 🔴 CRITICAL.** Local source changes address concrete security and integrity defects, but this is not a production certification. No deployment, production mutation, account provisioning, or live trading was performed.

Scope: application-owned files in src/, original public/ assets, tests/, and root configuration. Generated Cesium assets are reproduced from the installed package; dependency code, ignored reference repositories, secret values, and complete Git history are outside manual source review. The supplied mission names four audit vectors despite saying six; all listed checks and all six upgrades are covered below.

### Security

| Check | Initial | Current | Evidence and limits |
|---|---|---|---|
| A1. Secret hygiene | ❌ FAIL | ✅ PASS (source scope) | Removed deterministic production/development fallback keys. Missing keys cannot authorize mutations. Environment files are ignored; only .env.example was tracked. [src/config/env.ts:45](C:/Users/LENOVO/Desktop/OSIRIS/src/config/env.ts:45); [.gitignore:28](C:/Users/LENOVO/Desktop/OSIRIS/.gitignore:28) |
| A2. Timing-safe authentication | ❌ FAIL | ✅ PASS | SHA-256 produces equal-length buffers passed to node:crypto timingSafeEqual. Middleware and cron use this helper and fail closed. [src/server/security/auth.ts:1](C:/Users/LENOVO/Desktop/OSIRIS/src/server/security/auth.ts:1); [src/middleware.ts:10](C:/Users/LENOVO/Desktop/OSIRIS/src/middleware.ts:10) |
| A3. SSRF and DNS rebinding | ❌ FAIL | ⚠️ PARTIAL | HTTP connections now use validated, pinned DNS answers; redirects are revalidated and cross-origin authorization/cookies removed. Private, loopback, link-local, CGNAT and metadata addresses are blocked. AIS has pinned DNS too. Fixed-host LLM SDK requests remain SDK-managed. Full adversarial network/redirect testing is not complete. [src/server/security/ssrfGuard.ts:208](C:/Users/LENOVO/Desktop/OSIRIS/src/server/security/ssrfGuard.ts:208); [src/server/ingestors/maritime.ts:100](C:/Users/LENOVO/Desktop/OSIRIS/src/server/ingestors/maritime.ts:100) |
| A4. Prompt boundaries | ⚠️ PARTIAL | ⚠️ PARTIAL | XML metacharacters escaped, labels constrained, input bounded; model output validated with Zod. Delimiters do not guarantee immunity to semantic prompt injection. Deterministic no-trade gate is outside model control. [src/server/intelligence/promptDefense.ts:29](C:/Users/LENOVO/Desktop/OSIRIS/src/server/intelligence/promptDefense.ts:29); [src/server/intelligence/pipelineEngine.ts:134](C:/Users/LENOVO/Desktop/OSIRIS/src/server/intelligence/pipelineEngine.ts:134) |
| A5. DOM/XSS | ❌ FAIL | ✅ PASS (application sinks) | Removed the standalone interpolated-innerHTML UI by routing the workstation through React/Next. Application source has no innerHTML/dangerouslySetInnerHTML sinks. Vendor DOM internals are excluded from this assertion. [server.mjs:6](C:/Users/LENOVO/Desktop/OSIRIS/server.mjs:6) |
| A6. Error leaks | ❌ FAIL | ✅ PASS (reviewed APIs) | Client-facing failures use generic messages; status redacts ingestor lastError. [src/app/api/anomalies/route.ts:83](C:/Users/LENOVO/Desktop/OSIRIS/src/app/api/anomalies/route.ts:83); [src/app/api/system/status/route.ts:9](C:/Users/LENOVO/Desktop/OSIRIS/src/app/api/system/status/route.ts:9) |
| Authentication surface | ❌ FAIL | ⚠️ PARTIAL | Mutations are protected; listed telemetry, replay and brief GET endpoints are intentionally public. For a private deployment, remove that allowlist and supply a proper session layer. [src/middleware.ts:4](C:/Users/LENOVO/Desktop/OSIRIS/src/middleware.ts:4) |
| Rate limiting | ❌ FAIL | ⚠️ PARTIAL | Atomic SQLite fixed-window quotas and Retry-After are wired into middleware; failure denies requests. The quota is global per database and is not distributed across serverless instances. [src/server/security/rateLimiter.ts:8](C:/Users/LENOVO/Desktop/OSIRIS/src/server/security/rateLimiter.ts:8); [src/middleware.ts:12](C:/Users/LENOVO/Desktop/OSIRIS/src/middleware.ts:12) |

### Database and concurrency

| Check | Initial | Current | Evidence and limits |
|---|---|---|---|
| B1. WAL, locking and transactions | ⚠️ PARTIAL | ⚠️ PARTIAL | WAL, foreign keys, 5-second busy timeout, BEGIN IMMEDIATE for ingest/anomalies and atomic dossier/forecast writes. Synchronous SQLite can still block the event loop; sustained multiprocess contention was not load-tested. Legacy tripwire transaction error recovery needs further work. [src/server/db/client.ts:28](C:/Users/LENOVO/Desktop/OSIRIS/src/server/db/client.ts:28); [src/server/ingestors/base.ts:107](C:/Users/LENOVO/Desktop/OSIRIS/src/server/ingestors/base.ts:107); [src/server/intelligence/pipelineEngine.ts:216](C:/Users/LENOVO/Desktop/OSIRIS/src/server/intelligence/pipelineEngine.ts:216) |
| B2. Serverless durability | ❌ FAIL | ❌ FAIL (architectural limit) | /tmp survives neither replacement nor cross-instance routing. Durable 72-hour replay, 30-day history, forecast scoring and daily briefs cannot be guaranteed on Vercel with this local database. Status now exposes ephemeral_instance_local. [src/server/db/client.ts:7](C:/Users/LENOVO/Desktop/OSIRIS/src/server/db/client.ts:7); [src/app/api/system/status/route.ts:41](C:/Users/LENOVO/Desktop/OSIRIS/src/app/api/system/status/route.ts:41) |
| B3. Query indexes | ⚠️ PARTIAL | ✅ PASS (tested plans) | Domain/time, active-anomaly ordering and forecast outcome plans are checked using EXPLAIN QUERY PLAN; added global timestamp and status/Z/time indexes. [src/server/db/schema.sql:16](C:/Users/LENOVO/Desktop/OSIRIS/src/server/db/schema.sql:16); [src/server/db/schema.sql:101](C:/Users/LENOVO/Desktop/OSIRIS/src/server/db/schema.sql:101); [tests/upgrade.test.ts:29](C:/Users/LENOVO/Desktop/OSIRIS/tests/upgrade.test.ts:29) |
| Historical integrity | ❌ FAIL | ⚠️ PARTIAL | Observation keys now preserve timestamped samples, and automatic fabricated intelligence seeding is removed. Existing operational database rows were deliberately not deleted or rewritten; previously seeded/demo rows may still require operator review. [src/server/ingestors/base.ts:110](C:/Users/LENOVO/Desktop/OSIRIS/src/server/ingestors/base.ts:110); [src/server/db/client.ts:41](C:/Users/LENOVO/Desktop/OSIRIS/src/server/db/client.ts:41) |

For cloud persistence, use a remote authoritative store and asynchronous repositories throughout the request path. Turso/libSQL is a relatively direct SQL migration, but requires replacing DatabaseSync calls and reviewing transaction behavior. A managed PostgreSQL service is another option, with schema, JSON-query and migration changes. Neither is a drop-in promise wrapper around synchronous SQLite. Keep local SQLite for an offline workstation, explicitly label replication lag, back up before migration, and verify historical counts and forecast outcomes after import. Vercel documents the permanent-storage limitation in [its SQLite guidance](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel); see [Turso TypeScript reference](https://docs.turso.tech/sdk/ts/reference) for remote-client semantics. No provider account or database was created.

### Cesium and quantitative rigor

| Check | Initial | Current | Evidence and limits |
|---|---|---|---|
| C1. Lifecycle and pruning | ❌ FAIL | ✅ PASS (source lifecycle) | Viewer, input handler, event subscriptions and animation frames are disposed; stale marker collections are rebuilt only when samples/layers change. [src/components/globe/CesiumGlobe.tsx:24](C:/Users/LENOVO/Desktop/OSIRIS/src/components/globe/CesiumGlobe.tsx:24); [src/components/globe/CesiumGlobe.tsx:80](C:/Users/LENOVO/Desktop/OSIRIS/src/components/globe/CesiumGlobe.tsx:80) |
| C2. Asset/network resilience | ❌ FAIL | ⚠️ PARTIAL | Same-version local browser runtime/workers/CSS avoid CDN version drift and a verified Next/Cesium minifier failure. Tile failures are shown; context loss leaves controls available but requires reload. Full network-loss/429/context-restoration testing remains outstanding. [src/lib/cesium.ts:13](C:/Users/LENOVO/Desktop/OSIRIS/src/lib/cesium.ts:13); [src/components/globe/CesiumGlobe.tsx:38](C:/Users/LENOVO/Desktop/OSIRIS/src/components/globe/CesiumGlobe.tsx:38) |
| C3. Marker batching | ⚠️ PARTIAL | ✅ PASS (implementation) | One PointPrimitiveCollection replaces per-entity labels/ellipses. No measured production FPS target is claimed. GPS jamming currently uses point markers rather than geographic H3 coverage polygons. [src/components/globe/CesiumGlobe.tsx:5](C:/Users/LENOVO/Desktop/OSIRIS/src/components/globe/CesiumGlobe.tsx:5) |
| D1. 30-day baselines | ❌ FAIL | ⚠️ PARTIAL | Hardcoded severity values are overwritten by sample-variance baselines drawn from recorded prior data. Missing/constant history yields no statistical Z (legacy numeric storage uses 0 with evidence status). Hourly observed-count baselines and snapshot cluster counts still need cohort/coverage normalization and backtesting before scientific use. Emergency/co-occurrence rules are not statistical Z-scores. [src/server/intelligence/baseline.ts:2](C:/Users/LENOVO/Desktop/OSIRIS/src/server/intelligence/baseline.ts:2); [src/server/intelligence/anomalyEngine.ts:158](C:/Users/LENOVO/Desktop/OSIRIS/src/server/intelligence/anomalyEngine.ts:158) |
| D2. Brier and buckets | ⚠️ PARTIAL | ⚠️ PARTIAL | Recomputes (P-O)^2, validates binary resolutions, includes p=0 and p=1 in reliability bins. Formula/boundaries tested. Existing elite labels and the 0.25 reference are heuristics, not proof of calibration; small samples and a climatology benchmark need separate analysis. [src/server/intelligence/calibrationAnalytics.ts:58](C:/Users/LENOVO/Desktop/OSIRIS/src/server/intelligence/calibrationAnalytics.ts:58); [tests/upgrade.test.ts:30](C:/Users/LENOVO/Desktop/OSIRIS/tests/upgrade.test.ts:30) |
| D3. No-trade gate | ❌ FAIL | ✅ PASS | The application overrides model verdicts to DO_NOTHING. Fewer than two nearby domains/sources explicitly fails corroboration; even corroboration alone does not authorize a hedge. [src/server/intelligence/pipelineEngine.ts:204](C:/Users/LENOVO/Desktop/OSIRIS/src/server/intelligence/pipelineEngine.ts:204) |

### Upgrade delivery matrix

| Upgrade | Status | Delivered behavior / remaining limitation |
|---|---|---|
| 1. Zustand | ✅ Implemented | Central anomalies, telemetry, markets, selections, replay clock/speed and shared polling with cancellation. [src/store/intelligenceStore.ts:23](C:/Users/LENOVO/Desktop/OSIRIS/src/store/intelligenceStore.ts:23) |
| 2. Market intelligence | ⚠️ Partial | Yahoo quotes, annualized daily-return volatility, LMT/RTX minus SPY spread, descriptive history-based associations, validated Polymarket YES token book/depth. Uses crude futures, not a licensed spot-crude series; causal risk premiums and statistical validation are not established. Contract discovery is bounded, not exhaustive. [src/server/ingestors/markets.ts:17](C:/Users/LENOVO/Desktop/OSIRIS/src/server/ingestors/markets.ts:17); [src/server/ingestors/markets.ts:67](C:/Users/LENOVO/Desktop/OSIRIS/src/server/ingestors/markets.ts:67) |
| 3. Tactical audio | ✅ Implemented | Opt-in Web Audio chirp for new Z>3 anomalies, squawk 7600/7700 alert and dossier ping, with mute and cooldown. Audible hardware output requires operator confirmation. [src/lib/audioFX.ts:12](C:/Users/LENOVO/Desktop/OSIRIS/src/lib/audioFX.ts:12) |
| 4. Replay | ✅ Implemented (local history required) | SQLite 60-minute windows across 72-hour selector, watermark, 1x/5x/20x, timestamped samples and short-gap interpolation with dateline handling. Selected window stops after 60 minutes; missing history stays empty. Responses are capped at 10,000 records. [src/app/api/replay/route.ts:2](C:/Users/LENOVO/Desktop/OSIRIS/src/app/api/replay/route.ts:2); [src/lib/replay.ts:3](C:/Users/LENOVO/Desktop/OSIRIS/src/lib/replay.ts:3) |
| 5. PDB | ✅ Implemented locally / ⚠️ cloud durability | Past-24-hour database facts, explicit unavailable data, Markdown/PDF downloads, idempotent daily records at 06:00 UTC. Vercel route requires CRON_SECRET; deployment/cron activation was not performed. [src/server/intelligence/briefingGenerator.ts:11](C:/Users/LENOVO/Desktop/OSIRIS/src/server/intelligence/briefingGenerator.ts:11); [src/server/intelligence/briefingSchedule.ts:5](C:/Users/LENOVO/Desktop/OSIRIS/src/server/intelligence/briefingSchedule.ts:5); [vercel.json:1](C:/Users/LENOVO/Desktop/OSIRIS/vercel.json:1) |
| 6. Strict types | ✅ Compiler / ⚠️ external payload validation | Explicit any types removed from application source; strict compiler and production build checked. Some legacy upstream JSON boundaries still rely on structural assumptions; strict TypeScript alone does not validate network JSON. Node emits its documented experimental SQLite runtime warning. |

### Vulnerability cards

> **HIGH — Authentication bypass / fallback credentials (fixed)**  
> **Location:** [src/middleware.ts:8](C:/Users/LENOVO/Desktop/OSIRIS/src/middleware.ts:8), [src/config/env.ts:45](C:/Users/LENOVO/Desktop/OSIRIS/src/config/env.ts:45)  
> **CWE:** CWE-306, CWE-798, CWE-208.  
> **Finding:** Unconfigured keys allowed protected requests, and environment parsing supplied predictable defaults.  
> **Fix:** Fail-closed mutation gate and fixed-size digest comparison. Existing deployed credentials were not rotated.

> **HIGH — External/LLM text injected into HTML (fixed application sinks)**  
> **Location:** [server.mjs:6](C:/Users/LENOVO/Desktop/OSIRIS/server.mjs:6)  
> **CWE:** CWE-79.  
> **Finding:** The previous standalone HTML interpolated observation and model content into innerHTML.  
> **Fix:** One Next/React rendering path; preserve legacy API equivalents. The old standalone dashboard layout is replaced by the unified workstation.

> **HIGH — DNS validation/connection race (hardened; network regression coverage partial)**  
> **Location:** [src/server/security/ssrfGuard.ts:208](C:/Users/LENOVO/Desktop/OSIRIS/src/server/security/ssrfGuard.ts:208)  
> **CWE:** CWE-918, CWE-367.  
> **Finding:** Validation and fetch previously resolved DNS independently.  
> **Fix:** Pin the validated address while preserving hostname/TLS verification, validate redirects, bound response bodies.

> **HIGH — Fabricated intelligence and unsupported statistical authority (partly fixed)**  
> **Location:** [src/server/db/client.ts:41](C:/Users/LENOVO/Desktop/OSIRIS/src/server/db/client.ts:41), [src/server/intelligence/briefingGenerator.ts:11](C:/Users/LENOVO/Desktop/OSIRIS/src/server/intelligence/briefingGenerator.ts:11), [src/server/intelligence/anomalyEngine.ts:158](C:/Users/LENOVO/Desktop/OSIRIS/src/server/intelligence/anomalyEngine.ts:158)  
> **CWE:** No single precise CWE; data-integrity/model-validity defect.  
> **Finding:** Fresh databases and briefings presented invented military activity, prices, forecasts and heuristic Z-scores as current evidence.  
> **Fix:** Remove automatic seeds/static brief claims; disclose absent baselines and offline AI. Remaining baseline comparability and pre-existing rows require review.

> **HIGH — Serverless state loss (open)**  
> **Location:** [src/server/db/client.ts:7](C:/Users/LENOVO/Desktop/OSIRIS/src/server/db/client.ts:7)  
> **CWE:** Architecture/durability gap; not assigned a misleading CWE.  
> **Fix required:** Durable authoritative database plus asynchronous repository migration and backup/restore testing before relying on cloud history.

> **MEDIUM — Static forensic reference maps (open)**  
> **Location:** [src/server/recon/crypto.ts:19](C:/Users/LENOVO/Desktop/OSIRIS/src/server/recon/crypto.ts:19), [src/server/recon/asn.ts:18](C:/Users/LENOVO/Desktop/OSIRIS/src/server/recon/asn.ts:18), [src/server/recon/cve.ts:20](C:/Users/LENOVO/Desktop/OSIRIS/src/server/recon/cve.ts:20)  
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
