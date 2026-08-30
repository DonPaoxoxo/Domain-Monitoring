"use client";

import { useMemo, useState } from "react";
import type { DomainMonitor } from "@/types/monitor";
import { matchesSeverityFilter, type SeverityFilter } from "@/lib/status";
import SummaryCards from "./SummaryCards";
import DomainsDirectory from "./DomainsDirectory";

interface DomainsPageContentProps {
  domains: DomainMonitor[];
}

export default function DomainsPageContent({ domains }: DomainsPageContentProps) {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("All");

  const visibleDomains = useMemo(
    () => domains.filter((d) => matchesSeverityFilter(d.overallStatus, severityFilter)),
    [domains, severityFilter]
  );

  return (
    <>
      <SummaryCards domains={domains} activeFilter={severityFilter} onFilterChange={setSeverityFilter} />
      <DomainsDirectory domains={visibleDomains} />
    </>
  );
}
