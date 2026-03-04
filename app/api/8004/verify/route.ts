import { NextRequest, NextResponse } from "next/server";

import { getErc8004Sdk } from "@/lib/erc8004";
import prisma from "@/lib/prisma";
import { rateLimitByIP } from "@/lib/rateLimit";
import { isRedisConfigured, getRedis } from "@/lib/redis";
import {
  verifyAgentBatch,
  submitFeedbackBatch,
} from "@/lib/network/verification";
import type { AgentVerification } from "@/lib/network/types";

export const dynamic = "force-dynamic";
export const maxDuration = 800;

// ── Cache Keys ───────────────────────────────────────────────────────────────

const VERIFY_PREFIX = "verify:8004:";
const SUMMARY_KEY = "verify:8004:summary";
const RESULT_TTL = 7200;
const DB_UPSERT_CHUNK = 50;

// ── POST: Cron-triggered batch verification ──────────────────────────────────

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sdk = getErc8004Sdk();

    let indexerUp = false;
    try {
      indexerUp = await sdk.isIndexerAvailable();
    } catch {
      /* ignore */
    }

    if (!indexerUp) {
      return NextResponse.json(
        { error: "8004 indexer unavailable" },
        { status: 503 },
      );
    }

    const agents = await sdk.searchAgents({ limit: 500 });

    if (agents.length === 0) {
      return NextResponse.json({ verified: 0, total: 0 });
    }

    const results = await verifyAgentBatch(agents, 10);

    let verifiedCount = 0;
    let partialCount = 0;
    for (const [, verification] of results) {
      if (verification.status === "verified") verifiedCount++;
      if (verification.status === "partial") partialCount++;
    }

    const summaryPayload = {
      total: agents.length,
      verified: verifiedCount,
      partial: partialCount,
      unverified: agents.length - verifiedCount - partialCount,
      checkedAt: new Date().toISOString(),
    };

    // ── Persist + cache + feedback in parallel ──
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

    const redisCache = (async () => {
      if (!isRedisConfigured()) return;
      try {
        const redis = getRedis();
        const pipeline = redis.pipeline();

        for (const [asset, verification] of entries) {
          pipeline.set(
            `${VERIFY_PREFIX}${asset}`,
            JSON.stringify(verification),
            { ex: RESULT_TTL },
          );
        }

        pipeline.set(SUMMARY_KEY, JSON.stringify(summaryPayload), {
          ex: RESULT_TTL,
        });
        pipeline.del("api:8004:network");
        await pipeline.exec();
      } catch (err) {
        console.warn(
          "[8004 Verify] Redis cache write failed (non-critical):",
          err,
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

    const [, , feedbackSubmitted] = await Promise.all([
      dbPersist,
      redisCache,
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

// ── GET: Read verification results (Redis → DB fallback) ─────────────────────

export async function GET(req: NextRequest) {
  const limited = await rateLimitByIP(req, "8004-verify", 60);
  if (limited) return limited;

  try {
    const asset = req.nextUrl.searchParams.get("asset");

    if (asset) {
      // Try Redis cache first
      if (isRedisConfigured()) {
        try {
          const redis = getRedis();
          const raw = await redis.get<string>(`${VERIFY_PREFIX}${asset}`);
          if (raw) {
            const verification: AgentVerification =
              typeof raw === "string" ? JSON.parse(raw) : raw;
            return NextResponse.json({ verification });
          }
        } catch {
          /* fall through to DB */
        }
      }

      // DB fallback
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

    // Summary — try Redis first
    if (isRedisConfigured()) {
      try {
        const redis = getRedis();
        const summary = await redis.get(SUMMARY_KEY);
        if (summary) return NextResponse.json({ summary });
      } catch {
        /* fall through to DB */
      }
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
