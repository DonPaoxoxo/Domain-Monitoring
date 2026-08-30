import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export const CHECK_INTERVAL_OPTIONS = [
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
export const TIMEOUT_OPTIONS = ["5 seconds", "10 seconds", "15 seconds", "30 seconds"];
export const RETRY_OPTIONS = [0, 1, 2, 3];

const DEFAULT_CHECK_INTERVAL = "1 hour";
const DEFAULT_REQUEST_TIMEOUT = "10 seconds";
const DEFAULT_RETRIES = 2;

export interface AppSettingsData {
  checkInterval: string;
  requestTimeout: string;
  retries: number;
  /** The active checker API key (DB override if set, otherwise the CHECKER_API_KEY env var). */
  checkerApiKey: string;
}

/** Converts a CHECK_INTERVAL_OPTIONS value (e.g. "3 hours") to minutes, for checker nodes. */
export function checkIntervalToMinutes(value: string): number {
  const match = value.match(/^(\d+)\s*(minute|hour)s?$/);
  if (!match) return 60;

  const amount = Number(match[1]);
  return match[2] === "hour" ? amount * 60 : amount;
}

/** Loads dashboard settings, falling back to defaults/env for anything never saved. */
export async function getAppSettings(): Promise<AppSettingsData> {
  const row = await prisma.appSettings.findUnique({ where: { id: 1 } });

  return {
    checkInterval: row?.checkInterval ?? DEFAULT_CHECK_INTERVAL,
    requestTimeout: row?.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT,
    retries: row?.retries ?? DEFAULT_RETRIES,
    checkerApiKey: row?.checkerApiKey ?? process.env.CHECKER_API_KEY ?? "",
  };
}

/** Persists monitoring defaults (does not touch the checker API key). */
export async function saveMonitoringDefaults(values: {
  checkInterval: string;
  requestTimeout: string;
  retries: number;
}): Promise<void> {
  await prisma.appSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...values },
    update: values,
  });
}

/** Generates and persists a new checker API key, returning it (shown once for copying). */
export async function regenerateCheckerApiKey(): Promise<string> {
  const newKey = `mhk_live_${randomBytes(24).toString("hex")}`;

  await prisma.appSettings.upsert({
    where: { id: 1 },
    create: { id: 1, checkerApiKey: newKey },
    update: { checkerApiKey: newKey },
  });

  return newKey;
}
