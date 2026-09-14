import { describe, it } from "node:test";
import assert from "node:assert";
import { analyzeAsn } from "../src/server/recon/asn.ts";
import { analyzeCryptoAddress } from "../src/server/recon/crypto.ts";
import { analyzeCve } from "../src/server/recon/cve.ts";

describe("Forensic RECON Intelligence Toolkit Verification", () => {
  describe("BGP & ASN Intelligence", () => {
    it("flags known bulletproof / state-linked ASNs as CRITICAL", () => {
      const report = analyzeAsn(200019);
      assert.strictEqual(report.isBulletproof, true);
      assert.strictEqual(report.riskTier, "CRITICAL");
      assert.strictEqual(report.asName, "Alexhost SRL");
    });

    it("evaluates major cloud providers as LOW risk", () => {
      const report = analyzeAsn(15169);
      assert.strictEqual(report.isBulletproof, false);
      assert.strictEqual(report.riskTier, "LOW");
      assert.strictEqual(report.asName, "Google LLC");
    });
  });

  describe("On-Chain Cryptographic Forensics & OFAC Screening", () => {
    it("accurately detects OFAC-sanctioned Lazarus Group Ethereum addresses", () => {
      const lazarusWallet = "0x098B716B8Aaf21512996DC57EB0615e2383E2F96";
      const result = analyzeCryptoAddress(lazarusWallet);

      assert.strictEqual(result.chain, "ETH");
      assert.strictEqual(result.isSanctioned, true);
      assert.strictEqual(result.riskScore, 100);
      assert.strictEqual(result.riskCategory, "OFAC_SANCTIONED");
      assert.ok(result.associatedEntity?.includes("Lazarus Group"));
    });

    it("detects sanctioned Tornado Cash pool addresses", () => {
      const tornadoPool = "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b";
      const result = analyzeCryptoAddress(tornadoPool);

      assert.strictEqual(result.isSanctioned, true);
      assert.ok(result.associatedEntity?.includes("Tornado Cash"));
    });

    it("verifies clean Bitcoin addresses", () => {
      const cleanBtc = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
      const result = analyzeCryptoAddress(cleanBtc);

      assert.strictEqual(result.chain, "BTC");
      assert.strictEqual(result.isSanctioned, false);
      assert.strictEqual(result.riskCategory, "CLEAN");
    });
  });

  describe("CISA KEV & Vulnerability Forensics", () => {
    it("flags actively weaponized PAN-OS GlobalProtect CVE-2024-3400", () => {
      const report = analyzeCve("CVE-2024-3400");
      assert.strictEqual(report.isKnownExploited, true);
      assert.strictEqual(report.isRansomwareCampaignLinked, true);
      assert.strictEqual(report.cvssEstimate, 10.0);
      assert.strictEqual(report.severity, "CRITICAL");
    });
  });
});
