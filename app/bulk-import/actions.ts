"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import type { TargetMarket } from "@/types/monitor";

export interface AddDomainState {
  error?: string;
  success?: string;
  domain?: string;
  market?: TargetMarket;
}

const MARKET_LABELS: Record<TargetMarket, string> = {
  india: "India",
  indonesia: "Indonesia",
};

/** Strips protocol, path and trailing dots, and lowercases a user-entered domain. */
function normalizeDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;

  value = value.replace(/^[a-z]+:\/\//, "");
  value = value.split(/[/?#]/)[0];
  value = value.replace(/\.+$/, "");

  const isValid = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(value);
  return isValid ? value : null;
}

export async function addDomain(_prevState: AddDomainState, formData: FormData): Promise<AddDomainState> {
  const raw = String(formData.get("domain") ?? "");
  const market = String(formData.get("market") ?? "");

  const domain = normalizeDomain(raw);
  if (!domain) {
    return { error: "Enter a valid domain, e.g. example.com" };
  }

  if (market !== "india" && market !== "indonesia") {
    return { error: "Select a target market." };
  }

  const existing = await prisma.domain.findUnique({ where: { domain } });
  if (existing) {
    return { error: `${domain} is already being monitored.` };
  }

  await prisma.domain.create({
    data: {
      domain,
      url: `https://${domain}`,
      targetMarket: market,
    },
  });

  return { success: `${domain} added to ${MARKET_LABELS[market]} monitoring.`, domain, market };
}

export interface BulkImportResult {
  success: boolean;
  added: number;
  skipped: number;
  error?: string;
}

/** Parses raw uploaded text into normalized, deduplicated domains and creates the new ones. */
export async function addDomainsBulk(
  fileName: string,
  market: string,
  rawText: string
): Promise<BulkImportResult> {
  if (market !== "india" && market !== "indonesia") {
    return { success: false, added: 0, skipped: 0, error: "Select a target market." };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));

  const seen = new Set<string>();
  const validDomains: string[] = [];
  let skipped = 0;

  for (const line of lines) {
    const firstColumn = line.split(",")[0] ?? "";
    const domain = normalizeDomain(firstColumn);
    if (!domain || seen.has(domain)) {
      skipped += 1;
      continue;
    }
    seen.add(domain);
    validDomains.push(domain);
  }

  if (validDomains.length === 0) {
    return { success: false, added: 0, skipped, error: "No valid domains found in the file." };
  }

  const existing = await prisma.domain.findMany({
    where: { domain: { in: validDomains } },
    select: { domain: true },
  });
  const existingSet = new Set(existing.map((d) => d.domain));

  const toCreate = validDomains.filter((domain) => !existingSet.has(domain));
  skipped += validDomains.length - toCreate.length;

  if (toCreate.length > 0) {
    await prisma.$transaction(
      toCreate.map((domain) =>
        prisma.domain.create({
          data: { domain, url: `https://${domain}`, targetMarket: market },
        })
      )
    );
  }

  await prisma.bulkImportLog.create({
    data: { fileName, market, added: toCreate.length, skipped },
  });

  revalidatePath("/bulk-import");
  revalidatePath("/dashboard");
  revalidatePath("/domains");

  return { success: true, added: toCreate.length, skipped };
}
