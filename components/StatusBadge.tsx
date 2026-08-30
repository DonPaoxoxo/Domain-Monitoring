import type { OverallStatus } from "@/types/monitor";
import { overallStatusStyles } from "@/lib/status";
import StatusDot from "./StatusDot";

interface StatusBadgeProps {
  status: OverallStatus;
}

/** Solid pill badge showing a status dot beside the status label. */
export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${overallStatusStyles[status]}`}
    >
      <StatusDot status={status} />
      {status}
    </span>
  );
}
