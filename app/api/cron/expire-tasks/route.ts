/**
 * Task Expiry Cron
 *
 * Runs every hour via Vercel Cron. Finds all `open` tasks whose deadline
 * has passed and moves them to `cancelled`, rejecting any pending bids.
 *
 * Protected by CRON_SECRET — rejects all requests if not configured.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "[Expire Tasks Cron] CRON_SECRET not configured — rejecting request",
    );
    return NextResponse.json(
      { error: "Cron endpoint not configured" },
      { status: 503 },
    );
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {
    // Find all open tasks whose deadline has passed
    const expiredTasks = await prisma.marketplaceTask.findMany({
      where: {
        status: "open",
        deadline: { lt: now },
      },
      select: { id: true, title: true },
    });

    if (expiredTasks.length === 0) {
      return NextResponse.json({ expired: 0 });
    }

    const expiredIds = expiredTasks.map((t) => t.id);

    // Cancel tasks and reject all pending bids in a single transaction
    await prisma.$transaction([
      prisma.marketplaceTask.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: "cancelled" },
      }),
      prisma.marketplaceBid.updateMany({
        where: { taskId: { in: expiredIds }, status: "pending" },
        data: { status: "rejected" },
      }),
    ]);

    console.log(
      `[Expire Tasks Cron] Expired ${expiredTasks.length} task(s):`,
      expiredIds,
    );

    return NextResponse.json({ expired: expiredTasks.length, ids: expiredIds });
  } catch (error) {
    console.error("[Expire Tasks Cron] Error:", error);
    return NextResponse.json(
      { error: "Failed to expire tasks" },
      { status: 500 },
    );
  }
}
