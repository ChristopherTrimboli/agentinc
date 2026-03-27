/**
 * Seed Revenue Pool — One-Time 2 SOL Holder Payout
 *
 * Injects 2 SOL into the revenue pending pool (Redis) and creates
 * an audit-trail RevenueEvent in Postgres so stats look clean.
 *
 * After running this script, the next cron cycle (or manual trigger)
 * will distribute the 2 SOL to all eligible $AGENTINC holders
 * weighted by their tier multiplier.
 *
 * Prerequisites:
 *   - Treasury wallet must hold >= 2 SOL
 *   - Redis (Upstash) must be configured
 *   - DATABASE_URL must be set
 *
 * Usage:
 *   bun scripts/seed-revenue-pool.ts                # seed only
 *   bun scripts/seed-revenue-pool.ts --distribute   # seed + trigger distribution
 */

import { Redis } from "@upstash/redis";
import { PrismaClient } from "../app/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const SEED_AMOUNT_SOL = 2;
const SEED_AMOUNT_LAMPORTS = SEED_AMOUNT_SOL * 1_000_000_000;
const PENDING_POOL_KEY = "revshare:pending_pool";

const shouldDistribute = process.argv.includes("--distribute");

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  Revenue Pool Seed — 2 SOL Holder Payout");
  console.log("═══════════════════════════════════════════════\n");

  // ── Validate env ──
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;
  const databaseUrl = process.env.DATABASE_URL;

  if (!redisUrl || !redisToken) {
    console.error("FATAL: KV_REST_API_URL and KV_REST_API_TOKEN are required.");
    process.exit(1);
  }
  if (!databaseUrl) {
    console.error("FATAL: DATABASE_URL is required.");
    process.exit(1);
  }

  const redis = new Redis({ url: redisUrl, token: redisToken });
  const prisma = new PrismaClient({
    accelerateUrl: databaseUrl,
  }).$extends(withAccelerate());

  try {
    // ── Step 1: Read current pending pool ──
    const currentPool = (await redis.get<number>(PENDING_POOL_KEY)) ?? 0;
    console.log(
      `Current pending pool: ${(currentPool / 1_000_000_000).toFixed(9)} SOL (${currentPool} lamports)`,
    );

    // ── Step 2: Set pending pool to 2 SOL + whatever was there ──
    const newPool = currentPool + SEED_AMOUNT_LAMPORTS;
    await redis.set(PENDING_POOL_KEY, newPool);
    console.log(
      `New pending pool:     ${(newPool / 1_000_000_000).toFixed(9)} SOL (${newPool} lamports)`,
    );
    console.log(
      `  → Added ${SEED_AMOUNT_SOL} SOL (${SEED_AMOUNT_LAMPORTS} lamports)\n`,
    );

    // ── Step 3: Create audit-trail RevenueEvent in Postgres ──
    const event = await prisma.revenueEvent.create({
      data: {
        timestamp: new Date(),
        type: "token_payment",
        grossLamports: BigInt(SEED_AMOUNT_LAMPORTS),
        costLamports: 0n,
        profitLamports: BigInt(SEED_AMOUNT_LAMPORTS),
        revenueShareLamports: BigInt(SEED_AMOUNT_LAMPORTS),
        distributed: false,
      },
    });
    console.log(`Created RevenueEvent: ${event.id}`);
    console.log(`  type: token_payment`);
    console.log(`  amount: ${SEED_AMOUNT_SOL} SOL`);
    console.log(`  distributed: false (will be marked true after payout)\n`);

    // ── Step 4: Optionally trigger distribution ──
    if (shouldDistribute) {
      console.log("Triggering distribution cron...\n");

      const cronSecret = process.env.CRON_SECRET;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

      if (!cronSecret) {
        console.error(
          "WARNING: CRON_SECRET not set. Cannot trigger distribution.",
        );
        console.log(
          "The pending pool is seeded — distribution will happen on the next cron cycle.\n",
        );
      } else {
        const res = await fetch(`${appUrl}/api/cron/distribute-revenue`, {
          method: "GET",
          headers: { Authorization: `Bearer ${cronSecret}` },
        });

        const data = await res.json();

        if (res.ok) {
          console.log("Distribution result:");
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.error(`Distribution failed (${res.status}):`);
          console.error(JSON.stringify(data, null, 2));
        }
      }
    } else {
      console.log("─────────────────────────────────────────────");
      console.log("Pool seeded! Next steps:");
      console.log("  1. Make sure treasury wallet has >= 2 SOL");
      console.log("  2. Either wait for the next cron (5 min) or run:");
      console.log("     bun scripts/seed-revenue-pool.ts --distribute");
      console.log("─────────────────────────────────────────────");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
