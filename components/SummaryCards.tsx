import { Globe, ShieldCheck, AlertTriangle, AlertOctagon, type LucideIcon } from "lucide-react";
import type { DomainMonitor } from "@/types/monitor";
import type { SeverityFilter } from "@/lib/status";

interface SummaryCardsProps {
  domains: DomainMonitor[];
  activeFilter: SeverityFilter;
  onFilterChange: (filter: SeverityFilter) => void;
}

interface CardConfig {
  label: string;
  value: number;
  icon: LucideIcon;
  iconClass: string;
  iconBgClass: string;
  ringClass: string;
  filterKey: SeverityFilter;
}

export default function SummaryCards({ domains, activeFilter, onFilterChange }: SummaryCardsProps) {
  const total = domains.length;
  const healthy = domains.filter((d) => d.overallStatus === "Healthy").length;
  const partialIssue = domains.filter(
    (d) => d.overallStatus === "Minor Issue" || d.overallStatus === "Partial Issue"
  ).length;
  const critical = domains.filter(
    (d) => d.overallStatus === "Major Issue" || d.overallStatus === "Critical"
  ).length;

  const cards: CardConfig[] = [
    {
      label: "Total Domains",
      value: total,
      icon: Globe,
      iconClass: "text-[#20a8d8]",
      iconBgClass: "bg-[#eaf6fb]",
      ringClass: "ring-[#20a8d8]",
      filterKey: "All",
    },
    {
      label: "Healthy",
      value: healthy,
      icon: ShieldCheck,
      iconClass: "text-[#5cb85c]",
      iconBgClass: "bg-[#eaf6ea]",
      ringClass: "ring-[#5cb85c]",
      filterKey: "Healthy",
    },
    {
      label: "Partial Issue",
      value: partialIssue,
      icon: AlertTriangle,
      iconClass: "text-[#f0ad4e]",
      iconBgClass: "bg-[#fdf3e3]",
      ringClass: "ring-[#f0ad4e]",
      filterKey: "Partial Issue",
    },
    {
      label: "Critical",
      value: critical,
      icon: AlertOctagon,
      iconClass: "text-[#d9534f]",
      iconBgClass: "bg-[#fbeaea]",
      ringClass: "ring-[#d9534f]",
      filterKey: "Critical",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const isActive = activeFilter === card.filterKey;
        return (
          <button
            key={card.label}
            type="button"
            onClick={() => onFilterChange(isActive ? "All" : card.filterKey)}
            title={card.filterKey === "All" ? "Show all domains" : `Show only ${card.label.toLowerCase()} domains`}
            className={`flex items-center justify-between gap-3 rounded-md border bg-surface px-3.5 py-2.5 text-left shadow-sm transition-colors ${
              isActive
                ? `border-transparent ring-2 ${card.ringClass}`
                : "border-border hover:bg-surface-muted"
            }`}
          >
            <div>
              <p className="text-[11px] font-medium tracking-wide text-muted uppercase">{card.label}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{card.value}</p>
            </div>
            <div className={`flex h-9 w-9 items-center justify-center rounded-md ${card.iconBgClass}`}>
              <card.icon size={18} className={card.iconClass} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
