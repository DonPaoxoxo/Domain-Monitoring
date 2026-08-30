import { ArrowRight } from "lucide-react";
import type { RedirectMapNode, RedirectNodeStatus } from "@/lib/redirectMap";
import type { TargetMarket } from "@/types/monitor";

const STATUS_LABELS: Record<RedirectNodeStatus, string> = {
  active: "Active",
  "redirect-301": "301 Redirect",
  "redirect-302": "302 Redirect",
  bridge: "Bridge Page",
  broken: "Not Connected",
};

const STATUS_STYLES: Record<RedirectNodeStatus, string> = {
  active: "bg-[#5cb85c] text-white",
  "redirect-301": "bg-[#20a8d8] text-white",
  "redirect-302": "bg-[#f0ad4e] text-[#5a3c0a]",
  bridge: "bg-[#9b59b6] text-white",
  broken: "bg-[#d9534f] text-white",
};

export const MARKET_LABELS: Record<TargetMarket, string> = {
  india: "India",
  indonesia: "Indonesia",
};

export const MARKET_BADGE_STYLES: Record<TargetMarket, string> = {
  india: "bg-[#eaf6fb] text-[#1f7a9c]",
  indonesia: "bg-[#fdf2e3] text-[#b9770e]",
};

interface RedirectMapCardProps {
  node: RedirectMapNode;
}

export default function RedirectMapCard({ node }: RedirectMapCardProps) {
  const showTargetChip = node.redirectTargetId == null && node.redirectTargetHost != null;

  return (
    <div className="flex min-w-[200px] flex-col gap-2 rounded-md border border-border bg-surface px-3 py-2.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-foreground" title={node.domain}>
          {node.domain}
        </span>
        <span className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${MARKET_BADGE_STYLES[node.targetMarket]}`}>
          {MARKET_LABELS[node.targetMarket]}
        </span>
      </div>
      <span className={`inline-flex w-fit items-center rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[node.status]}`}>
        {STATUS_LABELS[node.status]}
      </span>
      {showTargetChip && (
        <span
          className="inline-flex w-fit items-center gap-1 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] text-muted"
          title={node.redirectTargetMarket ? "Redirects to a domain monitored in the other market" : "Redirects to a domain not monitored here"}
        >
          <ArrowRight size={11} />
          {node.redirectTargetMarket ? `${MARKET_LABELS[node.redirectTargetMarket]}: ${node.redirectTargetHost}` : node.redirectTargetHost}
        </span>
      )}
    </div>
  );
}
