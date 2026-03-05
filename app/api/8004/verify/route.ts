import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import {
  getCachedIsIndexerAvailable,
  getCachedSearchAgents,
} from "@/lib/erc8004/cached";
import prisma from "@/lib/prisma";
import { rateLimitByIP } from "@/lib/rateLimit";
import {
  verifyAgentBatch,
  submitFeedbackBatch,
} from "@/lib/network/verification";
import type { AgentVerification } from "@/lib/network/types";
import type { IndexedAgent } from "8004-solana";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

const DB_UPSERT_CHUNK = 80;
const INDEXER_PAGE_SIZE = 250;
const STALE_THRESHOLD_MS = 0; // TODO: restore to 2 * 60 * 60 * 1000 after fresh run

async function fetchAllIndexedAgents(): Promise<IndexedAgent[]> {
  const all: IndexedAgent[] = [];
  let offset = 0;
  for (;;) {
    const page = await getCachedSearchAgents(INDEXER_PAGE_SIZE, offset);
    all.push(...page);
    if (page.length < INDEXER_PAGE_SIZE) break;
    offset += INDEXER_PAGE_SIZE;
  }
  return all;
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

async function getRecentlyVerifiedAssets(): Promise<Set<string>> {
  try {
    const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);
    const rows = await prisma.networkVerification.findMany({
      where: { verifiedAt: { gte: cutoff } },
      select: { asset: true },
    });
    return new Set(rows.map((r) => r.asset));
  } catch {
    return new Set();
  }
}

function persistResultsBatch(
  entries: [string, AgentVerification][],
): Promise<void> {
  if (entries.length === 0) return Promise.resolve();
  return prisma
    .$transaction(
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
    )
    .then(() => {});
}

// ── POST: Cron-triggered batch verification ──────────────────────────────────

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let indexerUp = false;
    try {
      indexerUp = await getCachedIsIndexerAvailable();
    } catch {
      /* ignore */
    }

    if (!indexerUp) {
      return NextResponse.json(
        { error: "8004 indexer unavailable" },
        { status: 503 },
      );
    }

    const [allAgents, recentlyVerified] = await Promise.all([
      fetchAllIndexedAgents(),
      getRecentlyVerifiedAssets(),
    ]);

    const verifiable = allAgents.filter(isVerifiableAgent);
    const agents = verifiable.filter((a) => !recentlyVerified.has(a.asset));
    const freshCount = verifiable.length - agents.length;

    const skippedCount = allAgents.length - verifiable.length;
    if (skippedCount > 0 || freshCount > 0) {
      console.log(
        `[8004 Verify] ${allAgents.length} total, ${agents.length} to check (${skippedCount} no URI, ${freshCount} still fresh)`,
      );
    }

    if (agents.length === 0) {
      return NextResponse.json({
        total: allAgents.length,
        checked: 0,
        skipped: skippedCount,
        fresh: freshCount,
        verified: 0,
        partial: 0,
        unverified: 0,
      });
    }

    const results = await verifyAgentBatch(agents);

    let verifiedCount = 0;
    let partialCount = 0;
    for (const [, v] of results) {
      if (v.status === "verified") verifiedCount++;
      if (v.status === "partial") partialCount++;
    }

    const summaryPayload = {
      total: allAgents.length,
      checked: agents.length,
      skipped: skippedCount,
      fresh: freshCount,
      verified: verifiedCount,
      partial: partialCount,
      unverified: agents.length - verifiedCount - partialCount,
      checkedAt: new Date().toISOString(),
    };

    // ── Persist to DB + submit feedback in parallel ──
    const entries = Array.from(results.entries());

    const dbPersist = (async () => {
      for (let i = 0; i < entries.length; i += DB_UPSERT_CHUNK) {
        const chunk = entries.slice(i, i + DB_UPSERT_CHUNK);
        try {
          await persistResultsBatch(chunk);
        } catch (err) {
          console.warn("[8004 Verify] Batch upsert failed, falling back:", err);
          await Promise.allSettled(
            chunk.map(([asset, verification]) =>
              prisma.networkVerification.upsert({
                where: { asset },
                create: {
                  asset,
                  status: verification.status,
                  score: verification.score,
                  maxScore: verification.maxScore,
                  checks: verification.checks as object[],
                  verifiedAt: new Date(verification.verifiedAt),
                },
                update: {
                  status: verification.status,
                  score: verification.score,
                  maxScore: verification.maxScore,
                  checks: verification.checks as object[],
                  verifiedAt: new Date(verification.verifiedAt),
                },
              }),
            ),
          );
        }
      }
    })();

    const feedbackSubmit = (async () => {
      if (!process.env.ERC8004_SIGNER_PRIVATE_KEY) return 0;
      try {
        const count = await submitFeedbackBatch(agents, results, 10);
        if (count > 0) {
          console.log(
            `[8004 Verify] Submitted ${count} on-chain feedback entries`,
          );
        }
        return count;
      } catch (err) {
        console.error("[8004 Verify] Feedback submission failed:", err);
        return 0;
      }
    })();

    const [, feedbackSubmitted] = await Promise.all([
      dbPersist,
      feedbackSubmit,
    ]);

    try {
      revalidatePath("/api/8004/network");
      revalidatePath("/dashboard/network");
    } catch {
      /* non-critical */
    }

    return NextResponse.json({
      ...summaryPayload,
      feedbackSubmitted,
    });
  } catch (error) {
    console.error("[8004 Verify] Batch verification failed:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

// ── GET: Read verification results from DB ───────────────────────────────────

export async function GET(req: NextRequest) {
  const limited = await rateLimitByIP(req, "8004-verify", 60);
  if (limited) return limited;

  try {
    const asset = req.nextUrl.searchParams.get("asset");

    if (asset) {
      const row = await prisma.networkVerification.findUnique({
        where: { asset },
        cacheStrategy: { ttl: 60, swr: 120 },
      });

      const verification: AgentVerification | null = row
        ? {
            status: row.status as AgentVerification["status"],
            checks: row.checks as unknown as AgentVerification["checks"],
            verifiedAt: row.verifiedAt.toISOString(),
            score: row.score,
            maxScore: row.maxScore,
          }
        : null;

      return NextResponse.json({ verification });
    }

    // Compute summary from DB
    const [verified, partial, total] = await Promise.all([
      prisma.networkVerification.count({
        where: { status: "verified" },
        cacheStrategy: { ttl: 60, swr: 120 },
      }),
      prisma.networkVerification.count({
        where: { status: "partial" },
        cacheStrategy: { ttl: 60, swr: 120 },
      }),
      prisma.networkVerification.count({
        cacheStrategy: { ttl: 60, swr: 120 },
      }),
    ]);

    const latestRow = await prisma.networkVerification.findFirst({
      orderBy: { verifiedAt: "desc" },
      select: { verifiedAt: true },
      cacheStrategy: { ttl: 60, swr: 120 },
    });

    return NextResponse.json({
      summary: {
        total,
        verified,
        partial,
        unverified: total - verified - partial,
        checkedAt: latestRow?.verifiedAt.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("[8004 Verify] Failed to read results:", error);
    return NextResponse.json(
      { error: "Failed to read verification data" },
      { status: 500 },
    );
  }
}
