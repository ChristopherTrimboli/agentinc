import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import {
  getUncachedGlobalStats,
  getUncachedCollectionPointers,
  getUncachedIsIndexerAvailable,
  getUncachedSearchAgentsPage,
} from "@/lib/erc8004/cached";
import prisma from "@/lib/prisma";
import { verifyAgentBatch } from "@/lib/network/verification";
import type { AgentVerification } from "@/lib/network/types";
import type { IndexedAgent } from "8004-solana";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

const INDEXER_PAGE_SIZE = 200;
const DB_UPSERT_CHUNK = 25;
const MAX_RETRIES = 5;
const THROTTLE_MS = 1500;

// ── Rate-limit aware helpers ─────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RateLimitError extends Error {
  code?: string;
  retryAfter?: number;
}

function isRateLimited(err: unknown): err is RateLimitError {
  return (
    err instanceof Error &&
    ((err as RateLimitError).code === "RATE_LIMITED" ||
      err.message.includes("Rate limited") ||
      err.message.includes("rate limit"))
  );
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (isRateLimited(err)) {
        const waitSec =
          (err as RateLimitError).retryAfter ?? 15 * (attempt + 1);
        console.log(
          `[8004 Refresh] ${label} rate limited, waiting ${waitSec}s (attempt ${attempt + 1}/${MAX_RETRIES})`,
        );
        await sleep(waitSec * 1000 + 500);
        continue;
      }
      throw err;
    }
  }
  throw new Error(`${label} failed after ${MAX_RETRIES} retries`);
}

// ── Pagination (uncached — hits indexer directly, with retry + throttle) ─────

async function fetchAllAgentsUncached(): Promise<IndexedAgent[]> {
  const all: IndexedAgent[] = [];
  let offset = 0;
  let pageNum = 0;
  for (;;) {
    const page = await withRetry(`agents page ${pageNum + 1}`, () =>
      getUncachedSearchAgentsPage(INDEXER_PAGE_SIZE, offset),
    );
    all.push(...page);
    pageNum++;
    console.log(
      `[8004 Refresh] Agents page ${pageNum}: ${page.length} (total so far: ${all.length})`,
    );
    if (page.length < INDEXER_PAGE_SIZE) break;
    offset += INDEXER_PAGE_SIZE;
    await sleep(THROTTLE_MS);
  }
  return all;
}

// ── DB persistence ───────────────────────────────────────────────────────────

function persistResultsBatch(
  entries: [string, AgentVerification][],
): Promise<void> {
  if (entries.length === 0) return Promise.resolve();
  return Promise.allSettled(
    entries.map(([asset, v]) =>
      prisma.networkVerification.upsert({
        where: { asset },
        create: {
          asset,
          status: v.status,
          score: v.score,
          maxScore: v.maxScore,
          checks: v.checks as object[],
          verifiedAt: new Date(v.verifiedAt),
        },
        update: {
          status: v.status,
          score: v.score,
          maxScore: v.maxScore,
          checks: v.checks as object[],
          verifiedAt: new Date(v.verifiedAt),
        },
      }),
    ),
  ).then(() => {});
}

function isVerifiableAgent(a: IndexedAgent): boolean {
  const uri = a.agent_uri;
  if (!uri || uri.length < 10) return false;

  if (uri.startsWith("{")) {
    try {
      const json = JSON.parse(uri);
      return Array.isArray(json.services) || Array.isArray(json.endpoints);
    } catch {
      return false;
    }
  }

  if (
    !uri.startsWith("http") &&
    !uri.startsWith("ipfs://") &&
    !uri.startsWith("ar://")
  ) {
    return false;
  }

  if (/readme|\.md$|\.txt$/i.test(uri)) return false;
  return true;
}

// ── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // 1. Check indexer health (uncached, with retry since we may still be rate limited)
    let indexerUp = false;
    try {
      indexerUp = await withRetry("indexer health", () =>
        getUncachedIsIndexerAvailable(),
      );
    } catch {
      /* ignore */
    }

    if (!indexerUp) {
      return NextResponse.json(
        { error: "8004 indexer is currently unavailable" },
        { status: 503 },
      );
    }

    await sleep(THROTTLE_MS);

    console.log("[8004 Refresh] Starting full network refresh (uncached)...");

    // 2. Fetch sequentially to avoid rate limit burst
    const stats = await withRetry("global stats", () =>
      getUncachedGlobalStats(),
    ).catch(() => null);

    await sleep(THROTTLE_MS);

    const pointers = await withRetry("collection pointers", () =>
      getUncachedCollectionPointers(),
    ).catch(
      () => [] as Awaited<ReturnType<typeof getUncachedCollectionPointers>>,
    );

    await sleep(THROTTLE_MS);

    const allAgents = await fetchAllAgentsUncached();

    console.log(
      `[8004 Refresh] Indexer returned: ${allAgents.length} agents, ${pointers.length} collection pointers`,
    );
    if (stats) {
      console.log(
        `[8004 Refresh] Global stats: ${stats.total_agents} total agents, ${stats.total_feedbacks} feedbacks`,
      );
    }

    // 3. Group agents by collection_pointer (avoids broken getCollectionAssets)
    const uniquePointers = new Map<string, (typeof pointers)[number]>();
    for (const ptr of pointers) {
      if (!uniquePointers.has(ptr.col)) {
        uniquePointers.set(ptr.col, ptr);
      }
    }

    let collectedCount = 0;
    let uncollectedCount = 0;
    for (const agent of allAgents) {
      const cp = agent.collection_pointer;
      if (cp && uniquePointers.has(cp)) {
        collectedCount++;
      } else {
        uncollectedCount++;
      }
    }

    console.log(
      `[8004 Refresh] ${collectedCount} agents in collections, ${uncollectedCount} uncollected`,
    );

    // 4. Wipe old verification data completely
    console.log("[8004 Refresh] Wiping NetworkVerification table...");
    const deleteResult = await prisma.networkVerification.deleteMany({});
    console.log(
      `[8004 Refresh] Deleted ${deleteResult.count} old verification rows`,
    );

    // 5. Re-verify ALL agents (no stale threshold — full scan)
    const verifiable = allAgents.filter(isVerifiableAgent);
    const skippedCount = allAgents.length - verifiable.length;

    console.log(
      `[8004 Refresh] Verifying ${verifiable.length} agents (${skippedCount} skipped — no verifiable URI)`,
    );

    const results = await verifyAgentBatch(verifiable, 30);

    let verifiedCount = 0;
    let partialCount = 0;
    let unverifiedCount = 0;
    for (const [, v] of results) {
      if (v.status === "verified") verifiedCount++;
      else if (v.status === "partial") partialCount++;
      else unverifiedCount++;
    }

    console.log(
      `[8004 Refresh] Verification done: ${verifiedCount} verified, ${partialCount} partial, ${unverifiedCount} unverified`,
    );

    // 6. Persist all verification results to DB
    console.log(
      `[8004 Refresh] Persisting ${results.size} verification results...`,
    );
    const entries = Array.from(results.entries());
    for (let i = 0; i < entries.length; i += DB_UPSERT_CHUNK) {
      await persistResultsBatch(entries.slice(i, i + DB_UPSERT_CHUNK));
      if (
        (i + DB_UPSERT_CHUNK) % 100 === 0 ||
        i + DB_UPSERT_CHUNK >= entries.length
      ) {
        console.log(
          `[8004 Refresh] Persisted ${Math.min(i + DB_UPSERT_CHUNK, entries.length)}/${entries.length}`,
        );
      }
    }

    // 7. Bust all caches
    console.log("[8004 Refresh] Revalidating caches...");
    try {
      revalidatePath("/api/8004/network");
      revalidatePath("/api/8004/verify");
      revalidatePath("/dashboard/network");
      revalidatePath("/swarm");
      revalidateTag("8004-global-stats", "max");
      revalidateTag("8004-collection-pointers", "max");
      revalidateTag("8004-indexer-available", "max");
      revalidateTag("8004-search-agents", "max");
      revalidateTag("8004-collection-assets", "max");
    } catch {
      /* non-critical */
    }

    const elapsed = Date.now() - startTime;
    const summary = {
      success: true,
      elapsedMs: elapsed,
      elapsedSec: Math.round(elapsed / 1000),
      indexer: {
        totalAgents: allAgents.length,
        totalCollections: uniquePointers.size,
        agentsInCollections: collectedCount,
        uncollected: uncollectedCount,
        globalStats: stats
          ? {
              totalAgents: stats.total_agents,
              totalFeedbacks: stats.total_feedbacks,
              totalValidations: stats.total_validations,
              platinumAgents: stats.platinum_agents,
              goldAgents: stats.gold_agents,
              avgQuality: stats.avg_quality,
            }
          : null,
      },
      verification: {
        totalScanned: allAgents.length,
        verifiable: verifiable.length,
        skippedNoUri: skippedCount,
        verified: verifiedCount,
        partial: partialCount,
        unverified: unverifiedCount,
      },
      db: {
        oldRowsDeleted: deleteResult.count,
        newRowsPersisted: results.size,
      },
      cachesRevalidated: true,
    };

    console.log(
      `[8004 Refresh] Complete in ${summary.elapsedSec}s`,
      JSON.stringify(summary, null, 2),
    );

    return NextResponse.json(summary);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(
      `[8004 Refresh] Failed after ${Math.round(elapsed / 1000)}s:`,
      error,
    );
    return NextResponse.json(
      {
        error: "Refresh failed",
        elapsedMs: elapsed,
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
