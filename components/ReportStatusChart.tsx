"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import type { OverallStatus } from "@/types/monitor";
import type { ReportRow } from "@/lib/reports";
import { statusChartColors } from "@/lib/status";
import { useChartThemeColors } from "@/lib/useChartThemeColors";

ChartJS.register(ArcElement, Tooltip, Legend);

const STATUS_ORDER: OverallStatus[] = ["Healthy", "Minor Issue", "Partial Issue", "Major Issue", "Critical"];

interface ReportStatusChartProps {
  rows: ReportRow[];
}

export default function ReportStatusChart({ rows }: ReportStatusChartProps) {
  const colors = useChartThemeColors();

  const statusCounts = STATUS_ORDER.map((status) => rows.filter((row) => row.status === status).length);

  return (
    <div className="rounded-md border border-border bg-surface p-4 shadow-sm lg:col-span-2">
      <h2 className="text-sm font-semibold text-foreground">Status Distribution</h2>
      <p className="mt-0.5 text-xs text-muted">
        Overall status across {rows.length} domain{rows.length === 1 ? "" : "s"} for this period.
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
  );
}
