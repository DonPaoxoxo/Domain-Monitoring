"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, CheckCircle2, Loader2, ShieldAlert, XCircle } from "lucide-react";

interface LiveCheckPanelProps {
  domainId: number;
}

interface StepEvent {
  type: "step";
  message: string;
}

interface ResultEvent {
  type: "result";
  status: "up" | "down" | "blocked";
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  checkedAt: string;
}

type LiveCheckEvent = StepEvent | ResultEvent;

interface LogLine {
  time: string;
  message: string;
}

const RESULT_STYLES: Record<ResultEvent["status"], string> = {
  up: "border-[#c3e6c3] bg-[#eaf6ea] text-[#3e8e41] dark:border-[#2f5d3f] dark:bg-[#1a2e22] dark:text-[#7ed99a]",
  down: "border-[#f5c6c3] bg-[#fdedec] text-[#c0392b] dark:border-[#5d2f2f] dark:bg-[#2e1a1a] dark:text-[#e8847a]",
  blocked:
    "border-[#d7e0ea] bg-[#eef2f7] text-[#5a6b7d] dark:border-[#3d4a5c] dark:bg-[#2a3441] dark:text-[#9fb0c3]",
};

const RESULT_LABELS: Record<ResultEvent["status"], string> = {
  up: "UP",
  down: "DOWN",
  blocked: "BLOCKED",
};

/** Terminal-style trace of a live, real-time reachability check for one domain. */
export default function LiveCheckPanel({ domainId }: LiveCheckPanelProps) {
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [result, setResult] = useState<ResultEvent | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => sourceRef.current?.close();
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [lines]);

  const run = () => {
    sourceRef.current?.close();
    setLines([]);
    setResult(null);
    setRunning(true);

    const source = new EventSource(`/api/domains/${domainId}/live-check`);
    sourceRef.current = source;

    source.onmessage = (event) => {
      const data: LiveCheckEvent = JSON.parse(event.data);
      const time = new Date().toLocaleTimeString();

      if (data.type === "step") {
        setLines((prev) => [...prev, { time, message: data.message }]);
      } else {
        setResult(data);
        setRunning(false);
        source.close();
      }
    };

    source.onerror = () => {
      setLines((prev) => [...prev, { time: new Date().toLocaleTimeString(), message: "Connection lost." }]);
      setRunning(false);
      source.close();
    };
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h4 className="text-[11px] font-semibold tracking-wide text-muted uppercase">Live reachability check</h4>
        <button
          type="button"
          onClick={run}
          disabled={running}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#20a8d8] px-2.5 py-1 text-[12px] font-semibold text-[#20a8d8] transition-colors hover:bg-[#20a8d8]/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? <Loader2 size={13} className="animate-spin" /> : <Activity size={13} />}
          {running ? "Checking..." : "Run live check"}
        </button>
      </div>

      {lines.length === 0 && !result && (
        <p className="rounded border border-border bg-surface-muted px-2.5 py-1.5 text-[12px] text-muted">
          Runs a live check from the Mi-hawk server right now and shows each step (DNS lookup, HTTP request,
          response classification) as it happens.
        </p>
      )}

      {lines.length > 0 && (
        <div
          ref={logRef}
          className="max-h-40 overflow-y-auto rounded-md border border-[#2a2f3a] bg-[#11161d] p-2.5 font-mono text-[11.5px] leading-relaxed"
        >
          {lines.map((line, index) => (
            <div key={index} className="flex gap-2">
              <span className="shrink-0 text-[#4d5b6e]">{line.time}</span>
              <span className="text-[#d4d4d4]">
                <span className="text-[#5cb85c]">$</span> {line.message}
              </span>
            </div>
          ))}
          {running && (
            <div className="flex gap-2">
              <span className="shrink-0 text-[#4d5b6e]">{new Date().toLocaleTimeString()}</span>
              <span className="animate-pulse text-[#5cb85c]">_</span>
            </div>
          )}
        </div>
      )}

      {result && (
        <div
          className={`mt-2 flex flex-wrap items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-medium ${RESULT_STYLES[result.status]}`}
        >
          {result.status === "up" && <CheckCircle2 size={14} className="shrink-0" />}
          {result.status === "down" && <XCircle size={14} className="shrink-0" />}
          {result.status === "blocked" && <ShieldAlert size={14} className="shrink-0" />}
          <span>
            Result: {RESULT_LABELS[result.status]}
            {result.statusCode != null && ` — HTTP ${result.statusCode}`}
            {result.responseTimeMs != null && ` — ${result.responseTimeMs}ms`}
          </span>
          {result.errorMessage && <span className="text-[11px] opacity-80">({result.errorMessage})</span>}
        </div>
      )}
    </div>
  );
}
