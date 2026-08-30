import type { RegionStatus } from "@/types/monitor";
import { blockedRegionScoreStyles, getRegionBarColor, getRegionPercentage, getRegionScoreStyles } from "@/lib/status";

interface RegionScoreProps {
  region: RegionStatus;
  onDetails: () => void;
}

export default function RegionScore({ region, onDetails }: RegionScoreProps) {
  const percentage = getRegionPercentage(region);
  const allBlocked = region.blocked > 0 && region.blocked === region.total;
  const checked = region.total - region.blocked;

  return (
    <div className="flex min-w-27.5 flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
            allBlocked ? blockedRegionScoreStyles : getRegionScoreStyles(percentage)
          }`}
        >
          {allBlocked ? "Blocked" : `${region.up}/${checked} UP`}
        </span>
        <button
          type="button"
          onClick={onDetails}
          className="rounded px-1 py-0.5 text-[11px] font-medium text-[#20a8d8] hover:bg-[#eaf6fb] hover:underline"
        >
          Details
        </button>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full ${allBlocked ? "bg-[#9aa7b3]" : getRegionBarColor(percentage)}`}
          style={{ width: `${allBlocked ? 100 : percentage}%` }}
        />
      </div>
    </div>
  );
}
