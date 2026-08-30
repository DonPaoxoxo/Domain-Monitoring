import type { DomainMonitor, RegionKey } from "@/types/monitor";
import { REGION_LABELS, REGION_LOCATIONS } from "@/data/mockDomains";
import { getLocationAggregates, getRegionBarColor, getRegionScoreStyles } from "@/lib/status";

interface RegionChecksOverviewProps {
  domains: DomainMonitor[];
}

const REGION_ORDER: RegionKey[] = ["india", "indonesia"];

export default function RegionChecksOverview({ domains }: RegionChecksOverviewProps) {
  return (
    <div className="space-y-4">
      {REGION_ORDER.map((regionKey) => {
        const locations = REGION_LOCATIONS[regionKey];
        const aggregates = getLocationAggregates(domains, regionKey, locations);
        const trackedDomains = domains.filter((d) => d.regions[regionKey] !== undefined).length;

        return (
          <div key={regionKey} className="rounded-md border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">{REGION_LABELS[regionKey]} Checkpoints</h2>
              <p className="mt-0.5 text-xs text-muted">
                {trackedDomains} domains monitored from {locations.length} location
                {locations.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-100 border-collapse text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-surface-muted text-left text-[10px] font-semibold tracking-wide text-muted uppercase">
                    <th className="px-4 py-2">Location</th>
                    <th className="px-4 py-2">Domains UP</th>
                    <th className="px-4 py-2">Availability</th>
                    <th className="px-4 py-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregates.map((location) => {
                    const percentage =
                      location.total === 0 ? 0 : Math.round((location.up / location.total) * 100);

                    return (
                      <tr key={location.name} className="border-b border-border last:border-b-0 hover:bg-surface-muted">
                        <td className="px-4 py-2 font-medium text-foreground">{location.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-muted">
                          {location.up}/{location.total} domains
                        </td>
                        <td className="px-4 py-2">
                          <div className="h-1 w-full max-w-50 overflow-hidden rounded-full bg-border">
                            <div
                              className={`h-full rounded-full ${getRegionBarColor(percentage)}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${getRegionScoreStyles(
                              percentage
                            )}`}
                          >
                            {percentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
