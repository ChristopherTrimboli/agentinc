import { NextRequest, NextResponse } from "next/server";

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

export const dynamic = "force-dynamic";
export const maxDuration = 900;

const DB_UPSERT_CHUNK = 50;

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

    const allAgents = await getCachedSearchAgents(500, 0);

    // Skip agents missing required fields — no point verifying bare registrations
    const agents = allAgents.filter((a) => {
      const uri = a.agent_uri;
      if (!uri || uri.length < 10) return false;

      // Inline JSON — require services or endpoints array to count as real
      if (uri.startsWith("{")) {
        try {
          const json = JSON.parse(uri);
          return (
            Array.isArray(json.services) || Array.isArray(json.endpoints)
          );
        } catch {
          return false;
        }
      }

      // Must be a fetchable URL
      if (
        !uri.startsWith("http") &&
        !uri.startsWith("ipfs://") &&
        !uri.startsWith("ar://")
      ) {
        return false;
      }

      // Skip known non-metadata URLs (READMEs, GitHub raw, etc.)
      if (/readme|\.md$|\.txt$/i.test(uri)) return false;

      return true;
    });

    const skippedCount = allAgents.length - agents.length;
    if (skippedCount > 0) {
      console.log(
        `[8004 Verify] Skipped ${skippedCount}/${allAgents.length} agents missing valid agent_uri`,
      );
    }

    if (agents.length === 0) {
      return NextResponse.json({ verified: 0, total: 0, skipped: skippedCount });
    }

    const results = await verifyAgentBatch(agents, 10);

    let verifiedCount = 0;
    let partialCount = 0;
    for (const [, verification] of results) {
      if (verification.status === "verified") verifiedCount++;
      if (verification.status === "partial") partialCount++;
    }

    const summaryPayload = {
      total: allAgents.length,
      checked: agents.length,
      skipped: skippedCount,
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
    })();

    const feedbackSubmit = (async () => {
      if (!process.env.ERC8004_SIGNER_PRIVATE_KEY) return 0;
      try {
        const count = await submitFeedbackBatch(agents, results, 5);
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
