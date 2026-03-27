/**
 * Revenue Distribution Cron
 *
 * Runs every 5 minutes via Vercel Cron to distribute accumulated
 * platform revenue to eligible $AGENTINC token holders.
 *
 * Protected by CRON_SECRET — rejects all requests if not configured.
 */

import { NextRequest, NextResponse } from "next/server";

import { distributeRevenue } from "@/lib/revenue/distributor";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "[Revenue Cron] CRON_SECRET not configured — rejecting request",
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

  try {
    const result = await distributeRevenue();

    const payoutsSent = result.payouts.filter((p) => p.status === "sent");
    const payoutsFailed = result.payouts.filter((p) => p.status === "failed");

    return NextResponse.json({
      success: result.success,
      totalProfitLamports: result.totalProfitLamports.toString(),
      distributedLamports: result.distributedLamports.toString(),
      holderCount: result.holderCount,
      payoutCount: result.payouts.length,
      payoutsSent: payoutsSent.length,
      payoutsFailed: payoutsFailed.length,
      rolledOverLamports: result.rolledOverLamports.toString(),
      payouts: result.payouts.map((p) => ({
        wallet: p.wallet,
        amountLamports: p.amountLamports.toString(),
        amountSol: (p.amountLamports / 1_000_000_000).toFixed(6),
        tier: p.tier,
        status: p.status,
        ...(p.txSignature && { txSignature: p.txSignature }),
      })),
      ...(result.error && { error: result.error }),
    });
  } catch (error) {
    console.error("[Revenue Cron] Unhandled error:", error);
    return NextResponse.json({ error: "Distribution failed" }, { status: 500 });
  }
}
