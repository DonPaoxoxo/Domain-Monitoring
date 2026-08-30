"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowDownWideNarrow } from "lucide-react";
import type { DomainMonitor, OverallStatus, RegionStatus, TargetMarket } from "@/types/monitor";
import { getRegion, getRowAccentClass, overallStatusSeverity } from "@/lib/status";
import { setDomainPaused, removeDomain as removeDomainAction } from "@/app/domains/actions";
import RegionScore from "./RegionScore";
import RegionDetailsModal from "./RegionDetailsModal";
import DomainManageModal from "./DomainManageModal";
import ManageMenu from "./ManageMenu";
import StatusBadge from "./StatusBadge";
import StatusDot from "./StatusDot";
import LastChecked from "./LastChecked";

interface DomainsDirectoryProps {
  domains: DomainMonitor[];
}

interface ModalState {
  domain: DomainMonitor;
  region: RegionStatus;
}

const PAGE_SIZE = 25;

const STATUS_FILTERS: ("All" | OverallStatus)[] = [
  "All",
  "Healthy",
  "Minor Issue",
  "Partial Issue",
  "Major Issue",
  "Critical",
];

const MARKET_FILTERS: { key: "All" | TargetMarket; label: string }[] = [
  { key: "All", label: "All Markets" },
  { key: "india", label: "India" },
  { key: "indonesia", label: "Indonesia" },
];

const MARKET_LABELS: Record<TargetMarket, string> = {
  india: "India",
  indonesia: "Indonesia",
};

const MARKET_BADGE_STYLES: Record<TargetMarket, string> = {
  india: "bg-[#eaf6fb] text-[#1f7a9c]",
  indonesia: "bg-[#fdf2e3] text-[#b9770e]",
};

export default function DomainsDirectory({ domains }: DomainsDirectoryProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState<"All" | TargetMarket>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | OverallStatus>("All");
  const [downFirst, setDownFirst] = useState(false);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [manageDomain, setManageDomain] = useState<DomainMonitor | null>(null);

  const filteredDomains = useMemo(() => {
    const query = search.trim().toLowerCase();

    let result = domains.filter((d) => {
      const matchesSearch =
        query === "" ||
        d.domain.toLowerCase().includes(query) ||
        d.group.toLowerCase().includes(query);
      const matchesMarket = marketFilter === "All" || d.targetMarket === marketFilter;
      const matchesStatus = statusFilter === "All" || d.overallStatus === statusFilter;
      return matchesSearch && matchesMarket && matchesStatus;
    });

    if (downFirst) {
      result = [...result].sort(
        (a, b) => overallStatusSeverity[a.overallStatus] - overallStatusSeverity[b.overallStatus]
      );
    }

    return result;
  }, [domains, search, marketFilter, statusFilter, downFirst]);

  const pageCount = Math.max(1, Math.ceil(filteredDomains.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageDomains = filteredDomains.slice(pageStart, pageStart + PAGE_SIZE);

  const rangeStart = filteredDomains.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = Math.min(filteredDomains.length, pageStart + PAGE_SIZE);

  const goToPage = (p: number) => setPage(Math.max(1, Math.min(p, pageCount)));

  const resetPage = () => setPage(1);

  const getPageNumbers = () => {
    if (pageCount <= 5) return Array.from({ length: pageCount }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= pageCount - 2) return [pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  };

  const togglePaused = (d: DomainMonitor) => {
    startTransition(async () => {
      await setDomainPaused(d.id, !d.paused);
      router.refresh();
    });
  };

  const removeDomain = (d: DomainMonitor) => {
    if (!window.confirm(`Permanently remove ${d.domain} and its check history? This cannot be undone.`)) return;
    startTransition(async () => {
      await removeDomainAction(d.id);
      router.refresh();
    });
  };

  return (
    <div className="rounded-md border border-border bg-surface shadow-sm">
      {/* Search & filter row */}
      <div className="flex flex-col gap-2.5 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(event) => { setSearch(event.target.value); resetPage(); }}
              placeholder="Search domain or group..."
              className="w-full rounded-md border border-border bg-surface-muted py-1.5 pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8]"
            />
          </div>
          <select
            value={marketFilter}
            onChange={(event) => { setMarketFilter(event.target.value as "All" | TargetMarket); resetPage(); }}
            className="w-full rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] text-foreground focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8] sm:w-36"
          >
            {MARKET_FILTERS.map((market) => (
              <option key={market.key} value={market.key}>
                {market.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value as "All" | OverallStatus); resetPage(); }}
            className="w-full rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] text-foreground focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8] sm:w-44"
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === "All" ? "All Statuses" : status}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => { setDownFirst((value) => !value); resetPage(); }}
          className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
            downFirst
              ? "border-[#d9534f] bg-[#fbeaea] text-[#d9534f]"
              : "border-border bg-surface-muted text-foreground hover:bg-border/40"
          }`}
        >
          <ArrowDownWideNarrow size={14} />
          Down first
        </button>
      </div>

      {/* Table */}
      <div className="overflow-auto">
        <table className="w-full min-w-220 border-collapse text-[13px]">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-border bg-surface-muted text-left text-[10px] font-semibold tracking-wide text-muted uppercase">
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">Market</th>
              <th className="px-3 py-2">Target Region</th>
              <th className="px-3 py-2">Overall Status</th>
              <th className="px-3 py-2">Last Checked</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageDomains.map((d) => {
              const targetRegion = getRegion(d, d.targetMarket);

              return (
                <tr
                  key={d.id}
                  className={`border-b border-border last:border-b-0 hover:bg-surface-muted ${getRowAccentClass(d.overallStatus)}`}
                >
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-2">
                      <StatusDot status={d.overallStatus} />
                      <div>
                        <div className="font-semibold text-foreground">{d.domain}</div>
                        <div className="text-[11px] text-muted">{d.url}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${MARKET_BADGE_STYLES[d.targetMarket]}`}
                    >
                      {MARKET_LABELS[d.targetMarket]}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <RegionScore region={targetRegion} onDetails={() => setModal({ domain: d, region: targetRegion })} />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={d.overallStatus} />
                      {d.paused && (
                        <span className="inline-flex items-center rounded bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-muted">
                          Paused
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top whitespace-nowrap text-muted">
                    <LastChecked timestamp={d.lastCheckedAt} />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <ManageMenu
                      paused={d.paused}
                      onManage={() => setManageDomain(d)}
                      onTogglePause={() => togglePaused(d)}
                      onRemove={() => removeDomain(d)}
                    />
                  </td>
                </tr>
              );
            })}
            {filteredDomains.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-[13px] text-muted">
                  No domains match your search or filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>
          {filteredDomains.length === 0
            ? "No domains"
            : `Showing ${rangeStart}–${rangeEnd} of ${filteredDomains.length} domains`}
          {filteredDomains.length !== domains.length && ` (filtered from ${domains.length})`}
        </span>
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="rounded border border-border px-2 py-1 hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-50"
            >
              Previous
            </button>
            {getPageNumbers().map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => goToPage(p)}
                className={`rounded border px-2.5 py-1 ${
                  p === currentPage
                    ? "border-[#20a8d8] bg-[#20a8d8] text-white"
                    : "border-border hover:bg-surface-muted"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= pageCount}
              className="rounded border border-border px-2 py-1 hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {modal && (
        <RegionDetailsModal domain={modal.domain} region={modal.region} onClose={() => setModal(null)} />
      )}

      {manageDomain && <DomainManageModal domain={manageDomain} onClose={() => setManageDomain(null)} />}
    </div>
  );
}
