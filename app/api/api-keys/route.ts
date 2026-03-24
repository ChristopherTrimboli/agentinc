/**
 * API Keys — List & Create
 *
 * GET  /api/api-keys  — List all keys for the authenticated user
 * POST /api/api-keys  — Create a new API key (returns raw key once)
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";

const MAX_KEYS_PER_USER = 10;
const KEY_PREFIX = "sk-ai_";

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function generateApiKey(): string {
  return `${KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

/** List all API keys for the authenticated user (hashed keys only). */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthResult(auth)) return auth;

    const keys = await prisma.apiKey.findMany({
      where: { userId: auth.userId },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        totalRequests: true,
        revokedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("[api-keys] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load API keys" },
      { status: 500 },
    );
  }
}

/** Create a new API key. The raw key is returned only once. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthResult(auth)) return auth;

    const rateLimited = await rateLimitByUser(
      auth.userId,
      "api-keys-create",
      10,
    );
    if (rateLimited) return rateLimited;

    let body: { name?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const name = (body.name ?? "Untitled Key").trim().slice(0, 100);
    if (!name) {
      return NextResponse.json(
        { error: "Key name is required" },
        { status: 400 },
      );
    }

    const rawKey = generateApiKey();
    const keyHash = hashKey(rawKey);
    const prefix = rawKey.slice(0, KEY_PREFIX.length + 8);

    // Atomic count-check + create to prevent exceeding the limit under concurrency
    const apiKey = await prisma.$transaction(async (tx) => {
      const existingCount = await tx.apiKey.count({
        where: { userId: auth.userId, revokedAt: null },
      });
      if (existingCount >= MAX_KEYS_PER_USER) {
        const err = new Error(
          `Maximum of ${MAX_KEYS_PER_USER} active keys allowed`,
        );
        (err as Error & { isUserError: boolean }).isUserError = true;
        throw err;
      }

      return tx.apiKey.create({
        data: { name, prefix, keyHash, userId: auth.userId },
        select: { id: true, name: true, prefix: true, createdAt: true },
      });
    });

    return NextResponse.json({ ...apiKey, key: rawKey }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create key";
    const isUserError =
      error instanceof Error &&
      (error as Error & { isUserError?: boolean }).isUserError === true;
    console.error("[api-keys] POST error:", error);
    return NextResponse.json(
      { error: message },
      { status: isUserError ? 400 : 500 },
    );
  }
}
