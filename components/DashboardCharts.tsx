"use client";

import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import type { DomainMonitor, OverallStatus, RegionKey, TargetMarket } from "@/types/monitor";
import { REGION_LABELS, REGION_LOCATIONS } from "@/data/mockDomains";
import { getLocationAggregates, getRegionBarHexColor, statusChartColors } from "@/lib/status";
import { useChartThemeColors } from "@/lib/useChartThemeColors";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const STATUS_ORDER: OverallStatus[] = ["Healthy", "Minor Issue", "Partial Issue", "Major Issue", "Critical"];

const MARKET_REGION_KEYS: Record<TargetMarket, RegionKey> = {
  india: "india",
  indonesia: "indonesia",
};

interface DashboardChartsProps {
  domains: DomainMonitor[];
  activeTab: TargetMarket;
}

export default function DashboardCharts({ domains, activeTab }: DashboardChartsProps) {
  const colors = useChartThemeColors();

  const statusCounts = STATUS_ORDER.map(
    (status) => domains.filter((domain) => domain.overallStatus === status).length
  );

  const regionKey = MARKET_REGION_KEYS[activeTab];
  const locations = REGION_LOCATIONS[regionKey];
  const aggregates = getLocationAggregates(domains, regionKey, locations);
  const percentages = aggregates.map((location) =>
    location.total === 0 ? 0 : Math.round((location.up / location.total) * 100)
  );

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
      <div className="rounded-md border border-border bg-surface p-4 shadow-sm lg:col-span-2">
        <h2 className="text-sm font-semibold text-foreground">Status Distribution</h2>
        <p className="mt-0.5 text-xs text-muted">
          Overall status across {domains.length} monitored domain{domains.length === 1 ? "" : "s"}.
        </p>
        <div className="mt-4 h-56">
          <Doughnut
            data={{
              labels: STATUS_ORDER,
              datasets: [
                {
                  data: statusCounts,
                  backgroundColor: STATUS_ORDER.map((status) => statusChartColors[status]),
                  borderColor: colors.surface,
                  borderWidth: 2,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: "bottom",
                  labels: { color: colors.foreground, boxWidth: 12, padding: 12, font: { size: 11 } },
                },
                tooltip: {
                  backgroundColor: colors.surface,
                  titleColor: colors.foreground,
                  bodyColor: colors.foreground,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              },
            }}
          />
        </div>
      </div>

      <div className="rounded-md border border-border bg-surface p-4 shadow-sm lg:col-span-3">
        <h2 className="text-sm font-semibold text-foreground">{REGION_LABELS[regionKey]} Checkpoint Availability</h2>
        <p className="mt-0.5 text-xs text-muted">Percentage of monitored domains reachable from each location.</p>
        <div className="mt-4 h-56">
          <Bar
            data={{
              labels: aggregates.map((location) => location.name),
              datasets: [
                {
                  label: "Availability",
                  data: percentages,
                  backgroundColor: percentages.map((percentage) => getRegionBarHexColor(percentage)),
                  borderRadius: 4,
                  maxBarThickness: 28,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: colors.surface,
                  titleColor: colors.foreground,
                  bodyColor: colors.foreground,
                  borderColor: colors.border,
                  borderWidth: 1,
                  callbacks: {
                    label: (context) => `${context.parsed.y}% available`,
                  },
                },
              },
              scales: {
                x: {
                  ticks: { color: colors.muted, font: { size: 10 } },
                  grid: { display: false },
                },
                y: {
                  min: 0,
                  max: 100,
                  ticks: {
                    color: colors.muted,
                    font: { size: 10 },
                    callback: (value) => `${value}%`,
                  },
                  grid: { color: colors.border },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
