"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { DomainMonitor, OverallStatus, RegionKey } from "@/types/monitor";
import { getIncidents } from "@/lib/status";
import StatusBadge from "./StatusBadge";
import StatusDot from "./StatusDot";
import LastChecked from "./LastChecked";

interface IncidentsListProps {
  domains: DomainMonitor[];
}

const SEVERITY_FILTERS: ("All" | OverallStatus)[] = ["All", "Critical", "Major Issue", "Partial Issue", "Minor Issue"];

const REGION_FILTERS: { key: "All" | RegionKey; label: string }[] = [
  { key: "All", label: "All Regions" },
  { key: "india", label: "India" },
  { key: "indonesia", label: "Indonesia" },
];

export default function IncidentsList({ domains }: IncidentsListProps) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"All" | OverallStatus>("All");
  const [regionFilter, setRegionFilter] = useState<"All" | RegionKey>("All");

  const incidents = useMemo(() => getIncidents(domains), [domains]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return incidents.filter((incident) => {
      const matchesSearch =
        query === "" ||
        incident.domain.domain.toLowerCase().includes(query) ||
        incident.location.toLowerCase().includes(query);
      const matchesSeverity = severityFilter === "All" || incident.severity === severityFilter;
      const matchesRegion = regionFilter === "All" || incident.regionKey === regionFilter;
      return matchesSearch && matchesSeverity && matchesRegion;
    });
  }, [incidents, search, severityFilter, regionFilter]);

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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search domain or location..."
              className="w-full rounded-md border border-border bg-surface-muted py-1.5 pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8]"
            />
          </div>
          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value as "All" | OverallStatus)}
            className="w-full rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] text-foreground focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8] sm:w-44"
          >
            {SEVERITY_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === "All" ? "All Severities" : status}
              </option>
            ))}
          </select>
          <select
            value={regionFilter}
            onChange={(event) => setRegionFilter(event.target.value as "All" | RegionKey)}
            className="w-full rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] text-foreground focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8] sm:w-36"
          >
            {REGION_FILTERS.map((region) => (
              <option key={region.key} value={region.key}>
                {region.label}
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs whitespace-nowrap text-muted">
          {filtered.length} of {incidents.length} active incidents
        </span>
      </div>

      {/* Table */}
      <div className="max-h-[65vh] overflow-auto">
        <table className="w-full min-w-180 border-collapse text-[13px]">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-border bg-surface-muted text-left text-[10px] font-semibold tracking-wide text-muted uppercase">
              <th className="px-3 py-2">Domain</th>
              <th className="px-3 py-2">Region</th>
              <th className="px-3 py-2">Location</th>
              <th className="px-3 py-2">Issue</th>
              <th className="px-3 py-2">Severity</th>
              <th className="px-3 py-2">Detected</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((incident) => (
              <tr
                key={`${incident.domain.id}-${incident.regionKey}-${incident.location}`}
                className="border-b border-border last:border-b-0 hover:bg-surface-muted"
              >
                <td className="px-3 py-2 align-top">
                  <div className="flex items-center gap-2">
                    <StatusDot status={incident.severity} />
                    <div>
                      <div className="font-semibold text-foreground">{incident.domain.domain}</div>
                      <div className="text-[11px] text-muted">{incident.domain.url}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 align-top whitespace-nowrap text-muted">{incident.regionLabel}</td>
                <td className="px-3 py-2 align-top font-medium text-foreground">{incident.location}</td>
                <td className="px-3 py-2 align-top text-muted">{incident.reason}</td>
                <td className="px-3 py-2 align-top">
                  <StatusBadge status={incident.severity} />
                </td>
                <td className="px-3 py-2 align-top whitespace-nowrap text-muted">
                  <LastChecked timestamp={incident.domain.lastCheckedAt} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-[13px] text-muted">
                  No incidents match your search or filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
