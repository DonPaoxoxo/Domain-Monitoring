"use client";

import { useSyncExternalStore } from "react";

interface ClockConfig {
  label: string;
  flag: string;
  timeZone: string;
  zoneLabel: string;
}

const CLOCKS: ClockConfig[] = [
  { label: "India", flag: "🇮🇳", timeZone: "Asia/Kolkata", zoneLabel: "IST" },
  { label: "Indonesia", flag: "🇮🇩", timeZone: "Asia/Jakarta", zoneLabel: "WIB" },
];

function formatClock(now: number, timeZone: string): { date: string; time: string } {
  const date = new Date(now);
  return {
    date: new Intl.DateTimeFormat("en-GB", { timeZone, day: "2-digit", month: "short" }).format(date),
    time: new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date),
  };
}

let cachedNow = Date.now();

function subscribe(callback: () => void) {
  const interval = setInterval(() => {
    cachedNow = Date.now();
    callback();
  }, 1000);
  return () => clearInterval(interval);
}

function getSnapshot() {
  return cachedNow;
}

function getServerSnapshot() {
  return 0;
}

export default function HeaderClocks() {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {CLOCKS.map((clock) => {
        const formatted = now > 0 ? formatClock(now, clock.timeZone) : null;
        return (
          <div
            key={clock.label}
            title={`${clock.label} time (${clock.zoneLabel})`}
            className="flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-foreground"
          >
            <span className="text-sm leading-none">{clock.flag}</span>
            <span className="tabular-nums">
              {formatted ? `${formatted.date} · ${formatted.time}` : "--:--:-- --"}
            </span>
            <span className="text-[10px] font-semibold text-muted">{clock.zoneLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
