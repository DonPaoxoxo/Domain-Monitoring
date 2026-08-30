import { prisma } from "@/lib/db";
import type { OverallStatus, RegionKey } from "@/types/monitor";

export interface EscalationRule {
  email: boolean;
  webhook: boolean;
}

export type EscalationMap = Record<OverallStatus, EscalationRule>;

export interface AlertSettingsData {
  emailEnabled: boolean;
  email: string;
  webhookEnabled: boolean;
  webhookUrl: string;
  smsEnabled: boolean;
  smsNumber: string;
  thresholds: Record<RegionKey, number>;
  escalation: EscalationMap;
}

const DEFAULT_ESCALATION: EscalationMap = {
  Critical: { email: true, webhook: true },
  "Major Issue": { email: true, webhook: true },
  "Partial Issue": { email: true, webhook: false },
  "Minor Issue": { email: false, webhook: false },
  Healthy: { email: false, webhook: false },
};

/** Loads Alert Settings, falling back to defaults for anything never saved. */
export async function getAlertSettings(): Promise<AlertSettingsData> {
  const row = await prisma.alertSettings.findUnique({ where: { id: 1 } });

  let escalation = DEFAULT_ESCALATION;
  if (row?.escalation) {
    try {
      escalation = { ...DEFAULT_ESCALATION, ...JSON.parse(row.escalation) };
    } catch {
      escalation = DEFAULT_ESCALATION;
    }
  }

  return {
    emailEnabled: row?.emailEnabled ?? true,
    email: row?.email ?? "ops@mi-hawk.io",
    webhookEnabled: row?.webhookEnabled ?? true,
    webhookUrl: row?.webhookUrl ?? "https://hooks.slack.com/services/T000/B000/XXXXXXXX",
    smsEnabled: row?.smsEnabled ?? false,
    smsNumber: row?.smsNumber ?? "",
    thresholds: {
      india: row?.thresholdIndia ?? 70,
      indonesia: row?.thresholdIndonesia ?? 70,
    },
    escalation,
  };
}

/** Persists Alert Settings (a single configuration row). */
export async function saveAlertSettings(values: AlertSettingsData): Promise<void> {
  const data = {
    emailEnabled: values.emailEnabled,
    email: values.email,
    webhookEnabled: values.webhookEnabled,
    webhookUrl: values.webhookUrl,
    smsEnabled: values.smsEnabled,
    smsNumber: values.smsNumber,
    thresholdIndia: values.thresholds.india,
    thresholdIndonesia: values.thresholds.indonesia,
    escalation: JSON.stringify(values.escalation),
  };

  await prisma.alertSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
}
