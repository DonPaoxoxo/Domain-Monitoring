"use client";

import { useState, useTransition } from "react";
import { Copy, RefreshCw, Eye, EyeOff, Check } from "lucide-react";
import type { CheckerNodeStatus } from "@/lib/checkerNodes";
import type { AppSettingsData } from "@/lib/settings";
import { saveMonitoringDefaults, regenerateApiKey } from "@/app/system-settings/actions";

const CHECK_INTERVAL_OPTIONS = [
  "1 minute",
  "5 minutes",
  "15 minutes",
  "30 minutes",
  "1 hour",
  "2 hours",
  "3 hours",
  "4 hours",
  "6 hours",
  "12 hours",
];
const TIMEOUT_OPTIONS = ["5 seconds", "10 seconds", "15 seconds", "30 seconds"];
const RETRY_OPTIONS = [0, 1, 2, 3];

interface SystemSettingsFormProps {
  checkerNodes: CheckerNodeStatus[];
  settings: AppSettingsData;
}

function maskKey(key: string): string {
  if (!key) return "(not set)";
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.slice(0, 4)}${"•".repeat(Math.min(key.length - 8, 24))}${key.slice(-4)}`;
}

export default function SystemSettingsForm({ checkerNodes, settings }: SystemSettingsFormProps) {
  const [checkInterval, setCheckInterval] = useState(settings.checkInterval);
  const [requestTimeout, setRequestTimeout] = useState(settings.requestTimeout);
  const [retries, setRetries] = useState(settings.retries);

  const [isSaving, startSaving] = useTransition();
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [apiKey, setApiKey] = useState(settings.checkerApiKey);
  const [revealKey, setRevealKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRegenerating, startRegenerating] = useTransition();
  const [justRegenerated, setJustRegenerated] = useState(false);

  const onlineCount = checkerNodes.filter((node) => node.status === "Online").length;

  const handleSave = () => {
    setSaveMessage(null);
    startSaving(async () => {
      const result = await saveMonitoringDefaults(checkInterval, requestTimeout, retries);
      setSaveMessage(
        result.success
          ? { type: "success", text: "Settings saved." }
          : { type: "error", text: result.error ?? "Failed to save settings." }
      );
    });
  };

  const handleCopy = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    const confirmed = window.confirm(
      "Generate a new checker API key?\n\nAny checker node still using the old key will fail to authenticate until you update CHECKER_API_KEY in its .env file and restart it."
    );
    if (!confirmed) return;

    setJustRegenerated(false);
    startRegenerating(async () => {
      const newKey = await regenerateApiKey();
      setApiKey(newKey);
      setRevealKey(true);
      setJustRegenerated(true);
    });
  };

  return (
    <div className="space-y-4">
      {/* Monitoring defaults */}
      <div className="rounded-md border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Monitoring defaults</h2>
        <p className="mt-0.5 text-xs text-muted">Applied when new domains are added to the platform.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-[11px] font-semibold tracking-wide text-muted uppercase">Check interval</label>
            <select
              value={checkInterval}
              onChange={(event) => setCheckInterval(event.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] text-foreground focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8]"
            >
              {CHECK_INTERVAL_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold tracking-wide text-muted uppercase">Request timeout</label>
            <select
              value={requestTimeout}
              onChange={(event) => setRequestTimeout(event.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] text-foreground focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8]"
            >
              {TIMEOUT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold tracking-wide text-muted uppercase">Retry attempts</label>
            <select
              value={retries}
              onChange={(event) => setRetries(Number(event.target.value))}
              className="mt-2 w-full rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] text-foreground focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8]"
            >
              {RETRY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} {option === 1 ? "retry" : "retries"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Checker nodes */}
      <div className="rounded-md border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Checker nodes</h2>
          <p className="mt-0.5 text-xs text-muted">
            {onlineCount} of {checkerNodes.length} nodes online
          </p>
        </div>
        {checkerNodes.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted">No checker nodes have reported in yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-100 border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-muted text-left text-[10px] font-semibold tracking-wide text-muted uppercase">
                  <th className="px-4 py-2">Node</th>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Last Ping</th>
                </tr>
              </thead>
              <tbody>
                {checkerNodes.map((node) => (
                  <tr key={node.name} className="border-b border-border last:border-b-0 hover:bg-surface-muted">
                    <td className="px-4 py-2 font-medium text-foreground">{node.name}</td>
                    <td className="px-4 py-2 text-muted">{node.location}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <span
                          className={`inline-flex h-2 w-2 rounded-full ${
                            node.status === "Online" ? "bg-[#5cb85c]" : "bg-[#9aa7b3]"
                          }`}
                        />
                        {node.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-muted">{node.lastPing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* API access */}
      <div className="rounded-md border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">API access</h2>
        <p className="mt-0.5 text-xs text-muted">Bearer token used by checker nodes to submit results.</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              readOnly
              value={revealKey ? apiKey || "(not set)" : maskKey(apiKey)}
              className="w-full rounded-md border border-border bg-surface-muted px-2.5 py-1.5 pr-9 font-mono text-[13px] text-foreground focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8]"
            />
            <button
              type="button"
              onClick={() => setRevealKey((value) => !value)}
              title={revealKey ? "Hide key" : "Show key"}
              className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted transition-colors hover:text-foreground"
            >
              {revealKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!apiKey}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-border/40 disabled:opacity-60"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-border/40 disabled:opacity-60"
            >
              <RefreshCw size={13} className={isRegenerating ? "animate-spin" : ""} />
              Regenerate
            </button>
          </div>
        </div>
        {justRegenerated && (
          <p className="mt-2 text-[12px] text-[#f0ad4e]">
            New key generated. Update <code className="font-mono">CHECKER_API_KEY</code> in each checker node&apos;s
            .env file and restart it &mdash; the previous key no longer works.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-3">
        {saveMessage && (
          <p className={`text-xs ${saveMessage.type === "success" ? "text-[#5cb85c]" : "text-[#d9534f]"}`}>
            {saveMessage.text}
          </p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-[#20a8d8] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1c93bd] disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
