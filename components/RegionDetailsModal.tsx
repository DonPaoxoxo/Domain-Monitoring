"use client";

import { useEffect } from "react";
import { X, CheckCircle2, XCircle, ShieldAlert } from "lucide-react";
import type { DomainMonitor, RegionStatus } from "@/types/monitor";
import LastChecked from "./LastChecked";

interface RegionDetailsModalProps {
  domain: DomainMonitor;
  region: RegionStatus;
  onClose: () => void;
}

export default function RegionDetailsModal({ domain, region, onClose }: RegionDetailsModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const upLocations = region.locations.filter((loc) => loc.status === "up");
  const downLocations = region.locations.filter((loc) => loc.status === "down");
  const blockedLocations = region.locations.filter((loc) => loc.status === "blocked");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-md border border-border bg-surface shadow-md"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {domain.domain} — {region.label} Checkpoints
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              {region.blocked > 0
                ? `${region.up} of ${region.total - region.blocked} checked locations accessible (${region.blocked} blocked by checker)`
                : `${region.up} of ${region.total} locations accessible`}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              Last checked: <LastChecked timestamp={domain.lastCheckedAt} />
            </p>
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
          <section>
            <h4 className="mb-1.5 text-[11px] font-semibold tracking-wide text-[#3e8e41] uppercase dark:text-[#7ed99a]">
              Accessible Locations ({upLocations.length})
            </h4>
            {upLocations.length > 0 ? (
              <ul className="space-y-1">
                {upLocations.map((loc) => (
                  <li
                    key={loc.name}
                    className="flex items-center gap-2 rounded border border-[#c3e6c3] bg-[#f7fbf7] px-2.5 py-1.5 text-[13px] text-[#2a3b2f] dark:border-[#2f5d3f] dark:bg-[#1a2e22] dark:text-[#dff5e3]"
                  >
                    <CheckCircle2 size={14} className="shrink-0 text-[#5cb85c]" />
                    <span className="font-medium">{loc.name}</span>
                    <span className="text-muted">
                      — HTTP {loc.code} — {loc.response}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] text-muted">
                No accessible locations in this region right now.
              </p>
            )}
          </section>

          <section>
            <h4 className="mb-1.5 text-[11px] font-semibold tracking-wide text-[#c0392b] uppercase dark:text-[#e8847a]">
              Not Accessible Locations ({downLocations.length})
            </h4>
            {downLocations.length > 0 ? (
              <ul className="space-y-1">
                {downLocations.map((loc) => (
                  <li
                    key={loc.name}
                    className="flex items-center gap-2 rounded border border-[#f5c6c3] bg-[#fdf3f3] px-2.5 py-1.5 text-[13px] text-[#3b2a2a] dark:border-[#5d2f2f] dark:bg-[#2e1a1a] dark:text-[#f5dede]"
                  >
                    <XCircle size={14} className="shrink-0 text-[#d9534f]" />
                    <span className="font-medium">{loc.name}</span>
                    <span className="text-muted">— {loc.error}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] text-muted">
                All locations in this region are accessible.
              </p>
            )}
          </section>

          {blockedLocations.length > 0 && (
            <section>
              <h4 className="mb-1.5 text-[11px] font-semibold tracking-wide text-[#5a6b7d] uppercase dark:text-[#9fb0c3]">
                Blocked by Checker ({blockedLocations.length})
              </h4>
              <p className="mb-1.5 text-[11px] text-muted">
                The checker&apos;s own request was rejected by this site&apos;s CDN/WAF — this does not
                necessarily mean the site is down for real visitors.
              </p>
              <ul className="space-y-1">
                {blockedLocations.map((loc) => (
                  <li
                    key={loc.name}
                    className="flex items-center gap-2 rounded border border-[#d7e0ea] bg-[#f4f7fa] px-2.5 py-1.5 text-[13px] text-[#3b4654] dark:border-[#3d4a5c] dark:bg-[#222b36] dark:text-[#dde5ee]"
                  >
                    <ShieldAlert size={14} className="shrink-0 text-[#5a6b7d] dark:text-[#9fb0c3]" />
                    <span className="font-medium">{loc.name}</span>
                    <span className="text-muted">— {loc.error}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
