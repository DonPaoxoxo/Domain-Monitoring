import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCheckpointStatuses } from "@/lib/checkpoints";

/**
 * GET /api/checkpoints/live
 *
 * Returns live up/down/blocked counts for every checker location, for the
 * realtime checkpoint map on the Region Checks page. Polled by the dashboard
 * client; not cached.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkpoints = await getCheckpointStatuses();
  return NextResponse.json({ checkpoints, generatedAt: new Date().toISOString() });
}
