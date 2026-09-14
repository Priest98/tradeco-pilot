import { BaseIngestor, NormalizedObservation } from "./base";
import { safeFetch } from "@/server/security/ssrfGuard";

const CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const FEODO_TRACKER_URL = "https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json";

export class CyberThreatIngestor extends BaseIngestor {
  readonly name = "CISA KEV & Abuse.ch Cyber Threats";
  readonly domain = "cyber" as const;
  readonly pollIntervalMs = 30 * 60 * 1000; // 30 minutes

  async fetchData(): Promise<NormalizedObservation[]> {
    const observations: NormalizedObservation[] = [];

    // 1. CISA Known Exploited Vulnerabilities
    try {
      const res = await safeFetch(CISA_KEV_URL, { timeoutMs: 15000 });
      if (res.ok) {
        const data = await res.json();
        const vulnerabilities = Array.isArray(data.vulnerabilities) ? data.vulnerabilities : [];

        // Take vulnerabilities added in the last 60 days
        const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;

        for (const v of vulnerabilities) {
          const addedTime = new Date(v.dateAdded || Date.now()).getTime();
          if (addedTime < sixtyDaysAgo) continue;

          observations.push({
            id: `cisa-${v.cveID}`,
            domain: "cyber",
            source: "cisa_kev",
            entityId: v.cveID,
            timestamp: addedTime,
            data: {
              cveId: v.cveID,
              vendor: v.vendorProject,
              product: v.product,
              name: v.vulnerabilityName,
              action: v.requiredAction,
              dueDate: v.dueDate,
              notes: v.notes,
              ransomwareUse: v.knownRansomwareCampaignUse || "Unknown",
            },
          });
        }
      }
    } catch (err) {
      console.warn("[CyberThreatIngestor] CISA KEV fetch failed:", err);
    }

    // 2. Abuse.ch Feodo Tracker Active C2 Botnet IP list
    try {
      const res = await safeFetch(FEODO_TRACKER_URL, { timeoutMs: 15000 });
      if (res.ok) {
        const data = await res.json();
        const c2Nodes = Array.isArray(data) ? data : [];

        for (const node of c2Nodes.slice(0, 100)) {
          if (!node.ip_address) continue;

          observations.push({
            id: `feodo-${node.ip_address}-${node.port}`,
            domain: "cyber",
            source: "feodo_tracker",
            entityId: node.ip_address,
            timestamp: new Date(node.first_seen || Date.now()).getTime(),
            data: {
              ip: node.ip_address,
              port: node.port,
              malware: node.malware,
              asName: node.as_name,
              country: node.country,
              status: node.status,
            },
          });
        }
      }
    } catch (err) {
      console.warn("[CyberThreatIngestor] Feodo Tracker fetch failed:", err);
    }

    return observations;
  }
}
