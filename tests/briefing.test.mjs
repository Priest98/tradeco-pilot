import { describe, it } from "node:test";
import assert from "node:assert";
import { generateDailyBriefing } from "../src/server/intelligence/briefingGenerator.ts";

describe("Presidential Daily Briefing (PDB) Generation", () => {
  it("synthesizes an authoritative military-grade intelligence memo", () => {
    const briefing = generateDailyBriefing();

    assert.ok(briefing.briefingId.startsWith("PDB-"));
    assert.ok(briefing.bluf.length > 50);
    assert.strictEqual(briefing.theaters.length, 0);
    assert.ok(briefing.markdownContent.includes("unavailable"));
    assert.ok(!briefing.markdownContent.includes("F-35"));
    assert.ok(briefing.markdownContent.includes("# PRESIDENTIAL INTELLIGENCE BRIEF (PDB)"));
    assert.ok(briefing.markdownContent.includes("## 1. BOTTOM LINE UP FRONT (BLUF)"));
    assert.ok(briefing.markdownContent.includes("## 6. NO-TRADE & CAPITAL PRESERVATION DIRECTIVE"));
    assert.ok(briefing.noTradeMandate.toUpperCase().includes("NO TRADE") || briefing.noTradeMandate.toUpperCase().includes("NO-TRADE"));
  });
});
