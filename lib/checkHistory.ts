import { prisma } from "@/lib/db";
import type { RegionKey, LocationStatus } from "@/types/monitor";

export const CHECK_HISTORY_PAGE_SIZE = 50;

export interface CheckHistoryEntry {
  id: number;
  domainId: number;
  domainName: string;
  region: RegionKey;
  location: string;
  nodeName: string;
  status: LocationStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  checkedAt: string;
}

export interface CheckHistoryFilters {
  domain?: string;
  region?: RegionKey;
  status?: LocationStatus;
  page?: number;
}

export interface CheckHistoryResult {
  entries: CheckHistoryEntry[];
  total: number;
  page: number;
  pageCount: number;
}

/** Loads a page of the append-only check history timelog, most recent first. */
export async function getCheckHistory(filters: CheckHistoryFilters = {}): Promise<CheckHistoryResult> {
  const page = Math.max(1, filters.page ?? 1);

  const where = {
    ...(filters.region ? { region: filters.region } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.domain
      ? {
          domain: {
            domain: { contains: filters.domain },
          },
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.checkLog.count({ where }),
    prisma.checkLog.findMany({
      where,
      orderBy: { checkedAt: "desc" },
      skip: (page - 1) * CHECK_HISTORY_PAGE_SIZE,
      take: CHECK_HISTORY_PAGE_SIZE,
      include: { domain: { select: { domain: true } } },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / CHECK_HISTORY_PAGE_SIZE));

  return {
    entries: rows.map((row) => ({
      id: row.id,
      domainId: row.domainId,
      domainName: row.domain.domain,
      region: row.region as RegionKey,
      location: row.location,
      nodeName: row.nodeName,
      status: row.status as LocationStatus,
      statusCode: row.statusCode,
      responseTimeMs: row.responseTimeMs,
      errorMessage: row.errorMessage,
      checkedAt: row.checkedAt.toISOString(),
    })),
    total,
    page,
    pageCount,
  };
}
