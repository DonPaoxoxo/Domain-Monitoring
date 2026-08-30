"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { CheckpointStatus } from "@/lib/checkpoints";
import LastChecked from "./LastChecked";

interface LiveCheckpointMapProps {
  initialCheckpoints: CheckpointStatus[];
  initialGeneratedAt: string;
}

const POLL_INTERVAL_MS = 30_000;

const OFFLINE_COLOR = "#9aa7b3";

const LEGEND: { label: string; color: string }[] = [
  { label: "Healthy", color: "#5cb85c" },
  { label: "Minor issue", color: "#f0ad4e" },
  { label: "Partial issue", color: "#f39c12" },
  { label: "Major / down", color: "#d9534f" },
  { label: "Checker offline", color: OFFLINE_COLOR },
];

const LeafletCheckpointMap = dynamic(() => import("./LeafletCheckpointMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-xs text-muted">Loading map…</div>,
});

export default function LiveCheckpointMap({ initialCheckpoints, initialGeneratedAt }: LiveCheckpointMapProps) {
  const [checkpoints, setCheckpoints] = useState(initialCheckpoints);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch("/api/checkpoints/live", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (cancelled) return;
        setCheckpoints(data.checkpoints);
        setGeneratedAt(data.generatedAt);
      } catch {
        // Keep showing the last known data if a poll fails.
      }
    };

    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const healthy = checkpoints.filter((c) => c.online && c.percentage === 100).length;
  const degraded = checkpoints.filter((c) => c.online && c.percentage > 0 && c.percentage < 100).length;
  const down = checkpoints.filter((c) => c.online && c.percentage === 0).length;
  const offline = checkpoints.filter((c) => !c.online).length;

  return (
    <div className="rounded-md border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5cb85c] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5cb85c]" />
            </span>
            Live Checkpoint Map
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {checkpoints.length} checkpoints · {healthy} healthy · {degraded} degraded · {down} down
            {offline > 0 ? ` · ${offline} checker offline` : ""}
          </p>
        </div>
        <p className="text-[11px] whitespace-nowrap text-muted">
          Updated <LastChecked timestamp={generatedAt} />
        </p>
      </div>

      <div className="p-4">
        <div className="relative h-105 w-full overflow-hidden rounded-md border border-border">
          <LeafletCheckpointMap checkpoints={checkpoints} />
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted">
          {LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
