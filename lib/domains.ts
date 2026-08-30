import { prisma } from "@/lib/db";
import { computeOverallStatus } from "@/lib/status";
import { REGION_LABELS, REGION_LOCATIONS } from "@/data/mockDomains";
import type {
  DomainMonitor,
  DomainRegions,
  LocationResult,
  RegionKey,
  RegionStatus,
  TargetMarket,
} from "@/types/monitor";

/** Region keys tracked for each target market, in addition to Global. */
const MARKET_REGION_KEYS: Record<TargetMarket, RegionKey> = {
  india: "india",
  indonesia: "indonesia",
};

interface CheckRow {
  region: string;
  location: string;
  status: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  redirectUrl: string | null;
  updatedAt: Date;
}

/** Builds a single region's status block from its checked locations. */
function buildRegionStatus(region: RegionKey, results: Map<string, CheckRow>): RegionStatus {
  const locations: LocationResult[] = REGION_LOCATIONS[region].map((name) => {
    const result = results.get(name);

    if (result?.status === "up") {
      return {
        name,
        status: "up",
        code: result.statusCode ?? 200,
        response: result.responseTimeMs != null ? `${result.responseTimeMs}ms` : undefined,
      };
    }

    if (result?.status === "blocked") {
      return {
        name,
        status: "blocked",
        error: result.errorMessage ?? "Blocked by CDN (checker IP)",
      };
    }

    return {
      name,
      status: "down",
      error: result?.errorMessage ?? "No data yet",
    };
  });

  return {
    label: REGION_LABELS[region],
    up: locations.filter((loc) => loc.status === "up").length,
    blocked: locations.filter((loc) => loc.status === "blocked").length,
    total: locations.length,
    locations,
  };
}

/**
 * Finds the redirect target (if any) reported by the target-market region's
 * latest results - either an HTTP 3xx Location header or a 200 OK
 * meta-refresh "bridge" page.
 */
function getRedirectInfo(results: Map<string, CheckRow>): { url: string | null; statusCode: number | null } {
  for (const result of results.values()) {
    if (result.status === "up" && result.statusCode != null && result.redirectUrl) {
      return { url: result.redirectUrl, statusCode: result.statusCode };
    }
  }
  return { url: null, statusCode: null };
}

/** Formats a timestamp as a short relative time string, e.g. "2 min ago". */
export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin <= 0) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hr ago`;

  const diffDay = Math.round(diffHour / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

/**
 * Loads every active domain along with its latest check results and reshapes
 * them into the `DomainMonitor[]` shape consumed by the dashboard UI. Pass
 * `domainIds` to load only a subset (e.g. the domains affected by one batch
 * of check results).
 */
export async function getDomainMonitors(domainIds?: number[]): Promise<DomainMonitor[]> {
  const domains = await prisma.domain.findMany({
    where: { active: true, ...(domainIds ? { id: { in: domainIds } } : {}) },
    include: { results: true },
    orderBy: { id: "asc" },
  });

  return domains.map((domain) => {
    const targetMarket: TargetMarket = domain.targetMarket === "indonesia" ? "indonesia" : "india";
    const targetRegionKey = MARKET_REGION_KEYS[targetMarket];

    const resultsByRegion = new Map<RegionKey, Map<string, CheckRow>>();
    for (const result of domain.results) {
      const regionKey = result.region as RegionKey;
      if (!resultsByRegion.has(regionKey)) {
        resultsByRegion.set(regionKey, new Map());
      }
      resultsByRegion.get(regionKey)!.set(result.location, result);
    }

    const regions: DomainRegions = {
      [targetRegionKey]: buildRegionStatus(targetRegionKey, resultsByRegion.get(targetRegionKey) ?? new Map()),
    } as DomainRegions;

    const latestUpdate = domain.results.reduce<Date | null>((latest, result) => {
      if (!latest || result.updatedAt > latest) return result.updatedAt;
      return latest;
    }, null);

    const redirectInfo = getRedirectInfo(resultsByRegion.get(targetRegionKey) ?? new Map());

    return {
      id: domain.id,
      domain: domain.domain,
      url: domain.url,
      group: domain.group,
      targetMarket,
      overallStatus: computeOverallStatus(regions),
      lastCheckedAt: latestUpdate ? latestUpdate.toISOString() : null,
      paused: domain.paused,
      regions,
      redirectUrl: redirectInfo.url,
      redirectStatusCode: redirectInfo.statusCode,
    };
  });
}
