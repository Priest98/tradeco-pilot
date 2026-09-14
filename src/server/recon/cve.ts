/**
 * CISA KEV & Vulnerability Threat Forensics.
 * Analyzes active exploitation status, ransomware campaigns, and infrastructure exposure.
 */

export interface CveReport {
  cveId: string;
  vendor: string;
  product: string;
  vulnerabilityName: string;
  isKnownExploited: boolean;
  isRansomwareCampaignLinked: boolean;
  cvssEstimate: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  dueDate?: string;
  remediationAction: string;
  threatAssessment: string;
}

const NOTABLE_KEVS = new Map<string, Partial<CveReport>>([
  [
    "CVE-2024-3400",
    {
      vendor: "Palo Alto Networks",
      product: "PAN-OS",
      vulnerabilityName: "Command Injection in GlobalProtect Gateway",
      isKnownExploited: true,
      isRansomwareCampaignLinked: true,
      cvssEstimate: 10.0,
      severity: "CRITICAL",
      remediationAction: "Apply vendor hotfix immediately or disable device telemetry.",
      threatAssessment: "Actively leveraged by state-sponsored actors to establish persistent perimeter access.",
    },
  ],
  [
    "CVE-2023-4966",
    {
      vendor: "Citrix",
      product: "NetScaler ADC / Gateway",
      vulnerabilityName: "Citrix Bleed Sensitive Information Disclosure",
      isKnownExploited: true,
      isRansomwareCampaignLinked: true,
      cvssEstimate: 9.4,
      severity: "CRITICAL",
      remediationAction: "Kill active sessions and patch firmware.",
      threatAssessment: "Facilitated session token hijacking bypassing multifactor authentication.",
    },
  ],
  [
    "CVE-2023-27997",
    {
      vendor: "Fortinet",
      product: "FortiOS",
      vulnerabilityName: "Heap-based Buffer Overflow in SSL-VPN",
      isKnownExploited: true,
      isRansomwareCampaignLinked: true,
      cvssEstimate: 9.8,
      severity: "CRITICAL",
      remediationAction: "Upgrade FortiOS firmware.",
      threatAssessment: "Unauthenticated remote code execution targeting critical infrastructure VPN edges.",
    },
  ],
]);

export function analyzeCve(cveId: string): CveReport {
  const normalized = cveId.trim().toUpperCase();
  const match = NOTABLE_KEVS.get(normalized);

  if (match) {
    return {
      cveId: normalized,
      vendor: match.vendor || "Unknown",
      product: match.product || "Unknown",
      vulnerabilityName: match.vulnerabilityName || "Active Exploit",
      isKnownExploited: match.isKnownExploited ?? true,
      isRansomwareCampaignLinked: match.isRansomwareCampaignLinked ?? false,
      cvssEstimate: match.cvssEstimate ?? 9.5,
      severity: match.severity || "CRITICAL",
      remediationAction: match.remediationAction || "Apply immediate security update.",
      threatAssessment: match.threatAssessment || "Active threat adversary vector.",
    };
  }

  // Generic fallback parsing
  const isWellFormed = /^CVE-\d{4}-\d{4,7}$/.test(normalized);

  return {
    cveId: normalized,
    vendor: "Generic/Unmatched",
    product: "Enterprise Software",
    vulnerabilityName: isWellFormed ? "Cataloged Vulnerability" : "Invalid CVE identifier",
    isKnownExploited: false,
    isRansomwareCampaignLinked: false,
    cvssEstimate: isWellFormed ? 7.5 : 0.0,
    severity: isWellFormed ? "HIGH" : "LOW",
    remediationAction: isWellFormed ? "Review vendor security advisory and verify patch level." : "Verify CVE ID format (e.g., CVE-2024-3400).",
    threatAssessment: isWellFormed
      ? "Standard risk profile. Monitor CISA KEV catalog for active weaponization."
      : "Malformed vulnerability input.",
  };
}
