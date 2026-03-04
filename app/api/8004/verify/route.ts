import { NextRequest, NextResponse } from "next/server";

import { getErc8004Sdk } from "@/lib/erc8004";
import { rateLimitByIP } from "@/lib/rateLimit";
import { isRedisConfigured, getRedis } from "@/lib/redis";
import {
  verifyAgentBatch,
  submitFeedbackBatch,
} from "@/lib/network/verification";
import type { AgentVerification } from "@/lib/network/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ── Cache Keys ───────────────────────────────────────────────────────────────

const VERIFY_PREFIX = "verify:8004:";
const SUMMARY_KEY = "verify:8004:summary";
const FEEDBACK_LOCK = "verify:8004:feedback-lock";
const RESULT_TTL = 1800; // 30 minutes
const FEEDBACK_COOLDOWN = 3600; // 1 hour between feedback submissions

// ── POST: Cron-triggered batch verification ──────────────────────────────────

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isRedisConfigured()) {
    return NextResponse.json(
      { error: "Redis not configured" },
      { status: 503 },
    );
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

    const results = await verifyAgentBatch(agents, 5);

    const redis = getRedis();
    const pipeline = redis.pipeline();

    let verifiedCount = 0;
    let partialCount = 0;

    for (const [asset, verification] of results) {
      pipeline.set(`${VERIFY_PREFIX}${asset}`, JSON.stringify(verification), {
        ex: RESULT_TTL,
      });
      if (verification.status === "verified") verifiedCount++;
      if (verification.status === "partial") partialCount++;
    }

    pipeline.set(
      SUMMARY_KEY,
      JSON.stringify({
        total: agents.length,
        verified: verifiedCount,
        partial: partialCount,
        unverified: agents.length - verifiedCount - partialCount,
        checkedAt: new Date().toISOString(),
      }),
      { ex: RESULT_TTL },
    );

    // Invalidate network cache so next request picks up verification data
    pipeline.del("api:8004:network");

    await pipeline.exec();

    // ── Submit on-chain feedback (dedup with cooldown lock) ──
    let feedbackSubmitted = 0;
    if (process.env.ERC8004_SIGNER_PRIVATE_KEY) {
      try {
        const lockAcquired = await redis.set(FEEDBACK_LOCK, "1", {
          ex: FEEDBACK_COOLDOWN,
          nx: true,
        });

        if (lockAcquired) {
          feedbackSubmitted = await submitFeedbackBatch(
            agents,
            results,
            3,
          );
          console.log(
            `[8004 Verify] Submitted ${feedbackSubmitted} on-chain feedback entries`,
          );
        }
      } catch (err) {
        console.error("[8004 Verify] Feedback submission failed:", err);
      }
    }

    return NextResponse.json({
      total: agents.length,
      verified: verifiedCount,
      partial: partialCount,
      unverified: agents.length - verifiedCount - partialCount,
      feedbackSubmitted,
    });
  } catch (error) {
    console.error("[8004 Verify] Batch verification failed:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 },
    );
  }
}

// ── GET: Read cached verification results ────────────────────────────────────

export async function GET(req: NextRequest) {
  const limited = await rateLimitByIP(req, "8004-verify", 60);
  if (limited) return limited;

  if (!isRedisConfigured()) {
    return NextResponse.json({ results: {}, summary: null });
  }

  try {
    const redis = getRedis();
    const asset = req.nextUrl.searchParams.get("asset");

    if (asset) {
      const raw = await redis.get<string>(`${VERIFY_PREFIX}${asset}`);
      const verification: AgentVerification | null = raw
        ? (typeof raw === "string" ? JSON.parse(raw) : raw)
        : null;
      return NextResponse.json({ verification });
    }

    const summary = await redis.get(SUMMARY_KEY);

    return NextResponse.json({
      summary: summary || null,
    });
  } catch (error) {
    console.error("[8004 Verify] Failed to read results:", error);
    return NextResponse.json(
      { error: "Failed to read verification data" },
      { status: 500 },
    );
  }
}
