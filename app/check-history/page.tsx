import AppShell from "@/components/AppShell";
import CheckHistoryTable from "@/components/CheckHistoryTable";
import { getCheckHistory, CHECK_HISTORY_PAGE_SIZE } from "@/lib/checkHistory";
import type { LocationStatus, RegionKey } from "@/types/monitor";

const VALID_REGIONS: RegionKey[] = ["india", "indonesia"];
const VALID_STATUSES: LocationStatus[] = ["up", "down", "blocked"];

interface CheckHistoryPageProps {
  searchParams: Promise<{ domain?: string; region?: string; status?: string; page?: string }>;
}

export default async function CheckHistoryPage({ searchParams }: CheckHistoryPageProps) {
  const params = await searchParams;

  const domain = params.domain?.trim() || undefined;
  const region = (VALID_REGIONS as string[]).includes(params.region ?? "") ? (params.region as RegionKey) : undefined;
  const status = (VALID_STATUSES as string[]).includes(params.status ?? "")
    ? (params.status as LocationStatus)
    : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const result = await getCheckHistory({ domain, region, status, page });

  return (
    <AppShell
      title="Check History"
      subtitle="Timelog of every domain check performed by the checker fleet, refreshed hourly."
    >
      <CheckHistoryTable result={result} filters={{ domain, region, status }} pageSize={CHECK_HISTORY_PAGE_SIZE} />
    </AppShell>
  );
}
