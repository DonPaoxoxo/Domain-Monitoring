import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { REGION_LABELS } from "@/data/mockDomains";
import { getAlertSettings } from "@/lib/alertSettings";
import { getDomainMonitors } from "@/lib/domains";
import { getRegionPercentage } from "@/lib/status";
import type { DomainMonitor, OverallStatus } from "@/types/monitor";

export interface DispatchResult {
  success: boolean;
  error?: string;
}

const STATUS_EMOJI: Record<OverallStatus, string> = {
  Healthy: "✅",
  "Minor Issue": "⚠️",
  "Partial Issue": "🟧",
  "Major Issue": "🔴",
  Critical: "🚨",
};

/** Builds a nodemailer SMTP transport from env vars, or null if email isn't configured. */
function getTransport() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return null;

  const port = Number(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

/** Sends an email alert via SMTP. Reports an error (without throwing) if SMTP isn't configured. */
export async function sendEmailAlert(to: string, subject: string, text: string): Promise<DispatchResult> {
  const transport = getTransport();
  if (!transport) {
    return { success: false, error: "SMTP is not configured (set SMTP_HOST/SMTP_USER/SMTP_PASSWORD)." };
  }

  try {
    await transport.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to send email." };
  }
}

/** Posts a message to a Slack-compatible incoming webhook (or any endpoint accepting `{ text }` JSON). */
export async function sendWebhookAlert(url: string, text: string): Promise<DispatchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { success: false, error: `Webhook responded with ${response.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to reach webhook." };
  } finally {
    clearTimeout(timer);
  }
}

/** Formats a status-change notification for both email and webhook channels. */
function formatStatusChangeMessage(domain: DomainMonitor, previousStatus: OverallStatus): string {
  const target = domain.regions[domain.targetMarket];

  return [
    `${STATUS_EMOJI[domain.overallStatus]} ${domain.domain} is now ${domain.overallStatus} (was ${previousStatus})`,
    target ? `${REGION_LABELS[domain.targetMarket]}: ${getRegionPercentage(target)}% reachable` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

/**
 * Compares each domain's current overall status against the last status it was
 * alerted on, and dispatches email/webhook notifications for any that changed,
 * per the Severity Escalation rules in Alert Settings. A domain seen for the
 * first time just records a baseline without alerting.
 */
export async function evaluateAndDispatchAlerts(domainIds: number[]): Promise<void> {
  const uniqueIds = [...new Set(domainIds)];
  if (uniqueIds.length === 0) return;

  const [settings, monitors, states] = await Promise.all([
    getAlertSettings(),
    getDomainMonitors(uniqueIds),
    prisma.domainAlertState.findMany({ where: { domainId: { in: uniqueIds } } }),
  ]);

  const previousByDomain = new Map(states.map((state) => [state.domainId, state.lastStatus as OverallStatus]));

  for (const domain of monitors) {
    const previousStatus = previousByDomain.get(domain.id);

    if (previousStatus === undefined) {
      await prisma.domainAlertState.create({ data: { domainId: domain.id, lastStatus: domain.overallStatus } });
      continue;
    }

    if (previousStatus === domain.overallStatus) continue;

    await prisma.domainAlertState.update({
      where: { domainId: domain.id },
      data: { lastStatus: domain.overallStatus },
    });

    const rule = settings.escalation[domain.overallStatus];
    const text = formatStatusChangeMessage(domain, previousStatus);

    if (settings.emailEnabled && rule.email && settings.email) {
      const result = await sendEmailAlert(settings.email, `[Mi-hawk] ${domain.domain} is now ${domain.overallStatus}`, text);
      if (!result.success) console.error(`[alerts] Email alert failed for ${domain.domain}:`, result.error);
    }
    if (settings.webhookEnabled && rule.webhook && settings.webhookUrl) {
      const result = await sendWebhookAlert(settings.webhookUrl, text);
      if (!result.success) console.error(`[alerts] Webhook alert failed for ${domain.domain}:`, result.error);
    }
  }
}
