import { prisma } from "@/lib/db";
import { formatRelativeTime } from "@/lib/domains";
import type { TargetMarket } from "@/types/monitor";

export interface BulkImportRecord {
  id: number;
  fileName: string;
  market: TargetMarket;
  added: number;
  skipped: number;
  total: number;
  date: string;
}

/** Loads the most recent Bulk Import batches for the "Recent imports" table. */
export async function getRecentBulkImports(limit = 10): Promise<BulkImportRecord[]> {
  const rows = await prisma.bulkImportLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    fileName: row.fileName,
    market: row.market === "indonesia" ? "indonesia" : "india",
    added: row.added,
    skipped: row.skipped,
    total: row.added + row.skipped,
    date: formatRelativeTime(row.createdAt),
  }));
}
