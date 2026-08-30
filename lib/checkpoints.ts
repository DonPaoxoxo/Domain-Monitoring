import { prisma } from "@/lib/db";
import { CHECKPOINTS } from "@/data/checkpoints";
import { REGION_LABELS } from "@/data/mockDomains";
import { getOnlineThresholdMs } from "@/lib/checkerNodes";
import type { RegionKey } from "@/types/monitor";

export interface CheckpointStatus {
  name: string;
  regionKey: RegionKey;
  regionLabel: string;
  lat: number;
  lng: number;
  up: number;
  down: number;
  blocked: number;
  total: number;
  /** Percentage of *checked* (non-blocked) domains that are reachable from this checkpoint. */
  percentage: number;
  lastCheckedAt: string | null;
  /** Whether this checkpoint's checker node has reported within the online threshold (see {@link getOnlineThresholdMs}). */
  online: boolean;
}

/** Loads live up/down/blocked counts per checker location, for the realtime checkpoint map. */
export async function getCheckpointStatuses(): Promise<CheckpointStatus[]> {
  const [grouped, onlineThresholdMs] = await Promise.all([
    prisma.checkResult.groupBy({
      by: ["region", "location", "status"],
      _count: { _all: true },
      _max: { checkedAt: true },
    }),
    getOnlineThresholdMs(),
  ]);

  return CHECKPOINTS.map((checkpoint) => {
    const rows = grouped.filter((row) => row.region === checkpoint.regionKey && row.location === checkpoint.name);

    const up = rows.find((row) => row.status === "up")?._count._all ?? 0;
    const down = rows.find((row) => row.status === "down")?._count._all ?? 0;
    const blocked = rows.find((row) => row.status === "blocked")?._count._all ?? 0;
    const total = up + down + blocked;
    const checked = total - blocked;
    const percentage = checked <= 0 ? 100 : Math.round((up / checked) * 100);

    const lastCheckedAt = rows.reduce<Date | null>((latest, row) => {
      const checkedAt = row._max.checkedAt;
      if (!checkedAt) return latest;
      return !latest || checkedAt > latest ? checkedAt : latest;
    }, null);

    return {
      name: checkpoint.name,
      regionKey: checkpoint.regionKey,
      regionLabel: REGION_LABELS[checkpoint.regionKey],
      lat: checkpoint.lat,
      lng: checkpoint.lng,
      up,
      down,
      blocked,
      total,
      percentage,
      lastCheckedAt: lastCheckedAt ? lastCheckedAt.toISOString() : null,
      online: lastCheckedAt ? Date.now() - lastCheckedAt.getTime() < onlineThresholdMs : false,
    } satisfies CheckpointStatus;
  });
}
