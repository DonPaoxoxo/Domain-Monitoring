/**
 * "blocked" means the checker's own request was rejected by the target's CDN/WAF
 * (e.g. a CloudFront or Cloudflare block page) rather than the site itself being
 * down — the checker's IP is flagged, but real visitors may still reach the site.
 */
export type LocationStatus = "up" | "down" | "blocked";

export interface LocationResult {
  name: string;
  status: LocationStatus;
  /** HTTP status code, present when status is "up" */
  code?: number;
  /** Response time label (e.g. "310ms"), present when status is "up" */
  response?: string;
  /** Failure reason (e.g. "Timeout", "DNS Error", or a CDN block message), present when status is "down" or "blocked" */
  error?: string;
}

export interface RegionStatus {
  label: string;
  up: number;
  /** Locations where the checker's request was blocked by the target's CDN/WAF (excluded from the up/down ratio). */
  blocked: number;
  total: number;
  locations: LocationResult[];
}

export type RegionKey = "india" | "indonesia";

/** The target country a domain is monitored for. */
export type TargetMarket = "india" | "indonesia";

/** A domain carries region data for its target market only. */
export interface DomainRegions {
  india?: RegionStatus;
  indonesia?: RegionStatus;
}

export type OverallStatus =
  | "Healthy"
  | "Minor Issue"
  | "Partial Issue"
  | "Major Issue"
  | "Critical";

export interface DomainMonitor {
  id: number;
  domain: string;
  url: string;
  group: string;
  targetMarket: TargetMarket;
  overallStatus: OverallStatus;
  /** ISO timestamp of the most recent check result, or null if never checked. */
  lastCheckedAt: string | null;
  /** True when monitoring is paused from the dashboard; checker nodes skip these domains. */
  paused: boolean;
  regions: DomainRegions;
  /** Absolute URL from the Location header on the target-market region's latest 3xx result, if any. */
  redirectUrl: string | null;
  /** HTTP status code (301/302/307/308, ...) paired with redirectUrl, if set. */
  redirectStatusCode: number | null;
}
