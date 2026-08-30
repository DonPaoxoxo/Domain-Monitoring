import Link from "next/link";
import { CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import { REGION_LABELS } from "@/data/mockDomains";
import type { CheckHistoryResult } from "@/lib/checkHistory";
import type { LocationStatus, RegionKey } from "@/types/monitor";
import LastChecked from "./LastChecked";

interface CheckHistoryTableProps {
  result: CheckHistoryResult;
  filters: {
    domain?: string;
    region?: RegionKey;
    status?: LocationStatus;
  };
  pageSize: number;
}

const REGION_OPTIONS: RegionKey[] = ["india", "indonesia"];
const STATUS_OPTIONS: LocationStatus[] = ["up", "down", "blocked"];

const STATUS_BADGES: Record<LocationStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  up: {
    icon: CheckCircle2,
    className: "border-[#c3e6c3] bg-[#f7fbf7] text-[#3e8e41] dark:border-[#2f5d3f] dark:bg-[#1a2e22] dark:text-[#7ed99a]",
    label: "Up",
  },
  down: {
    icon: XCircle,
    className: "border-[#f5c6c3] bg-[#fdf3f3] text-[#c0392b] dark:border-[#5d2f2f] dark:bg-[#2e1a1a] dark:text-[#e8847a]",
    label: "Down",
  },
  blocked: {
    icon: ShieldAlert,
    className: "border-[#d7e0ea] bg-[#f4f7fa] text-[#5a6b7d] dark:border-[#3d4a5c] dark:bg-[#222b36] dark:text-[#9fb0c3]",
    label: "Blocked",
  },
};

function buildPageHref(filters: CheckHistoryTableProps["filters"], page: number): string {
  const params = new URLSearchParams();
  if (filters.domain) params.set("domain", filters.domain);
  if (filters.region) params.set("region", filters.region);
  if (filters.status) params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/check-history?${query}` : "/check-history";
}

export default function CheckHistoryTable({ result, filters, pageSize }: CheckHistoryTableProps) {
  const { entries, total, page, pageCount } = result;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, page * pageSize);

  return (
    <div className="space-y-3">
      <form className="flex flex-wrap items-end gap-2 rounded-md border border-border bg-surface p-3 shadow-sm">
        <div className="flex flex-col gap-1">
          <label htmlFor="domain" className="text-[11px] font-semibold tracking-wide text-muted uppercase">
            Domain
          </label>
          <input
            id="domain"
            name="domain"
            type="text"
            defaultValue={filters.domain ?? ""}
            placeholder="Search domain..."
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[#20a8d8]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="region" className="text-[11px] font-semibold tracking-wide text-muted uppercase">
            Region
          </label>
          <select
            id="region"
            name="region"
            defaultValue={filters.region ?? ""}
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-[#20a8d8]"
          >
            <option value="">All Regions</option>
            {REGION_OPTIONS.map((region) => (
              <option key={region} value={region}>
                {REGION_LABELS[region]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-[11px] font-semibold tracking-wide text-muted uppercase">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={filters.status ?? ""}
            className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-[#20a8d8]"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {STATUS_BADGES[status].label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md border border-border bg-surface-muted px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-border/40"
        >
          Filter
        </button>
        {(filters.domain || filters.region || filters.status) && (
          <Link
            href="/check-history"
            className="rounded-md border border-border bg-surface-muted px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-border/40"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="rounded-md border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Check History</h2>
            <p className="mt-0.5 text-xs text-muted">
              Every check reported by the checker fleet, most recent first (last 30 days).
            </p>
          </div>
          <p className="text-xs text-muted">
            {total === 0 ? "0 results" : `Showing ${rangeStart}-${rangeEnd} of ${total}`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-150 border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left text-[10px] font-semibold tracking-wide text-muted uppercase">
                <th className="px-4 py-2">Checked At</th>
                <th className="px-4 py-2">Domain</th>
                <th className="px-4 py-2">Region / Location</th>
                <th className="px-4 py-2">Node</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Response</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted">
                    No check history yet.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const badge = STATUS_BADGES[entry.status];
                  const Icon = badge.icon;
                  return (
                    <tr key={entry.id} className="border-b border-border last:border-b-0 hover:bg-surface-muted">
                      <td className="px-4 py-2 whitespace-nowrap text-muted">
                        <LastChecked timestamp={entry.checkedAt} />
                      </td>
                      <td className="px-4 py-2 font-medium text-foreground">{entry.domainName}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-muted">
                        {REGION_LABELS[entry.region]} · {entry.location}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-muted">{entry.nodeName}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${badge.className}`}
                        >
                          <Icon size={12} />
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-muted">
                        {entry.status === "up"
                          ? `HTTP ${entry.statusCode ?? "—"} · ${entry.responseTimeMs ?? "—"}ms`
                          : entry.errorMessage ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
            <Link
              href={buildPageHref(filters, page - 1)}
              aria-disabled={page <= 1}
              className={`rounded-md border border-border bg-surface-muted px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-border/40 ${
                page <= 1 ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Previous
            </Link>
            <p className="text-xs text-muted">
              Page {page} of {pageCount}
            </p>
            <Link
              href={buildPageHref(filters, page + 1)}
              aria-disabled={page >= pageCount}
              className={`rounded-md border border-border bg-surface-muted px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-border/40 ${
                page >= pageCount ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Next
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
