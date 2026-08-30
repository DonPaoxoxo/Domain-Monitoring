import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkApiKey } from "@/lib/auth";
import { evaluateAndDispatchAlerts } from "@/lib/alerts";

interface CheckResultPayload {
  domainId: number;
  status: "up" | "down" | "blocked";
  statusCode?: number | null;
  responseTimeMs?: number | null;
  errorMessage?: string | null;
  redirectUrl?: string | null;
  checkedAt: string;
}

interface ResultsRequestBody {
  nodeName: string;
  region: string;
  location: string;
  results: CheckResultPayload[];
}

function isValidResult(result: unknown): result is CheckResultPayload {
  if (typeof result !== "object" || result === null) return false;
  const r = result as Record<string, unknown>;
  return (
    typeof r.domainId === "number" &&
    (r.status === "up" || r.status === "down" || r.status === "blocked") &&
    typeof r.checkedAt === "string" &&
    (r.redirectUrl === undefined || r.redirectUrl === null || typeof r.redirectUrl === "string")
  );
}

/**
 * POST /api/checker/results
 *
 * Accepts a batch of check results from a single checker node for a single
 * region/location, and upserts the latest status per (domain, region, location).
 * Requires `Authorization: Bearer <CHECKER_API_KEY>`.
 */
export async function POST(request: Request) {
  const unauthorized = await checkApiKey(request);
  if (unauthorized) return unauthorized;

  let body: ResultsRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { nodeName, region, location, results } = body;

  if (!nodeName || !region || !location || !Array.isArray(results)) {
    return NextResponse.json(
      { error: "Missing required fields: nodeName, region, location, results[]" },
      { status: 400 }
    );
  }

  let processed = 0;
  const failed: unknown[] = [];
  const logRows: {
    domainId: number;
    region: string;
    location: string;
    nodeName: string;
    status: string;
    statusCode: number | null;
    responseTimeMs: number | null;
    errorMessage: string | null;
    checkedAt: Date;
  }[] = [];

  // Run all upserts inside a single transaction. Doing 100+ individual
  // transactions (one per domain) serializes badly under the write lock when
  // multiple checker nodes submit around the same time, which previously
  // caused submissions to take 30-100+s and hit nginx's proxy_read_timeout.
  // With up to 15 checker nodes submitting concurrently, lock queueing can
  // push a transaction's actual runtime well past Prisma's 5s default
  // timeout even though it's making normal progress, so it's raised here.
  await prisma.$transaction(
    async (tx) => {
      for (const result of results) {
        if (!isValidResult(result)) {
          failed.push(result);
          continue;
        }

        const checkedAt = new Date(result.checkedAt);

        try {
          await tx.checkResult.upsert({
            where: {
              domainId_region_location: {
                domainId: result.domainId,
                region,
                location,
              },
            },
            create: {
              domainId: result.domainId,
              region,
              location,
              nodeName,
              status: result.status,
              statusCode: result.statusCode ?? null,
              responseTimeMs: result.responseTimeMs ?? null,
              errorMessage: result.errorMessage ?? null,
              redirectUrl: result.redirectUrl ?? null,
              checkedAt,
            },
            update: {
              nodeName,
              status: result.status,
              statusCode: result.statusCode ?? null,
              responseTimeMs: result.responseTimeMs ?? null,
              errorMessage: result.errorMessage ?? null,
              redirectUrl: result.redirectUrl ?? null,
              checkedAt,
            },
          });
          processed++;
          logRows.push({
            domainId: result.domainId,
            region,
            location,
            nodeName,
            status: result.status,
            statusCode: result.statusCode ?? null,
            responseTimeMs: result.responseTimeMs ?? null,
            errorMessage: result.errorMessage ?? null,
            checkedAt,
          });
        } catch {
          failed.push(result);
        }
      }

      if (logRows.length > 0) {
        await tx.checkLog.createMany({ data: logRows });
      }
    },
    { timeout: 30_000, maxWait: 15_000 }
  );

  // Keep the history timelog bounded to the last 30 days. Run outside the
  // main transaction and not awaited — a range delete on the shared CheckLog
  // table doesn't need to hold up the response, and running it inside the
  // per-submission transaction above was a major source of lock contention
  // when multiple checker nodes submit around the same time.
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  prisma.checkLog.deleteMany({ where: { checkedAt: { lt: cutoff } } }).catch((err) => {
    console.error("Failed to clean up old CheckLog rows:", err);
  });

  // Not awaited: alert dispatch (email/webhook) shouldn't delay the response to
  // checker nodes. Runs in the background on this long-lived process.
  const affectedDomainIds = [...new Set(logRows.map((row) => row.domainId))];
  evaluateAndDispatchAlerts(affectedDomainIds).catch((err) => {
    console.error("Failed to evaluate alerts:", err);
  });

  return NextResponse.json({
    success: true,
    received: results.length,
    processed,
    failed,
  });
}
