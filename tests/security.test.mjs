import { describe, it } from "node:test";
import assert from "node:assert";

// Self-contained test of SSRF guard rules
const IPV4_BLOCKED_RANGES = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function ipv4ToInt(ip) {
  const parts = ip.split(".").map(Number);
  return parts[0] * 0x1000000 + parts[1] * 0x10000 + parts[2] * 0x100 + parts[3];
}

function isIPv4Blocked(ip) {
  const ipInt = ipv4ToInt(ip);
  for (const [net, bits] of IPV4_BLOCKED_RANGES) {
    const netInt = ipv4ToInt(net);
    const blockSize = bits === 0 ? 0x100000000 : Math.pow(2, 32 - bits);
    if (Math.floor(ipInt / blockSize) === Math.floor(netInt / blockSize)) {
      return true;
    }
  }
  return false;
}

function parseCanonicalIPv4(s) {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(s)) {
    const parts = s.split(".").map(Number);
    if (parts.some((p) => p < 0 || p > 255)) return null;
    return parts.join(".");
  }
  return null;
}

describe("Security Audit SSRF Defense Verification", () => {
  it("should reject loopback 127.0.0.1", () => {
    assert.strictEqual(isIPv4Blocked("127.0.0.1"), true);
  });

  it("should reject AWS/Cloud metadata IP (169.254.169.254)", () => {
    assert.strictEqual(isIPv4Blocked("169.254.169.254"), true);
  });

  it("should reject RFC1918 private IPv4 addresses", () => {
    assert.strictEqual(isIPv4Blocked("10.0.0.1"), true);
    assert.strictEqual(isIPv4Blocked("172.16.0.1"), true);
    assert.strictEqual(isIPv4Blocked("192.168.1.1"), true);
  });

  it("should allow public IP addresses", () => {
    assert.strictEqual(isIPv4Blocked("8.8.8.8"), false);
    assert.strictEqual(isIPv4Blocked("1.1.1.1"), false);
  });

  it("should reject non-canonical decimal, octal, and hex IPv4 representations", () => {
    assert.strictEqual(parseCanonicalIPv4("2130706433"), null);
    assert.strictEqual(parseCanonicalIPv4("0177.0.0.1"), null);
    assert.strictEqual(parseCanonicalIPv4("0x7f.0.0.1"), null);
    assert.strictEqual(parseCanonicalIPv4("127.0.0.1"), "127.0.0.1");
  });
});
