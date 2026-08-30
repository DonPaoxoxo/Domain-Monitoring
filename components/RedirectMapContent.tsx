"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import type { RedirectGroup, RedirectMapData } from "@/lib/redirectMap";
import RedirectMapCard from "./RedirectMapCard";
import RedirectMapLegend from "./RedirectMapLegend";

interface RedirectMapContentProps {
  data: RedirectMapData;
}

function filterGroups(groups: RedirectGroup[], query: string): RedirectGroup[] {
  if (!query) return groups;
  const needle = query.toLowerCase();
  return groups.filter((group) => group.nodes.some((node) => node.domain.toLowerCase().includes(needle)));
}

export default function RedirectMapContent({ data }: RedirectMapContentProps) {
  const [search, setSearch] = useState("");

  const indiaGroups = useMemo(() => filterGroups(data.india, search), [data.india, search]);
  const indonesiaGroups = useMemo(() => filterGroups(data.indonesia, search), [data.indonesia, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search size={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search domains..."
          className="w-full rounded-md border border-border bg-surface py-1.5 pr-3 pl-8 text-sm text-foreground placeholder:text-muted focus:border-[#20a8d8] focus:outline-none"
        />
      </div>

      <RedirectMapLegend />

      <RedirectMapSection title="India Domains" groups={indiaGroups} hasSearch={search !== ""} />
      <RedirectMapSection title="Indonesia Domains" groups={indonesiaGroups} hasSearch={search !== ""} />

      <RedirectMapStats stats={data.stats} />
    </div>
  );
}

interface RedirectMapSectionProps {
  title: string;
  groups: RedirectGroup[];
  hasSearch: boolean;
}

function RedirectMapSection({ title, groups, hasSearch }: RedirectMapSectionProps) {
  return (
    <section className="rounded-md border border-border bg-surface p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {groups.length === 0 ? (
        <p className="text-sm text-muted">{hasSearch ? "No domains match your search." : "No domains in this market yet."}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <div key={group.nodes[0].id} className="flex flex-wrap items-center gap-2">
              {group.nodes.map((node, i) => (
                <div key={node.id} className="flex items-center gap-2">
                  <RedirectMapCard node={node} />
                  {i < group.nodes.length - 1 && (
                    <div className="flex flex-col items-center text-muted">
                      <ArrowRight size={16} />
                      {group.edges[i] && (
                        <span className="text-[10px] font-medium">
                          {group.edges[i].statusCode === 200 ? "Bridge" : group.edges[i].statusCode}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RedirectMapStats({ stats }: { stats: RedirectMapData["stats"] }) {
  const cards = [
    { label: "Total Domains", value: stats.total },
    { label: "Standalone / Active", value: stats.active },
    { label: "301 Redirects", value: stats.redirect301 },
    { label: "302 Redirects", value: stats.redirect302 },
    { label: "Bridge Pages", value: stats.bridge },
    { label: "Chains / Review", value: stats.chains },
    { label: "Not Connected", value: stats.broken },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
      {cards.map((card) => (
        <div key={card.label} className="rounded-md border border-border bg-surface px-3.5 py-2.5 shadow-sm">
          <p className="text-[11px] font-medium tracking-wide text-muted uppercase">{card.label}</p>
          <p className="mt-1 text-xl font-semibold text-foreground">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
