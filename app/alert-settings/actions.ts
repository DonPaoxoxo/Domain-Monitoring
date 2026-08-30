"use server";

import { revalidatePath } from "next/cache";
import { saveAlertSettings, type AlertSettingsData } from "@/lib/alertSettings";
import { sendEmailAlert, sendWebhookAlert } from "@/lib/alerts";

export interface SaveAlertSettingsResult {
  success: boolean;
  error?: string;
}

export interface TestAlertResult {
  channel: "email" | "webhook";
  success: boolean;
  error?: string;
}

/** Persists the Alert Settings form. */
export async function saveAlertSettingsAction(values: AlertSettingsData): Promise<SaveAlertSettingsResult> {
  if (values.emailEnabled && !values.email.trim()) {
    return { success: false, error: "Email address is required when email alerts are enabled." };
  }
  if (values.webhookEnabled && !values.webhookUrl.trim()) {
    return { success: false, error: "Webhook URL is required when Slack/Webhook alerts are enabled." };
  }
  if (values.smsEnabled && !values.smsNumber.trim()) {
    return { success: false, error: "Phone number is required when SMS alerts are enabled." };
  }

  await saveAlertSettings(values);
  revalidatePath("/alert-settings");
  return { success: true };
}

/** Sends a test notification through whichever enabled channels are configured, without saving. */
export async function sendTestAlertAction(
  values: Pick<AlertSettingsData, "emailEnabled" | "email" | "webhookEnabled" | "webhookUrl">
): Promise<TestAlertResult[]> {
  const message = `🔔 This is a test alert from Mi-hawk, sent at ${new Date().toLocaleString()}.`;
  const results: TestAlertResult[] = [];

  if (values.emailEnabled) {
    if (!values.email.trim()) {
      results.push({ channel: "email", success: false, error: "Email address is required." });
    } else {
      const result = await sendEmailAlert(values.email, "[Mi-hawk] Test alert", message);
      results.push({ channel: "email", ...result });
    }
  }

  if (values.webhookEnabled) {
    if (!values.webhookUrl.trim()) {
      results.push({ channel: "webhook", success: false, error: "Webhook URL is required." });
    } else {
      const result = await sendWebhookAlert(values.webhookUrl, message);
      results.push({ channel: "webhook", ...result });
    }
  }

  return results;
}
