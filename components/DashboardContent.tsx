"use client";

import { useMemo, useState } from "react";
import type { DomainMonitor, TargetMarket } from "@/types/monitor";
import { matchesSeverityFilter, type SeverityFilter } from "@/lib/status";
import MarketTabs from "./MarketTabs";
import SummaryCards from "./SummaryCards";
import DashboardCharts from "./DashboardCharts";
import DomainTable from "./DomainTable";

interface DashboardContentProps {
  domains: DomainMonitor[];
}

export default function DashboardContent({ domains }: DashboardContentProps) {
  const [activeTab, setActiveTab] = useState<TargetMarket>("india");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("All");

  const tabDomains = useMemo(
    () => domains.filter((d) => d.targetMarket === activeTab),
    [domains, activeTab]
  );

  const visibleDomains = useMemo(
    () => tabDomains.filter((d) => matchesSeverityFilter(d.overallStatus, severityFilter)),
    [tabDomains, severityFilter]
  );

  const handleTabChange = (market: TargetMarket) => {
    setActiveTab(market);
    setSeverityFilter("All");
  };

  return (
    <>
      <MarketTabs active={activeTab} onChange={handleTabChange} />
      <SummaryCards domains={tabDomains} activeFilter={severityFilter} onFilterChange={setSeverityFilter} />
      <DashboardCharts domains={tabDomains} activeTab={activeTab} />
      <DomainTable key={activeTab} domains={visibleDomains} activeTab={activeTab} />
    </>
  );
}
