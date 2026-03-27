/**
 * Revenue Stats API
 *
 * Public endpoint returning aggregate revenue sharing statistics.
 * If the caller is authenticated, also returns their personal payout history.
 */

import { NextRequest, NextResponse } from "next/server";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import prisma from "@/lib/prisma";
import { rateLimitByIP } from "@/lib/rateLimit";
import { verifyAuth } from "@/lib/auth/verifyRequest";
import { getHolderStats } from "@/lib/revenue/holders";
import { getPendingPool } from "@/lib/revenue/events";
import {
  REVENUE_SHARE_RATE,
  PLATFORM_FEE_RATE,
  REVENUE_SHARE_TIERS,
  MIN_HOLDING_AMOUNT,
} from "@/lib/revenue/constants";

export const revalidate = 120;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const limited = await rateLimitByIP(req, "revenue-stats", 30);
  if (limited) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch aggregate stats in parallel
    const [
      holderStats,
      pendingPool,
      totalRevenue,
      revenue24h,
      revenue7d,
      totalDistributed,
      recentDistributions,
    ] = await Promise.all([
      getHolderStats(),
      getPendingPool(),
      prisma.revenueEvent.aggregate({
        _sum: { profitLamports: true, grossLamports: true },
        _count: true,
      }),
      prisma.revenueEvent.aggregate({
        where: { timestamp: { gte: oneDayAgo } },
        _sum: { profitLamports: true, grossLamports: true },
        _count: true,
      }),
      prisma.revenueEvent.aggregate({
        where: { timestamp: { gte: sevenDaysAgo } },
        _sum: { profitLamports: true, grossLamports: true },
        _count: true,
      }),
      prisma.revenueSharePayout.aggregate({
        where: { status: "confirmed" },
        _sum: { amountLamports: true },
        _count: true,
      }),
      prisma.revenueDistribution.findMany({
        where: { status: "completed" },
        orderBy: { timestamp: "desc" },
        take: 10,
        select: {
          id: true,
          timestamp: true,
          distributedLamports: true,
          holderCount: true,
          perHolderLamports: true,
        },
      }),
    ]);

    const lamportsToSol = (l: bigint | null) =>
      l ? Number(l) / LAMPORTS_PER_SOL : 0;

    const stats = {
      config: {
        platformFeeRate: PLATFORM_FEE_RATE,
        revenueShareRate: REVENUE_SHARE_RATE,
        minHolding: MIN_HOLDING_AMOUNT,
        tiers: REVENUE_SHARE_TIERS,
      },
      holders: holderStats,
      pendingPoolSol: pendingPool / LAMPORTS_PER_SOL,
      revenue: {
        allTime: {
          grossSol: lamportsToSol(totalRevenue._sum.grossLamports),
          profitSol: lamportsToSol(totalRevenue._sum.profitLamports),
          eventCount: totalRevenue._count,
        },
        last24h: {
          grossSol: lamportsToSol(revenue24h._sum.grossLamports),
          profitSol: lamportsToSol(revenue24h._sum.profitLamports),
          eventCount: revenue24h._count,
        },
        last7d: {
          grossSol: lamportsToSol(revenue7d._sum.grossLamports),
          profitSol: lamportsToSol(revenue7d._sum.profitLamports),
          eventCount: revenue7d._count,
        },
      },
      distributions: {
        totalDistributedSol: lamportsToSol(
          totalDistributed._sum.amountLamports,
        ),
        totalPayouts: totalDistributed._count,
        recent: recentDistributions.map((d) => ({
          id: d.id,
          timestamp: d.timestamp,
          distributedSol: Number(d.distributedLamports) / LAMPORTS_PER_SOL,
          holderCount: d.holderCount,
          perHolderSol: Number(d.perHolderLamports) / LAMPORTS_PER_SOL,
        })),
      },
    };

    // If authenticated, include personal payout history
    const authResult = await verifyAuth(req);
    if (authResult && "userId" in authResult) {
      const user = await prisma.user.findUnique({
        where: { id: authResult.userId },
        select: { activeWallet: { select: { address: true } } },
      });

      if (user?.activeWallet?.address) {
        const personalPayouts = await prisma.revenueSharePayout.findMany({
          where: {
            walletAddress: user.activeWallet.address,
            status: "confirmed",
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            amountLamports: true,
            tier: true,
            txSignature: true,
            createdAt: true,
          },
        });

        const personalTotal = await prisma.revenueSharePayout.aggregate({
          where: {
            walletAddress: user.activeWallet.address,
            status: "confirmed",
          },
          _sum: { amountLamports: true },
          _count: true,
        });

        Object.assign(stats, {
          personal: {
            wallet: user.activeWallet.address,
            totalEarnedSol: lamportsToSol(personalTotal._sum.amountLamports),
            totalPayouts: personalTotal._count,
            recentPayouts: personalPayouts.map((p) => ({
              amountSol: Number(p.amountLamports) / LAMPORTS_PER_SOL,
              tier: p.tier,
              txSignature: p.txSignature,
              timestamp: p.createdAt,
            })),
          },
        });
      }
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[Revenue Stats] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue stats" },
      { status: 500 },
    );
  }
}
