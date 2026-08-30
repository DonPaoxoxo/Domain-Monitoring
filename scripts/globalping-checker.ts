/**
 * Globalping-based domain checker.
 *
 * Reads all active domains from the database, checks each one via the
 * Globalping distributed probe network across India and Indonesia, then
 * posts results to the local Mi-Hawk API (same endpoint used by the old
 * VPS-based checker nodes) so the dashboard stays consistent.
 *
 * Intended to run as a PM2 cron job on the main server — no dedicated
 * India/Indonesia VPS required.
 *
 * Requires GLOBALPING_API_KEY in .env (or environment).
 */

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { createMeasurement, pollMeasurement, parseProbeResult } from "../lib/globalping";

// ── Location config ────────────────────────────────────────────────────────
interface GlobLocation {
  magic: string;   // Globalping "magic" name (city or country)
  location: string; // Internal slug matching existing CheckResult rows
}

// `location` must match a name in REGION_LOCATIONS / CHECKPOINTS
// (data/mockDomains.ts, data/checkpoints.ts) exactly — the dashboard and
// live checkpoint map look up results by this string. `region` is submitted
// separately, so it does not need to be repeated in the location name.
const INDIA_LOCATIONS: GlobLocation[] = [
  { magic: "Delhi",      location: "Delhi" },
  { magic: "Mumbai",     location: "Mumbai" },
  { magic: "Bengaluru",  location: "Bengaluru" },
  { magic: "Chennai",    location: "Chennai" },
  { magic: "Kolkata",    location: "Kolkata" },
  { magic: "Ahmedabad",  location: "Ahmedabad" },
  { magic: "Lucknow",    location: "Lucknow" },
  { magic: "Kanpur",     location: "Kanpur" },
  { magic: "Nagpur",     location: "Nagpur" },
  { magic: "Patna",      location: "Patna" },
];

const INDONESIA_LOCATIONS: GlobLocation[] = [
  { magic: "Jakarta",  location: "Jakarta" },
  { magic: "Denpasar", location: "Denpasar" },
  { magic: "Bandung",  location: "Bandung" },
  { magic: "Medan",    location: "Medan" },
  { magic: "Surabaya", location: "Surabaya" },
];

const CONCURRENCY = 8; // domains processed in parallel

// ── Prisma setup ───────────────────────────────────────────────────────────
const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// ── Status helpers ─────────────────────────────────────────────────────────
function toStatus(statusCode: number | null): "up" | "down" | "blocked" {
  if (statusCode === null) return "down";
  if (statusCode === 403) return "blocked";
  if (statusCode >= 200 && statusCode < 500) return "up";
  return "down";
}

// ── Per-domain check ───────────────────────────────────────────────────────
interface LocationResult {
  location: string;
  status: "up" | "down" | "blocked";
  statusCode: number | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
  redirectUrl: string | null;
}

async function checkDomain(
  url: string,
  locations: GlobLocation[],
  apiKey?: string
): Promise<LocationResult[]> {
  // Parse the hostname to pass as the Globalping target
  let target: string;
  try {
    target = new URL(url).hostname;
  } catch {
    target = url.replace(/^https?:\/\//, "").split("/")[0];
  }

  const magics = locations.map((l) => l.magic);

  let measurement;
  try {
    const id = await createMeasurement(target, magics, apiKey);
    measurement = await pollMeasurement(id, apiKey);
  } catch (err) {
    // If Globalping itself fails (network, quota), mark all locations down
    return locations.map((l) => ({
      location: l.location,
      status: "down",
      statusCode: null,
      responseTimeMs: null,
      errorMessage: String(err),
      redirectUrl: null,
    }));
  }

  return locations.map((loc, i) => {
    const probeData = measurement.results[i];
    if (!probeData) {
      return {
        location: loc.location,
        status: "down",
        statusCode: null,
        responseTimeMs: null,
        errorMessage: "No probe returned for this location",
        redirectUrl: null,
      };
    }
    const parsed = parseProbeResult(probeData.result);
    return {
      location: loc.location,
      status: toStatus(parsed.statusCode),
      statusCode: parsed.statusCode,
      responseTimeMs: parsed.responseTimeMs,
      errorMessage: parsed.errorMessage,
      redirectUrl: parsed.redirectUrl,
    };
  });
}

// ── Submit to local API ────────────────────────────────────────────────────
async function submitResults(
  nodeName: string,
  region: string,
  location: string,
  results: Array<{
    domainId: number;
    status: "up" | "down" | "blocked";
    statusCode: number | null;
    responseTimeMs: number | null;
    errorMessage: string | null;
    redirectUrl: string | null;
    checkedAt: string;
  }>
) {
  const apiKey =
    process.env.CHECKER_API_KEY ??
    (await prisma.appSettings.findUnique({ where: { id: 1 } }))?.checkerApiKey ??
    "";

  const base = (process.env.MAIN_SERVER_URL ?? "http://localhost:3000").replace(/\/+$/, "");

  const response = await fetch(`${base}/api/checker/results`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ nodeName, region, location, results }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[${region}/${location}] submit failed ${response.status}: ${text}`);
  }
}

// ── Concurrency helper ─────────────────────────────────────────────────────
async function runConcurrently<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`[globalping-checker] Starting — ${new Date().toISOString()}`);

  const domains = await prisma.domain.findMany({
    where: { active: true, paused: false },
    select: { id: true, domain: true, url: true, targetMarket: true },
    orderBy: { id: "asc" },
  });

  console.log(`[globalping-checker] ${domains.length} domains to check`);

  // We collect all results first, then POST per-location in bulk
  const indiaResults   = new Map<string, Array<{ domainId: number } & LocationResult & { checkedAt: string }>>();
  const indonesiaResults = new Map<string, Array<{ domainId: number } & LocationResult & { checkedAt: string }>>();

  INDIA_LOCATIONS.forEach(l => indiaResults.set(l.location, []));
  INDONESIA_LOCATIONS.forEach(l => indonesiaResults.set(l.location, []));

  const checkedAt = new Date().toISOString();

  await runConcurrently(domains, CONCURRENCY, async (domain) => {
    const market = domain.targetMarket ?? null;
    const runIndia     = market === null || market === "india";
    const runIndonesia = market === null || market === "indonesia";

    const [indiaLocs, indonesiaLocs] = await Promise.all([
      runIndia     ? checkDomain(domain.url, INDIA_LOCATIONS,     process.env.GLOBALPING_API_KEY_INDIA)     : Promise.resolve([]),
      runIndonesia ? checkDomain(domain.url, INDONESIA_LOCATIONS, process.env.GLOBALPING_API_KEY_INDONESIA) : Promise.resolve([]),
    ]);

    for (const r of indiaLocs) {
      indiaResults.get(r.location)?.push({ domainId: domain.id, checkedAt, ...r });
    }
    for (const r of indonesiaLocs) {
      indonesiaResults.get(r.location)?.push({ domainId: domain.id, checkedAt, ...r });
    }

    const indiaUp   = indiaLocs.filter(r => r.status === "up").length;
    const indoUp    = indonesiaLocs.filter(r => r.status === "up").length;
    console.log(
      `[globalping-checker] ${domain.domain} — India ${indiaUp}/${indiaLocs.length} up, Indo ${indoUp}/${indonesiaLocs.length} up`
    );
  });

  // Submit per-location to the Mi-Hawk results API
  const submissions: Promise<void>[] = [];

  for (const [location, results] of indiaResults) {
    if (results.length === 0) continue;
    submissions.push(submitResults("globalping", "india", location, results));
  }
  for (const [location, results] of indonesiaResults) {
    if (results.length === 0) continue;
    submissions.push(submitResults("globalping", "indonesia", location, results));
  }

  await Promise.all(submissions);

  console.log(`[globalping-checker] Done — ${new Date().toISOString()}`);
}

main()
  .catch((err) => {
    console.error("[globalping-checker] Fatal:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
