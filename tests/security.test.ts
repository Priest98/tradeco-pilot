import { describe, it, expect } from "vitest";
import { validateHost, parseCanonicalIPv4 } from "../src/server/security/ssrfGuard";

describe("Security Audit Checklist 1.1 - 4.6 Verification", () => {
  describe("SSRF Guard - Host & IP Validation", () => {
    it("should accept valid public hosts", async () => {
      const result = await validateHost("8.8.8.8");
      expect(result.ok).toBe(true);
    });

    it("should reject localhost and loopback IPv4 (127.0.0.1)", async () => {
      const resHost = await validateHost("localhost");
      expect(resHost.ok).toBe(false);

      const resIp = await validateHost("127.0.0.1");
      expect(resIp.ok).toBe(false);
    });

    it("should reject AWS/Cloud metadata IP (169.254.169.254)", async () => {
      const result = await validateHost("169.254.169.254");
      expect(result.ok).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("should reject RFC1918 private IPv4 addresses (10.x, 172.16.x, 192.168.x)", async () => {
      expect((await validateHost("10.0.0.1")).ok).toBe(false);
      expect((await validateHost("172.16.0.1")).ok).toBe(false);
      expect((await validateHost("192.168.1.1")).ok).toBe(false);
    });

    it("should reject non-canonical decimal, octal, and hex IP notations", () => {
      expect(parseCanonicalIPv4("2130706433")).toBeNull();
      expect(parseCanonicalIPv4("0177.0.0.1")).toBeNull();
      expect(parseCanonicalIPv4("0x7f.0.0.1")).toBeNull();
      expect(parseCanonicalIPv4("127.1")).toBeNull();
      expect(parseCanonicalIPv4("127.0.0.1")).toBe("127.0.0.1");
    });

    it("should reject cloud metadata internal hostnames", async () => {
      expect((await validateHost("metadata.google.internal")).ok).toBe(false);
      expect((await validateHost("host.docker.internal")).ok).toBe(false);
    });
  });
});
