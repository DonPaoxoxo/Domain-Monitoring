import { prisma } from "@/lib/db";
import { formatRelativeTime } from "@/lib/domains";
import { getAppSettings, checkIntervalToMinutes } from "@/lib/settings";
import { REGION_LABELS } from "@/data/mockDomains";
import type { RegionKey } from "@/types/monitor";

/**
 * A node is considered offline once it hasn't reported for 1.5x the
 * currently configured check interval (Monitoring Defaults), so this scales
 * automatically when the interval changes instead of going stale.
 */
export async function getOnlineThresholdMs(): Promise<number> {
  const settings = await getAppSettings();
  return checkIntervalToMinutes(settings.checkInterval) * 1.5 * 60 * 1000;
}

export interface CheckerNodeStatus {
  name: string;
  location: string;
  status: "Online" | "Offline";
  lastPing: string;
}

export interface CheckerFleetSummary {
  online: number;
  total: number;
  label: string;
  dotClassName: string;
}

/** Summarizes overall checker node health for status badges (sidebar, login page). */
export async function getCheckerFleetSummary(): Promise<CheckerFleetSummary> {
  const nodes = await getCheckerNodes();
  const online = nodes.filter((node) => node.status === "Online").length;
  const total = nodes.length;

  if (total === 0) {
    return { online, total, label: "No checker nodes reporting", dotClassName: "bg-[#9aa7b3]" };
  }
  if (online === total) {
    return { online, total, label: "All checker nodes online", dotClassName: "bg-[#5cb85c]" };
  }
  return { online, total, label: `${online} of ${total} checker nodes online`, dotClassName: "bg-[#f0ad4e]" };
}

/** Loads the deployed checker nodes and their last-seen status from check results. */
export async function getCheckerNodes(): Promise<CheckerNodeStatus[]> {
  const [grouped, onlineThresholdMs] = await Promise.all([
    prisma.checkResult.groupBy({
      by: ["nodeName", "region", "location"],
      _max: { updatedAt: true },
    }),
    getOnlineThresholdMs(),
  ]);

  return grouped
    .map((row) => {
      const lastSeen = row._max.updatedAt;
      const region = row.region as RegionKey;

      return {
        name: row.nodeName,
        location: `${row.location}, ${REGION_LABELS[region]}`,
        status: lastSeen && Date.now() - lastSeen.getTime() < onlineThresholdMs ? "Online" : "Offline",
        lastPing: lastSeen ? formatRelativeTime(lastSeen) : "Never",
      } satisfies CheckerNodeStatus;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
