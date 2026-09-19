import { Agent, fetch as pinnedFetch } from "undici";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF guard for all outbound network requests initiated by ingestors and recon tools.
 *
 * Enforces:
 * 1. Strict canonicalization of IPv4/IPv6 addresses (rejecting non-dotted-quad, hex, octal, decimal).
 * 2. DNS resolution check: rejects any host resolving to private (RFC1918), loopback, link-local,
 *    carrier-grade NAT, multicast, or cloud metadata ranges (169.254.169.254).
 * 3. DNS rebinding prevention via manual redirect tracking and validation at each hop.
 */

const IPV4_BLOCKED_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // RFC1918 Private
  ["100.64.0.0", 10], // Shared Address Space / Carrier-grade NAT
  ["127.0.0.0", 8], // Loopback
  ["169.254.0.0", 16], // Link-Local (including Cloud Metadata 169.254.169.254)
  ["172.16.0.0", 12], // RFC1918 Private
  ["192.0.0.0", 24], // IETF Protocol Assignments
  ["192.0.2.0", 24], // TEST-NET-1
  ["192.168.0.0", 16], // RFC1918 Private
  ["198.18.0.0", 15], // Benchmarking
  ["198.51.100.0", 24], // TEST-NET-2
  ["203.0.113.0", 24], // TEST-NET-3
  ["224.0.0.0", 4], // Multicast
  ["240.0.0.0", 4], // Reserved / Broadcast (255.255.255.255)
];

const IPV6_BLOCKED_PREFIXES = [
  "::", // Unspecified
  "::1", // Loopback
  "::ffff:", // IPv4-mapped IPv6
  "64:ff9b::", // NAT64
  "64:ff9b:1:", // Local NAT64
  "100::", // Discard-only
  "2001:db8:", // Documentation
  "fc", // Unique-Local (fc00::/7)
  "fd",
  "fe8", "fe9", "fea", "feb", // Link-Local (fe80::/10)
  "fec", "fed", "fee", "fef", // Site-Local (fec0::/10)
  "ff", // Multicast (ff00::/8)
];

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return parts[0] * 0x1000000 + parts[1] * 0x10000 + parts[2] * 0x100 + parts[3];
}

function isIPv4Blocked(ip: string): boolean {
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

function isIPv6Blocked(ip: string): boolean {
  const lower = new URL(`http://[${ip.replace(/^\[|\]$/g, "")}]`).hostname.slice(1, -1).toLowerCase();
  if (!/^[23][0-9a-f]{3}:/.test(lower) || lower.startsWith("2002:") || /^2001:(?:0|[1-9a-f][0-9a-f]?):/.test(lower)) return true;
  for (const prefix of IPV6_BLOCKED_PREFIXES) {
    if (lower.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * Validates strict canonical dotted-quad IPv4 format.
 * Rejects integer, octal, hex, and short forms.
 */
export function parseCanonicalIPv4(s: string): string | null {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(s)) {
    if (s.split(".").some(part => part.length > 1 && part.startsWith("0"))) return null;
    const parts = s.split(".").map(Number);
    if (parts.some((p) => p < 0 || p > 255)) return null;
    return parts.join(".");
  }
  return null;
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
  resolved?: string[];
}

/**
 * Validates whether a target host or IP is safe to contact.
 */
export async function validateHost(host: string): Promise<ValidationResult> {
  const trimmed = host.trim();
  if (!trimmed) return { ok: false, reason: "Host cannot be empty" };

  const bracketed = trimmed.replace(/^\[|\]$/g, "");

  // Block reserved cloud metadata and internal host patterns
  const lowerHost = trimmed.toLowerCase();
  const BLOCKED_HOST_PATTERNS = [
    /^localhost$/i,
    /\.localhost$/i,
    /^host\.docker\.internal$/i,
    /\.local$/i,
    /\.internal$/i,
    /^metadata\.google\.internal$/i,
    /^instance-data$/i,
    /^169\.254\.169\.254$/i,
  ];

  if (BLOCKED_HOST_PATTERNS.some((re) => re.test(lowerHost))) {
    return { ok: false, reason: "Target host matches blocked internal/metadata pattern" };
  }

  // IP literal checks
  const family = isIP(bracketed);
  if (family === 4) {
    const canonical = parseCanonicalIPv4(bracketed);
    if (!canonical) return { ok: false, reason: "Non-canonical IPv4 notation rejected" };
    if (isIPv4Blocked(canonical)) return { ok: false, reason: `IPv4 address ${canonical} is in a reserved/private range` };
    return { ok: true, resolved: [canonical] };
  }

  if (family === 6) {
    if (isIPv6Blocked(bracketed)) return { ok: false, reason: `IPv6 address ${bracketed} is in a reserved/private range` };
    return { ok: true, resolved: [bracketed] };
  }

  // Hostname validation
  if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(trimmed)) {
    return { ok: false, reason: "Invalid hostname format" };
  }

  let answers: Array<{ address: string; family: number }> = [];
  try {
    answers = await lookup(trimmed, { all: true });
  } catch (err) {
    return { ok: false, reason: `DNS lookup failed: ${(err as Error).message}` };
  }

  if (!answers.length) {
    return { ok: false, reason: "Hostname resolved to no DNS records" };
  }

  for (const record of answers) {
    if (record.family === 4 && isIPv4Blocked(record.address)) {
      return { ok: false, reason: `Host resolves to blocked IPv4 address: ${record.address}` };
    }
    if (record.family === 6 && isIPv6Blocked(record.address)) {
      return { ok: false, reason: `Host resolves to blocked IPv6 address: ${record.address}` };
    }
  }

  return { ok: true, resolved: answers.map((a) => a.address) };
}

/**
 * Hardened safe fetch wrapper.
 * Validates protocol (only http/https), resolves and validates DNS at every hop,
 * and handles redirects manually to defeat redirect-based SSRF and rebinding.
 */
export async function safeFetch(
  inputUrl: string,
  init: RequestInit & { maxRedirects?: number; timeoutMs?: number } = {}
): Promise<Response> {
  const maxRedirects = init.maxRedirects ?? 3;
  const timeoutMs = init.timeoutMs ?? 15000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fetchInit: RequestInit = {
      ...init,
      signal: controller.signal,
      redirect: "manual",
    };
    // @ts-expect-error custom property cleanup
    delete fetchInit.maxRedirects;
    // @ts-expect-error custom property cleanup
    delete fetchInit.timeoutMs;

    let currentUrl = inputUrl;

    for (let hop = 0; hop <= maxRedirects; hop++) {
      let parsed: URL;
      try {
        parsed = new URL(currentUrl);
      } catch {
        throw new Error(`safeFetch: Invalid URL format: ${currentUrl}`);
      }

      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error(`safeFetch: Disallowed protocol ${parsed.protocol}`);
      }

      const hostCheck = await validateHost(parsed.hostname);
      if (!hostCheck.ok) {
        throw new Error(`safeFetch: Blocked target: ${hostCheck.reason}`);
      }

      if (parsed.username || parsed.password) throw new Error("URL credentials are forbidden");
      const address = hostCheck.resolved![0];
      const dispatcher = new Agent({ connect: { autoSelectFamily: false, lookup: (_host, _options, callback) => callback(null, address, isIP(address)) } });
      let response: Response;
      try {
        const upstream = await pinnedFetch(currentUrl, { method: fetchInit.method, headers: Object.fromEntries(new Headers(fetchInit.headers)), signal: init.signal ? AbortSignal.any([init.signal,controller.signal]) : controller.signal, redirect: "manual", dispatcher });
        const reader=upstream.body?.getReader(); const chunks: Uint8Array[]=[]; let length=0;
        if(reader) { for(;;) { const {done,value}=await reader.read(); if(done) break; length+=value.byteLength; if(length>20*1024*1024) { await reader.cancel(); throw new Error("Upstream response too large"); } chunks.push(value); } }
        const bytes=new Uint8Array(length); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
        response = new Response([204, 205, 304].includes(upstream.status) ? null : bytes, { status: upstream.status, headers: Object.fromEntries(upstream.headers) });
      } finally { await dispatcher.close(); }

      // Handle redirects securely by re-validating the target URL
      if (response.status >= 300 && response.status < 400) {
        const redirectTarget = response.headers.get("location");
        if (!redirectTarget) return response;

        const next = new URL(redirectTarget, currentUrl);
        if (next.origin !== parsed.origin) { const headers = new Headers(fetchInit.headers); headers.delete("authorization"); headers.delete("cookie"); fetchInit.headers = headers; }
        currentUrl = next.toString();
        continue;
      }

      return response;
    }

    throw new Error(`safeFetch: Exceeded maximum redirects (${maxRedirects})`);
  } finally {
    clearTimeout(timer);
  }
}
