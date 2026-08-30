import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkApiKey } from "@/lib/auth";
import { getAppSettings, checkIntervalToMinutes } from "@/lib/settings";

/**
 * GET /api/checker/domains
 *
 * Returns the list of active domains for checker nodes to monitor, along
 * with the current check interval (from Monitoring Defaults) so nodes can
 * self-adjust their polling cadence without a restart.
 * Requires `Authorization: Bearer <CHECKER_API_KEY>`.
 */
export async function GET(request: Request) {
  const unauthorized = await checkApiKey(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const market = searchParams.get("market");

  // Sanitation: skip domains that have been confirmed broken within the last
  // 24 hours — they'll be retried once the 24h window expires (daily probe).
  // Domains with no results yet (new) and domains last checked >24h ago are
  // always included so they get a baseline check or a recovery probe.
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [domains, settings] = await Promise.all([
    prisma.domain.findMany({
      where: {
        active: true,
        paused: false,
        ...(market ? { targetMarket: market } : {}),
        OR: [
          // No recent check at all (new domain or last check >24h ago) → always include
          { results: { none: { checkedAt: { gte: cutoff } } } },
          // Had at least one "up" result in the last 24h → healthy, keep checking
          { results: { some: { status: "up", checkedAt: { gte: cutoff } } } },
        ],
      },
      select: { id: true, domain: true, url: true },
      orderBy: { id: "asc" },
    }),
    getAppSettings(),
  ]);

  return NextResponse.json({
    domains,
    checkIntervalMinutes: checkIntervalToMinutes(settings.checkInterval),
  });
}
