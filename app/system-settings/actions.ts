"use server";

import { revalidatePath } from "next/cache";
import {
  CHECK_INTERVAL_OPTIONS,
  TIMEOUT_OPTIONS,
  RETRY_OPTIONS,
  saveMonitoringDefaults as persistMonitoringDefaults,
  regenerateCheckerApiKey as persistRegenerateApiKey,
} from "@/lib/settings";

export interface SaveSettingsResult {
  success: boolean;
  error?: string;
}

/** Persists the monitoring defaults shown in System Settings. */
export async function saveMonitoringDefaults(
  checkInterval: string,
  requestTimeout: string,
  retries: number
): Promise<SaveSettingsResult> {
  if (!CHECK_INTERVAL_OPTIONS.includes(checkInterval)) {
    return { success: false, error: "Invalid check interval." };
  }
  if (!TIMEOUT_OPTIONS.includes(requestTimeout)) {
    return { success: false, error: "Invalid request timeout." };
  }
  if (!RETRY_OPTIONS.includes(retries)) {
    return { success: false, error: "Invalid retry count." };
  }

  await persistMonitoringDefaults({ checkInterval, requestTimeout, retries });
  revalidatePath("/system-settings");
  return { success: true };
}

/** Generates a new checker API key and persists it, returning it for one-time display. */
export async function regenerateApiKey(): Promise<string> {
  const newKey = await persistRegenerateApiKey();
  revalidatePath("/system-settings");
  return newKey;
}
