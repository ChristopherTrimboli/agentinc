import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Prisma } from "@/app/generated/prisma/client";

import prisma from "@/lib/prisma";
import { getEligibleHolders } from "@/lib/revenue/holders";
import { getPendingPool } from "@/lib/revenue/events";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";

import LeaderboardTable, { type HolderRow } from "./LeaderboardTable";

export const revalidate = 300;

interface PayoutAggRow {
  walletAddress: string;
  _sum: { amountLamports: bigint | null };
  _count: { id: number };
}

async function getTotalDistributedLamports(): Promise<bigint> {
  try {
    const rows = await prisma.$queryRaw<{ total: bigint | null }[]>(
      Prisma.sql`SELECT SUM("distributedLamports") AS total FROM "RevenueDistribution" WHERE status IN ('completed', 'partial')`,
    );
    return rows[0]?.total ?? BigInt(0);
  } catch (error) {
    console.error("[Holders] Failed to fetch total distributed:", error);
    return BigInt(0);
  }
}

export default async function HoldersPage() {
  // Non-Prisma fetches can run in parallel safely
  const [holders, poolLamports] = await Promise.all([
    getEligibleHolders(),
    getPendingPool(),
  ]);

  // Run Prisma Accelerate queries sequentially to avoid compounding worker resource usage
  const payoutAggRaw = (await prisma.revenueSharePayout.groupBy({
    by: ["walletAddress"],
    where: { status: "sent" },
    _sum: { amountLamports: true },
    _count: { id: true },
    cacheStrategy: { ttl: 120, swr: 300 },
  })) as unknown as PayoutAggRow[];

  const totalDistributedLamports = await getTotalDistributedLamports();

  // Map wallet -> earnings from DB
  const earningsByWallet = new Map<string, { sol: number; count: number }>();
  for (const row of payoutAggRaw) {
    earningsByWallet.set(row.walletAddress, {
      sol: Number(row._sum.amountLamports ?? BigInt(0)) / LAMPORTS_PER_SOL,
      count: row._count.id,
    });
  }

  const rows: HolderRow[] = holders.map((h) => {
    const earnings = earningsByWallet.get(h.wallet);
    return {
      rank: 0,
      wallet: h.wallet,
      balance: h.balance,
      tier: h.tier,
      multiplier: h.multiplier,
      totalEarnedSol: earnings?.sol ?? 0,
      payoutCount: earnings?.count ?? 0,
    };
  });

  // Sort by earnings desc, then balance desc
  rows.sort((a, b) => {
    if (b.totalEarnedSol !== a.totalEarnedSol)
      return b.totalEarnedSol - a.totalEarnedSol;
    return b.balance - a.balance;
  });

  // Reassign ranks after sort
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });

  const totalDistributedSol =
    Number(totalDistributedLamports) / LAMPORTS_PER_SOL;
  const pendingPoolSol = poolLamports / LAMPORTS_PER_SOL;

  return (
    <div className="min-h-screen bg-[#000010] text-white relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-violet-600/[0.06] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-[#6FEC06]/[0.03] rounded-full blur-[120px]" />
      </div>

      <Navigation />

      <main className="relative z-10 pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Page header */}
          <div className="text-center mb-14 animate-[fadeInUp_0.6s_ease-out_both]">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Live Revenue Share
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              $AGENTINC Holder Leaderboard
            </h1>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              50% of all platform profit is distributed to $AGENTINC holders
              every 5 minutes. Hold 5M+ tokens to start earning SOL.
            </p>
          </div>

          <LeaderboardTable
            rows={rows}
            pendingPoolSol={pendingPoolSol}
            totalDistributedSol={totalDistributedSol}
            holderCount={rows.length}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
