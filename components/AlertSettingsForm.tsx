"use client";

import { useState, useTransition } from "react";
import { Mail, Webhook, MessageSquareWarning } from "lucide-react";
import type { OverallStatus, RegionKey } from "@/types/monitor";
import type { AlertSettingsData, EscalationRule } from "@/lib/alertSettings";
import { REGION_LABELS } from "@/data/mockDomains";
import { saveAlertSettingsAction, sendTestAlertAction, type TestAlertResult } from "@/app/alert-settings/actions";
import StatusBadge from "./StatusBadge";
import Toggle from "./Toggle";

const REGION_ORDER: RegionKey[] = ["india", "indonesia"];
const THRESHOLD_OPTIONS = [50, 70, 90, 100];
const ESCALATION_SEVERITIES: OverallStatus[] = ["Critical", "Major Issue", "Partial Issue", "Minor Issue"];

const RESPONSE_TARGETS: Record<OverallStatus, string> = {
  Critical: "Immediate",
  "Major Issue": "Within 15 min",
  "Partial Issue": "Within 1 hour",
  "Minor Issue": "Daily digest",
  Healthy: "—",
};

interface AlertSettingsFormProps {
  settings: AlertSettingsData;
}

export default function AlertSettingsForm({ settings }: AlertSettingsFormProps) {
  const [emailEnabled, setEmailEnabled] = useState(settings.emailEnabled);
  const [email, setEmail] = useState(settings.email);
  const [webhookEnabled, setWebhookEnabled] = useState(settings.webhookEnabled);
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl);
  const [smsEnabled, setSmsEnabled] = useState(settings.smsEnabled);
  const [smsNumber, setSmsNumber] = useState(settings.smsNumber);

  const [thresholds, setThresholds] = useState<Record<RegionKey, number>>(settings.thresholds);

  const [escalation, setEscalation] = useState<Record<OverallStatus, EscalationRule>>(settings.escalation);

  const [isSaving, startSaving] = useTransition();
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isTesting, startTesting] = useTransition();
  const [testResults, setTestResults] = useState<TestAlertResult[] | null>(null);

  const updateEscalation = (status: OverallStatus, channel: keyof EscalationRule, value: boolean) => {
    setEscalation((prev) => ({ ...prev, [status]: { ...prev[status], [channel]: value } }));
  };

  const handleTest = () => {
    setTestResults(null);
    startTesting(async () => {
      const results = await sendTestAlertAction({ emailEnabled, email, webhookEnabled, webhookUrl });
      setTestResults(results);
    });
  };

  const handleSave = () => {
    setSaveMessage(null);
    startSaving(async () => {
      const result = await saveAlertSettingsAction({
        emailEnabled,
        email,
        webhookEnabled,
        webhookUrl,
        smsEnabled,
        smsNumber,
        thresholds,
        escalation,
      });
      setSaveMessage(
        result.success
          ? { type: "success", text: "Settings saved." }
          : { type: "error", text: result.error ?? "Failed to save settings." }
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Notification channels */}
      <div className="rounded-md border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Notification channels</h2>
        <p className="mt-0.5 text-xs text-muted">Choose where alerts about domain visibility issues are sent.</p>

        <div className="mt-4 space-y-3">
          <div className="rounded-md border border-border p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#eaf6fb] text-[#20a8d8]">
                  <Mail size={15} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Email alerts</p>
                  <p className="text-xs text-muted">Send a summary email when a domain&apos;s status changes.</p>
                </div>
              </div>
              <Toggle checked={emailEnabled} onChange={setEmailEnabled} />
            </div>
            {emailEnabled && (
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ops@example.com"
                className="mt-3 w-full rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8]"
              />
            )}
          </div>

          <div className="rounded-md border border-border p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#eaf6ea] text-[#3e8e41]">
                  <Webhook size={15} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Slack / Webhook</p>
                  <p className="text-xs text-muted">Post alert messages to a Slack channel or custom webhook URL.</p>
                </div>
              </div>
              <Toggle checked={webhookEnabled} onChange={setWebhookEnabled} />
            </div>
            {webhookEnabled && (
              <input
                type="url"
                value={webhookUrl}
                onChange={(event) => setWebhookUrl(event.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="mt-3 w-full rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8]"
              />
            )}
          </div>

          <div className="rounded-md border border-border p-3 opacity-60">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#fdf2e3] text-[#b9770e]">
                  <MessageSquareWarning size={15} />
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    SMS alerts
                    <span className="rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase">
                      Coming soon
                    </span>
                  </p>
                  <p className="text-xs text-muted">Critical-only text messages to the on-call number.</p>
                </div>
              </div>
              <Toggle checked={smsEnabled} onChange={setSmsEnabled} disabled />
            </div>
            {smsEnabled && (
              <input
                type="tel"
                value={smsNumber}
                onChange={(event) => setSmsNumber(event.target.value)}
                placeholder="+91 90000 00000"
                className="mt-3 w-full rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8]"
              />
            )}
          </div>
        </div>
      </div>

      {/* Region thresholds */}
      <div className="rounded-md border border-border bg-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">Region availability thresholds</h2>
        <p className="mt-0.5 text-xs text-muted">
          Trigger an alert when a region&apos;s checkpoint availability falls below this percentage.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {REGION_ORDER.map((key) => (
            <div key={key} className="rounded-md border border-border p-3">
              <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">{REGION_LABELS[key]}</p>
              <select
                value={thresholds[key]}
                onChange={(event) =>
                  setThresholds((prev) => ({ ...prev, [key]: Number(event.target.value) }))
                }
                className="mt-2 w-full rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[13px] text-foreground focus:border-[#20a8d8] focus:outline-none focus:ring-1 focus:ring-[#20a8d8]"
              >
                {THRESHOLD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    Below {option}%
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Severity escalation */}
      <div className="rounded-md border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Severity escalation</h2>
          <p className="mt-0.5 text-xs text-muted">Decide which channels are notified for each severity level.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-100 border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-muted text-left text-[10px] font-semibold tracking-wide text-muted uppercase">
                <th className="px-4 py-2">Severity</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Slack / Webhook</th>
                <th className="px-4 py-2">Response target</th>
              </tr>
            </thead>
            <tbody>
              {ESCALATION_SEVERITIES.map((status) => (
                <tr key={status} className="border-b border-border last:border-b-0 hover:bg-surface-muted">
                  <td className="px-4 py-2">
                    <StatusBadge status={status} />
                  </td>
                  <td className="px-4 py-2">
                    <Toggle
                      checked={escalation[status].email}
                      onChange={(value) => updateEscalation(status, "email", value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Toggle
                      checked={escalation[status].webhook}
                      onChange={(value) => updateEscalation(status, "webhook", value)}
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-muted">{RESPONSE_TARGETS[status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {testResults && (
        <div className="space-y-1 rounded-md border border-border bg-surface-muted p-2.5 text-xs">
          {testResults.length === 0 ? (
            <p className="text-muted">Enable email or Slack/Webhook alerts above to send a test.</p>
          ) : (
            testResults.map((result) => (
              <p key={result.channel} className={result.success ? "text-[#3e8e41]" : "text-[#d9534f]"}>
                {result.channel === "email" ? "Email" : "Slack / Webhook"}:{" "}
                {result.success ? "Test alert sent successfully." : result.error}
              </p>
            ))
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {saveMessage && (
          <p className={`text-xs ${saveMessage.type === "success" ? "text-[#5cb85c]" : "text-[#d9534f]"}`}>
            {saveMessage.text}
          </p>
        )}
        <button
          type="button"
          onClick={handleTest}
          disabled={isTesting}
          className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:opacity-60"
        >
          {isTesting ? "Sending..." : "Send test alert"}
        </button>
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
