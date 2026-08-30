"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { DomainMonitor, RegionKey, RegionStatus } from "@/types/monitor";
import { blockedRegionScoreStyles, getRegionPercentage, getRegionScoreStyles } from "@/lib/status";
import LastChecked from "./LastChecked";
import LiveCheckPanel from "./LiveCheckPanel";

interface DomainManageModalProps {
  domain: DomainMonitor;
  onClose: () => void;
}

export default function DomainManageModal({ domain, onClose }: DomainManageModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const regionEntries = (Object.entries(domain.regions) as [RegionKey, RegionStatus | undefined][]).filter(
    (entry): entry is [RegionKey, RegionStatus] => entry[1] !== undefined
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-md border border-border bg-surface shadow-md"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{domain.domain}</h3>
            <p className="mt-0.5 text-xs text-muted">{domain.url}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded p-1 text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-4 py-3">
          <div>
            <h4 className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">Region status</h4>
            <ul className="space-y-1">
              {regionEntries.map(([key, region]) => {
                const percentage = getRegionPercentage(region);
                const allBlocked = region.blocked > 0 && region.blocked === region.total;
                const checked = region.total - region.blocked;
                return (
                  <li
                    key={key}
                    className="flex items-center justify-between rounded border border-border bg-surface-muted px-2.5 py-1.5 text-[13px]"
                  >
                    <span className="font-medium text-foreground">{region.label}</span>
                    <span className="flex items-center gap-2 text-muted">
                      {allBlocked ? "Blocked" : `${region.up}/${checked} up`}
                      <span
                        className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[11px] font-semibold ${
                          allBlocked ? blockedRegionScoreStyles : getRegionScoreStyles(percentage)
                        }`}
                      >
                        {percentage}%
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">Overall status</span>
              <p className="mt-1 font-medium text-foreground">{domain.overallStatus}</p>
            </div>
            <div>
              <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">Last checked</span>
              <p className="mt-1 font-medium text-foreground">
                <LastChecked timestamp={domain.lastCheckedAt} />
              </p>
            </div>
          </div>

          <LiveCheckPanel domainId={domain.id} />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#20a8d8] px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#1c93bd]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
