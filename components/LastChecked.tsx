"use client";

interface LastCheckedProps {
  timestamp: string | null;
}

const FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "medium",
});

/** Renders a check timestamp in the viewer's own timezone (server-rendered in the server's timezone, then corrected on hydration). */
export default function LastChecked({ timestamp }: LastCheckedProps) {
  if (!timestamp) return <>Never</>;

  return <span suppressHydrationWarning>{FORMATTER.format(new Date(timestamp))}</span>;
}
