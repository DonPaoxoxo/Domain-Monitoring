import Link from "next/link";
import { UploadCloud } from "lucide-react";
import type { TargetMarket } from "@/types/monitor";

interface MarketTabsProps {
  active: TargetMarket;
  onChange: (market: TargetMarket) => void;
}

const TABS: { key: TargetMarket; label: string }[] = [
  { key: "india", label: "India + Global" },
  { key: "indonesia", label: "Indonesia + Global" },
];

const UPLOAD_LABELS: Record<TargetMarket, string> = {
  india: "Upload India domains",
  indonesia: "Upload Indonesia domains",
};

export default function MarketTabs({ active, onChange }: MarketTabsProps) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="inline-flex w-fit gap-1 rounded-md border border-border bg-surface p-1 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`rounded px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              active === tab.key
                ? "bg-[#20a8d8] text-white shadow-sm"
                : "text-muted hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <Link
        href="/bulk-import"
        className="inline-flex w-fit items-center gap-1.5 rounded-md border border-dashed border-[#20a8d8]/40 bg-[#eaf6fb] px-2.5 py-1.5 text-[12px] font-medium text-[#20a8d8] transition-colors hover:bg-[#20a8d8]/10"
      >
        <UploadCloud size={14} />
        {UPLOAD_LABELS[active]}
      </Link>
    </div>
  );
}
