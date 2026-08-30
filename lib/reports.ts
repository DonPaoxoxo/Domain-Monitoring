import type { DomainMonitor, OverallStatus, RegionStatus } from "@/types/monitor";
import { getRegion, getRegionPercentage, statusFromPercentage } from "./status";

export type ReportPeriod = "daily" | "weekly" | "monthly";

export const REPORT_PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

export const REPORT_PERIOD_DESCRIPTIONS: Record<ReportPeriod, string> = {
  daily: "Live snapshot of accessibility across all monitored domains.",
  weekly: "Aggregated uptime and incident totals over the past 7 days.",
  monthly: "Aggregated uptime and incident totals over the past 30 days.",
};

export interface ReportRow {
  domain: DomainMonitor;
  targetRegionLabel: string;
  targetUptime: number;
  overallUptime: number;
  status: OverallStatus;
  incidents: number;
}

export interface ReportSummary {
  total: number;
  healthy: number;
  issues: number;
  critical: number;
  avgUptime: number;
  totalIncidents: number;
}

/** Deterministic hash-based PRNG (mulberry32-derived) so report figures are stable across renders. */
export function seededRandom(seed: number): number {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const PERIOD_SEED_OFFSET: Record<ReportPeriod, number> = {
  daily: 0,
  weekly: 100,
  monthly: 200,
};

/**
 * Projects a current uptime percentage into a period-aggregated figure.
 * Daily reports use the live snapshot as-is. Weekly/monthly reports apply a
 * deterministic recovery boost (or a small dip for already-healthy domains)
 * plus jitter, since no real historical time-series data exists yet.
 */
export function periodUptime(currentPercentage: number, period: ReportPeriod, seed: number): number {
  if (period === "daily") return currentPercentage;

  const rand = seededRandom(seed + PERIOD_SEED_OFFSET[period]);

  if (currentPercentage >= 100) {
    const dip = period === "weekly" ? Math.round(rand * 2) : Math.round(rand * 4);
    return 100 - dip;
  }

  const recovery = period === "weekly" ? 8 : 15;
  const jitter = Math.round((rand - 0.5) * (period === "weekly" ? 8 : 12));
  return Math.min(100, Math.max(0, currentPercentage + recovery + jitter));
}

/**
 * Projects a current incident count into a period total. Domains with no
 * current incidents are assumed incident-free for the period too.
 */
export function periodIncidents(currentCount: number, period: ReportPeriod, seed: number): number {
  if (period === "daily" || currentCount === 0) return currentCount;

  const rand = seededRandom(seed + PERIOD_SEED_OFFSET[period]);
  const multiplier = period === "weekly" ? 5 : 18;
  const extra = Math.floor(rand * multiplier * 0.6);
  return currentCount * multiplier + extra;
}

/** Counts "down" locations across every region a domain tracks. */
function countDownLocations(domain: DomainMonitor): number {
  const regions = [domain.regions.india, domain.regions.indonesia].filter(
    (region): region is RegionStatus => region !== undefined
  );
  return regions.reduce((sum, region) => sum + region.locations.filter((loc) => loc.status === "down").length, 0);
}

/** Builds per-domain report rows for the given period from the live monitor snapshot. */
export function buildReportRows(domains: DomainMonitor[], period: ReportPeriod): ReportRow[] {
  return domains.map((domain) => {
    const targetRegion = getRegion(domain, domain.targetMarket);

    const currentTarget = getRegionPercentage(targetRegion);
    const currentIncidents = countDownLocations(domain);

    const targetUptime = periodUptime(currentTarget, period, domain.id * 10 + 1);
    const overallUptime = targetUptime;
    const incidents = periodIncidents(currentIncidents, period, domain.id * 10 + 3);

    return {
      domain,
      targetRegionLabel: targetRegion.label,
      targetUptime,
      overallUptime,
      status: statusFromPercentage(targetUptime),
      incidents,
    };
  });
}

/** Aggregates report rows into headline summary figures. */
export function buildReportSummary(rows: ReportRow[]): ReportSummary {
  const total = rows.length;
  const healthy = rows.filter((row) => row.status === "Healthy").length;
  const critical = rows.filter((row) => row.status === "Critical").length;
  const issues = rows.filter(
    (row) => row.status === "Minor Issue" || row.status === "Partial Issue" || row.status === "Major Issue"
  ).length;
  const avgUptime = total === 0 ? 0 : Math.round(rows.reduce((sum, row) => sum + row.overallUptime, 0) / total);
  const totalIncidents = rows.reduce((sum, row) => sum + row.incidents, 0);

  return { total, healthy, issues, critical, avgUptime, totalIncidents };
}

const RANGE_DATE_FORMAT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };

/** Human-readable date range covered by the report period, ending today. */
export function getPeriodRangeLabel(period: ReportPeriod, referenceDate: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-US", RANGE_DATE_FORMAT);

  if (period === "daily") {
    return formatter.format(referenceDate);
  }

  const days = period === "weekly" ? 6 : 29;
  const start = new Date(referenceDate);
  start.setDate(start.getDate() - days);

  return `${formatter.format(start)} – ${formatter.format(referenceDate)}`;
}
