"use client";

import { useMemo, useState } from "react";
import {
  Search,
  ArrowDownWideNarrow,
  FileDown,
  FileSpreadsheet,
  Globe,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Percent,
  type LucideIcon,
} from "lucide-react";
import type { DomainMonitor, OverallStatus, TargetMarket } from "@/types/monitor";
import { getRegionScoreStyles, overallStatusSeverity } from "@/lib/status";
import {
  REPORT_PERIODS,
  REPORT_PERIOD_DESCRIPTIONS,
  buildReportRows,
  buildReportSummary,
  getPeriodRangeLabel,
  type ReportPeriod,
} from "@/lib/reports";
import ReportStatusChart from "./ReportStatusChart";
import StatusBadge from "./StatusBadge";
import StatusDot from "./StatusDot";

interface ReportsContentProps {
  domains: DomainMonitor[];
}

const STATUS_FILTERS: ("All" | OverallStatus)[] = [
  "All",
  "Healthy",
  "Minor Issue",
  "Partial Issue",
  "Major Issue",
  "Critical",
];

const MARKET_FILTERS: { key: "All" | TargetMarket; label: string }[] = [
  { key: "All", label: "All Markets" },
  { key: "india", label: "India" },
  { key: "indonesia", label: "Indonesia" },
];

const MARKET_LABELS: Record<TargetMarket, string> = {
  india: "India",
  indonesia: "Indonesia",
};

const MARKET_BADGE_STYLES: Record<TargetMarket, string> = {
  india: "bg-[#eaf6fb] text-[#1f7a9c]",
  indonesia: "bg-[#fdf2e3] text-[#b9770e]",
};

const REPORT_TABLE_HEAD = [
  "Domain",
  "Group",
  "Market",
  "Target Uptime %",
  "Overall Uptime %",
  "Status",
  "Incidents",
];

interface SummaryCardConfig {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClass: string;
  iconBgClass: string;
}

export default function ReportsContent({ domains }: ReportsContentProps) {
  const [period, setPeriod] = useState<ReportPeriod>("daily");
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState<"All" | TargetMarket>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | OverallStatus>("All");
  const [worstFirst, setWorstFirst] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);

  const allRows = useMemo(() => buildReportRows(domains, period), [domains, period]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    let result = allRows.filter((row) => {
      const matchesSearch =
        query === "" ||
        row.domain.domain.toLowerCase().includes(query) ||
        row.domain.group.toLowerCase().includes(query);
      const matchesMarket = marketFilter === "All" || row.domain.targetMarket === marketFilter;
      const matchesStatus = statusFilter === "All" || row.status === statusFilter;
      return matchesSearch && matchesMarket && matchesStatus;
    });

    if (worstFirst) {
      result = [...result].sort(
        (a, b) => overallStatusSeverity[a.status] - overallStatusSeverity[b.status]
      );
    }

    return result;
  }, [allRows, search, marketFilter, statusFilter, worstFirst]);

  const summary = useMemo(() => buildReportSummary(filteredRows), [filteredRows]);
  const rangeLabel = useMemo(() => getPeriodRangeLabel(period), [period]);
  const periodLabel = REPORT_PERIODS.find((tab) => tab.key === period)?.label ?? "Daily";

  const attentionRows = useMemo(
    () =>
      filteredRows
        .filter((row) => row.status !== "Healthy")
        .sort((a, b) => overallStatusSeverity[a.status] - overallStatusSeverity[b.status])
        .slice(0, 5),
    [filteredRows]
  );

  const summaryCards: SummaryCardConfig[] = [
    {
      label: "Total Domains",
      value: String(summary.total),
      icon: Globe,
      iconClass: "text-[#20a8d8]",
      iconBgClass: "bg-[#eaf6fb]",
    },
    {
      label: "Healthy",
      value: String(summary.healthy),
      icon: ShieldCheck,
      iconClass: "text-[#5cb85c]",
      iconBgClass: "bg-[#eaf6ea]",
    },
    {
      label: "Issues",
      value: String(summary.issues),
      icon: AlertTriangle,
      iconClass: "text-[#f0ad4e]",
      iconBgClass: "bg-[#fdf3e3]",
    },
    {
      label: "Critical",
      value: String(summary.critical),
      icon: AlertOctagon,
      iconClass: "text-[#d9534f]",
      iconBgClass: "bg-[#fbeaea]",
    },
    {
      label: "Avg Uptime",
      value: `${summary.avgUptime}%`,
      icon: Percent,
      iconClass: "text-[#5b6b79]",
      iconBgClass: "bg-[#eef2f6]",
    },
  ];

  const handleExportPDF = async () => {
    setExporting("pdf");
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.text("Mi-hawk Domain Status Report", 14, 18);

      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(`${periodLabel} report — ${rangeLabel}`, 14, 25);
      doc.text(`Generated ${new Date().toLocaleString()}`, 14, 30);

      doc.setTextColor(0);
      doc.text(
        `Total ${summary.total}  |  Healthy ${summary.healthy}  |  Issues ${summary.issues}  |  Critical ${summary.critical}  |  Avg Uptime ${summary.avgUptime}%  |  Incidents ${summary.totalIncidents}`,
        14,
        38
      );

      autoTable(doc, {
        startY: 44,
        head: [REPORT_TABLE_HEAD],
        body: filteredRows.map((row) => [
          row.domain.domain,
          row.domain.group,
          MARKET_LABELS[row.domain.targetMarket],
          `${row.targetUptime}%`,
          `${row.overallUptime}%`,
          row.status,
          String(row.incidents),
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [32, 168, 216], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 248, 250] },
      });

      const dateStamp = new Date().toISOString().slice(0, 10);
      doc.save(`mi-hawk-${period}-report-${dateStamp}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    setExporting("excel");
    try {
      const { Workbook } = await import("exceljs");
      const workbook = new Workbook();
      const sheet = workbook.addWorksheet(`${periodLabel} Report`);

      sheet.addRow([`Mi-hawk ${periodLabel} Domain Status Report`]);
      sheet.addRow([`Range: ${rangeLabel}`]);
      sheet.addRow([`Generated: ${new Date().toLocaleString()}`]);
      sheet.addRow([]);
      sheet.addRow(["Total Domains", "Healthy", "Issues", "Critical", "Avg Uptime %", "Total Incidents"]);
      sheet.addRow([summary.total, summary.healthy, summary.issues, summary.critical, summary.avgUptime, summary.totalIncidents]);
      sheet.addRow([]);

      const headerRow = sheet.addRow(REPORT_TABLE_HEAD);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF20A8D8" } };
      });

      filteredRows.forEach((row) => {
        sheet.addRow([
          row.domain.domain,
          row.domain.group,
          MARKET_LABELS[row.domain.targetMarket],
          row.targetUptime,
          row.overallUptime,
          row.status,
          row.incidents,
        ]);
      });

      sheet.columns.forEach((column) => {
        column.width = 18;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStamp = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `mi-hawk-${period}-report-${dateStamp}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      {/* Period tabs + export actions */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit gap-1 rounded-md border border-border bg-surface p-1 shadow-sm">
          {REPORT_PERIODS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPeriod(tab.key)}
              className={`rounded px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                period === tab.key
                  ? "bg-[#20a8d8] text-white shadow-sm"
                  : "text-muted hover:bg-surface-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={exporting !== null}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-border/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileDown size={14} className="text-[#d9534f]" />
            {exporting === "pdf" ? "Exporting…" : "Export PDF"}
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting !== null}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-border/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileSpreadsheet size={14} className="text-[#5cb85c]" />
            {exporting === "excel" ? "Exporting…" : "Export Excel"}
          </button>
        </div>
      </div>

      {/* Period info */}
      <div className="rounded-md border border-border bg-surface px-3.5 py-2.5 shadow-sm">
        <p className="text-sm font-semibold text-foreground">
          {periodLabel} Report <span className="font-normal text-muted">&middot; {rangeLabel}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted">{REPORT_PERIOD_DESCRIPTIONS[period]}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3.5 py-2.5 shadow-sm"
          >
            <div>
              <p className="text-[11px] font-medium tracking-wide text-muted uppercase">{card.label}</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{card.value}</p>
            </div>
            <div className={`flex h-9 w-9 items-center justify-center rounded-md ${card.iconBgClass}`}>
              <card.icon size={18} className={card.iconClass} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <ReportStatusChart rows={filteredRows} />

        <div className="rounded-md border border-border bg-surface p-4 shadow-sm lg:col-span-3">
          <h2 className="text-sm font-semibold text-foreground">Domains Needing Attention</h2>
          <p className="mt-0.5 text-xs text-muted">Lowest overall uptime for this period.</p>
          <ul className="mt-3 space-y-1.5">
            {attentionRows.map((row) => (
              <li
                key={row.domain.id}
                className="flex items-center justify-between gap-3 rounded border border-border bg-surface-muted px-2.5 py-1.5 text-[13px]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <StatusDot status={row.status} />
                  <span className="truncate font-medium text-foreground">{row.domain.domain}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[11px] font-semibold ${getRegionScoreStyles(
                      row.overallUptime
                    )}`}
                  >
                    {row.overallUptime}%
                  </span>
                  <StatusBadge status={row.status} />
                </div>
              </li>
            ))}
            {attentionRows.length === 0 && (
              <li className="px-2.5 py-6 text-center text-[13px] text-muted">
                All domains are healthy for this period.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Table */}
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
                placeholder="Search domain or group..."
                className="w-full rounded-md border border-border bg-surface-muted py-1.5 pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8]"
              />
            </div>
            <select
              value={marketFilter}
              onChange={(event) => setMarketFilter(event.target.value as "All" | TargetMarket)}
              className="w-full rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] text-foreground focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8] sm:w-36"
            >
              {MARKET_FILTERS.map((market) => (
                <option key={market.key} value={market.key}>
                  {market.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "All" | OverallStatus)}
              className="w-full rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] text-foreground focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8] sm:w-44"
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All Statuses" : status}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setWorstFirst((value) => !value)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
              worstFirst
                ? "border-[#d9534f] bg-[#fbeaea] text-[#d9534f]"
                : "border-border bg-surface-muted text-foreground hover:bg-border/40"
            }`}
          >
            <ArrowDownWideNarrow size={14} />
            Worst first
          </button>
        </div>

        {/* Table */}
        <div className="max-h-[55vh] overflow-auto">
          <table className="w-full min-w-220 border-collapse text-[13px]">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-border bg-surface-muted text-left text-[10px] font-semibold tracking-wide text-muted uppercase">
                <th className="px-3 py-2">Domain</th>
                <th className="px-3 py-2">Group</th>
                <th className="px-3 py-2">Market</th>
                <th className="px-3 py-2">Target Uptime</th>
                <th className="px-3 py-2">Overall Uptime</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Incidents</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.domain.id} className="border-b border-border last:border-b-0 hover:bg-surface-muted">
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-2">
                      <StatusDot status={row.status} />
                      <div>
                        <div className="font-semibold text-foreground">{row.domain.domain}</div>
                        <div className="text-[11px] text-muted">{row.targetRegionLabel}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span className="inline-flex rounded bg-[#eef2f6] px-1.5 py-0.5 text-[11px] font-medium text-[#5b6b79]">
                      {row.domain.group}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${MARKET_BADGE_STYLES[row.domain.targetMarket]}`}
                    >
                      {MARKET_LABELS[row.domain.targetMarket]}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[11px] font-semibold ${getRegionScoreStyles(
                        row.targetUptime
                      )}`}
                    >
                      {row.targetUptime}%
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[11px] font-semibold ${getRegionScoreStyles(
                        row.overallUptime
                      )}`}
                    >
                      {row.overallUptime}%
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-3 py-2 align-top text-muted">{row.incidents}</td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-[13px] text-muted">
                    No domains match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-3 py-2.5 text-[11px] text-muted">
          <span>
            Showing {filteredRows.length} of {allRows.length} domains for the {periodLabel.toLowerCase()} report
          </span>
          <span>Exports reflect the filtered view above.</span>
        </div>
      </div>
    </>
  );
}
