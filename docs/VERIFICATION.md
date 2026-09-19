# Verification record

Final local browser/API checks: 2026-09-19. This records observed results, not a production certification.

## Automated checks

| Check | Observed result |
|---|---|
| `npm run build` | PASS; optimized Next.js 15.5.25 build and route generation completed after the Cesium loader correction. |
| `npm run typecheck` | PASS; strict TypeScript, no type errors. |
| `npm run test:unit` | PASS; 24 tests across 4 files. Includes auth, address filtering, prompt escaping, baseline math, order books, persistence windows, quotas, query indexes, calibration, briefing generation and replay interpolation. |
| `npm test` | PASS; 19 Node tests in the earlier audit run. Some legacy tests use copied logic and are not equivalent to full integration coverage. |
| `git diff --check` | PASS; no whitespace errors. Git emitted Windows LF/CRLF conversion notices. |
| Explicit `any` search in `src/` | No explicit TypeScript any types found; remaining matches are comments and `AbortSignal.any`. |

Node 24 emits an experimental SQLite warning. Thus the result is clean TypeScript compilation, not literally warning-free execution.

## Production-build browser and API checks

The built application ran at `http://127.0.0.1:3035` with `DATA_DIR` pointing to `tmp/verification` and `DISABLE_SCHEDULERS=1`. Deterministic test observations were created with `node scripts/seed-verification.mjs`; they did not enter the operational database. Read endpoints can still poll external feeds in this environment.

- Cesium rendered its canvas, OSM imagery, attribution and a tracked marker. Browser uncaught-error collection was empty after loading and after replay interactions.
- An earlier build passed compilation but produced an invalid escape in the bundled Cesium browser chunk. The final fix loads the installed Cesium UMD distribution from same-origin `/cesium/Cesium.js`; the final browser run verified this fix.
- The audio button changed from UNMUTE to MUTE after a user gesture. Actual speaker output, each event-triggered sound and device-specific audio behavior still require a listening test.
- Keyboard interaction moved the replay slider from live to T-12 hours. The historical watermark appeared, Play changed to Pause, and 20x was selected.
- The watermark advanced from `2026-09-19T04:26:58.683Z` to `2026-09-19T04:50:18.683Z` during playback. The fixture aircraft marker appeared in the replay screenshot. Unit tests separately cover interpolation across the dateline and suppression before the first sample or after an excessive gap.
- A T-12-hour aviation API request returned 57 persisted samples in its one-hour window. The exact count depends on elapsed time since fixture creation.
- An invalid replay domain/window returned HTTP 400.
- An unauthenticated POST to `/api/anomalies` returned HTTP 401.
- `/api/briefing?format=pdf` returned HTTP 200, `application/pdf`, 3487 bytes.
- `/api/briefing?format=markdown` returned HTTP 200, `text/markdown; charset=utf-8`, 3348 bytes.
- Live market quotes and prediction contracts had not populated during this final browser run. Live CLOB availability is **not verified** by these checks; do not interpret an empty panel as zero market risk.

Local screenshot evidence: `tmp/verification/workstation.png` and `tmp/verification/replay.png`. These are ignored verification artifacts, reproducible with the isolated fixture script.

## PDF visual verification

`node scripts/verify-pdf.mjs` generated `output/pdf/pdb-verification.pdf` from an isolated empty database. Poppler rendered it to `tmp/verification/pdb-1.png`; visual inspection confirmed readable headings/body/footer without overlap or clipping. This verifies the sample layout, not every possible long-input or Unicode layout. The PDF uses standard Latin fonts and sanitizes unsupported characters.

## Remaining acceptance work

1. Complete the production test plan in AUDIT.md for feed failures, HTTP 429s, high-density rendering, WebGL context loss, audio event dispatch and concurrent access. Local success does not establish production reliability or a frame-rate guarantee.
2. Replace ephemeral serverless SQLite with durable storage before relying on cloud history, calibration or scheduled briefs. Cron delivery and cross-instance locking have not been verified in production.
3. Validate historical cohort definitions and missing-data treatment before treating reported Z-scores as scientifically comparable. Validate market models out of sample; the crude feed is a futures proxy, not a spot feed.
4. Replace remaining static reconnaissance data and substantiate heuristic confidence/severity labels. The seven named reasoning roles are not evidence of seven independent model executions.
5. Run adversarial DNS/redirect and semantic prompt-injection integration tests. Unit address checks and delimiters are insufficient to certify the complete threat boundary.
6. Perform a real authorized LLM investigation and inspect its provenance and no-trade behavior. No live model invocation was made solely for verification.

No deployment, account provisioning, live trading or production database mutation was performed.
