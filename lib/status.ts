import type { DomainMonitor, DomainRegions, OverallStatus, RegionKey, RegionStatus } from "@/types/monitor";

/**
 * Percentage of *checked* locations in a region that are reachable, rounded to
 * a whole number. Locations the checker couldn't reach due to a CDN/WAF block
 * (see {@link RegionStatus.blocked}) are excluded from both sides of the ratio
 * — we have no real signal for them, so they don't count against the score.
 * If every location is blocked (or there's nothing to check), defaults to 100
 * rather than penalizing the domain for a checker-side issue.
 */
export function getRegionPercentage(region: RegionStatus): number {
  const checked = region.total - region.blocked;
  if (checked <= 0) return 100;
  return Math.round((region.up / checked) * 100);
}

/**
 * Buckets an uptime percentage into an overall status, mirroring the region
 * score color rules: 100 -> Healthy, 70-99 -> Minor Issue, 30-69 -> Partial Issue,
 * 1-29 -> Major Issue, 0 -> Critical.
 */
export function statusFromPercentage(percentage: number): OverallStatus {
  if (percentage === 100) return "Healthy";
  if (percentage >= 70) return "Minor Issue";
  if (percentage >= 30) return "Partial Issue";
  if (percentage > 0) return "Major Issue";
  return "Critical";
}

/** Derives the overall domain status from its target market region — the audience that actually matters. */
export function computeOverallStatus(regions: DomainRegions): OverallStatus {
  const target = regions.india ?? regions.indonesia;
  if (!target) return "Critical";
  return statusFromPercentage(getRegionPercentage(target));
}

/** Looks up a region's status for a domain. Throws if the domain doesn't track that region. */
export function getRegion(domain: DomainMonitor, key: RegionKey): RegionStatus {
  const region = domain.regions[key];
  if (!region) {
    throw new Error(`Domain "${domain.domain}" does not track the "${key}" region.`);
  }
  return region;
}

/** Tailwind classes for a region score badge when every location was blocked by a CDN/WAF (checker-side issue, not a real outage). */
export const blockedRegionScoreStyles =
  "bg-[#eef2f7] text-[#5a6b7d] border-[#d7e0ea] dark:bg-[#2a3441] dark:text-[#9fb0c3] dark:border-[#3d4a5c]";

/** Tailwind classes for a region score badge, based on its up percentage. */
export function getRegionScoreStyles(percentage: number): string {
  if (percentage === 100) return "bg-[#eaf6ea] text-[#3e8e41] border-[#c3e6c3]";
  if (percentage >= 70) return "bg-[#fef9e7] text-[#b7950b] border-[#f7e7a1]";
  if (percentage >= 30) return "bg-[#fdf2e3] text-[#b9770e] border-[#f8d7a3]";
  return "bg-[#fdedec] text-[#c0392b] border-[#f5c6c3]";
}

/** Solid fill color for the region score progress bar, based on its up percentage. */
export function getRegionBarColor(percentage: number): string {
  if (percentage === 100) return "bg-[#5cb85c]";
  if (percentage >= 70) return "bg-[#f0ad4e]";
  if (percentage >= 30) return "bg-[#f39c12]";
  return "bg-[#d9534f]";
}

/** Hex equivalent of {@link getRegionBarColor}, for use in canvas-rendered charts. */
export function getRegionBarHexColor(percentage: number): string {
  if (percentage === 100) return "#5cb85c";
  if (percentage >= 70) return "#f0ad4e";
  if (percentage >= 30) return "#f39c12";
  return "#d9534f";
}

/** Tailwind classes for the solid overall status badge shown in the table. */
export const overallStatusStyles: Record<OverallStatus, string> = {
  Healthy: "bg-[#5cb85c] text-white",
  "Minor Issue": "bg-[#f0ad4e] text-[#5a3c0a]",
  "Partial Issue": "bg-[#f39c12] text-white",
  "Major Issue": "bg-[#e8590c] text-white",
  Critical: "bg-[#d9534f] text-white",
};

/** Hex colors for chart rendering, matching the overall status badge colors. */
export const statusChartColors: Record<OverallStatus, string> = {
  Healthy: "#5cb85c",
  "Minor Issue": "#f0ad4e",
  "Partial Issue": "#f39c12",
  "Major Issue": "#e8590c",
  Critical: "#d9534f",
};

/** Severity rank used to sort "down first" (lower = worse). */
export const overallStatusSeverity: Record<OverallStatus, number> = {
  Critical: 0,
  "Major Issue": 1,
  "Partial Issue": 2,
  "Minor Issue": 3,
  Healthy: 4,
};

/** Severity bucket shown by the dashboard summary cards. */
export type SeverityFilter = "All" | "Healthy" | "Partial Issue" | "Critical";

/** Maps each summary-card bucket to the overall statuses it groups together. */
export const SEVERITY_FILTER_STATUSES: Record<Exclude<SeverityFilter, "All">, OverallStatus[]> = {
  Healthy: ["Healthy"],
  "Partial Issue": ["Minor Issue", "Partial Issue"],
  Critical: ["Major Issue", "Critical"],
};

/** Whether a domain's overall status falls within the given summary-card filter. */
export function matchesSeverityFilter(status: OverallStatus, filter: SeverityFilter): boolean {
  return filter === "All" || SEVERITY_FILTER_STATUSES[filter].includes(status);
}

/** Left-edge accent + subtle row tint for statuses that need to stand out in the table. */
export function getRowAccentClass(status: OverallStatus): string {
  switch (status) {
    case "Critical":
      return "border-l-2 border-l-[#d9534f] bg-[#fdf2f2] dark:bg-[#3a2020]";
    case "Major Issue":
      return "border-l-2 border-l-[#f39c12] bg-[#fef6ec] dark:bg-[#3a2f1a]";
    default:
      return "border-l-2 border-l-transparent";
  }
}

export interface LocationAggregate {
  name: string;
  up: number;
  total: number;
}

/**
 * Aggregates per-location uptime across every domain that tracks the given
 * region. Domains where this location was "blocked" by a CDN/WAF (checker-side
 * issue, see {@link RegionStatus.blocked}) are excluded entirely, since they
 * carry no real up/down signal.
 */
export function getLocationAggregates(
  domains: DomainMonitor[],
  regionKey: RegionKey,
  locationNames: string[]
): LocationAggregate[] {
  return locationNames.map((name) => {
    let up = 0;
    let total = 0;

    domains.forEach((domain) => {
      const region = domain.regions[regionKey];
      const location = region?.locations.find((loc) => loc.name === name);
      if (!location || location.status === "blocked") return;
      total += 1;
      if (location.status === "up") up += 1;
    });

    return { name, up, total };
  });
}

export interface Incident {
  domain: DomainMonitor;
  regionKey: RegionKey;
  regionLabel: string;
  location: string;
  reason: string;
  severity: OverallStatus;
}

/** Flattens every "down" location across all domains into a sortable incident list. */
export function getIncidents(domains: DomainMonitor[]): Incident[] {
  const incidents: Incident[] = [];

  domains.forEach((domain) => {
    (Object.entries(domain.regions) as [RegionKey, RegionStatus | undefined][]).forEach(([regionKey, region]) => {
      if (!region) return;
      region.locations.forEach((location) => {
        if (location.status !== "down") return;
        incidents.push({
          domain,
          regionKey,
          regionLabel: region.label,
          location: location.name,
          reason: location.error ?? "Unknown error",
          severity: domain.overallStatus,
        });
      });
    });
  });

  return incidents.sort((a, b) => overallStatusSeverity[a.severity] - overallStatusSeverity[b.severity]);
}
