/**
 * Validate a Bearer API key against the database.
 * Used by /api/v1/* routes to authenticate external SDK consumers.
 */

import { createHash } from "crypto";
import prisma from "@/lib/prisma";

export interface ApiKeyValidation {
  valid: true;
  keyId: string;
  userId: string;
}

export interface ApiKeyError {
  valid: false;
  error: string;
  status: number;
}

export type ApiKeyResult = ApiKeyValidation | ApiKeyError;

function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Look up and validate an API key from a raw Bearer token.
 * Also bumps lastUsedAt and totalRequests in the background.
 */
export async function validateApiKey(rawKey: string): Promise<ApiKeyResult> {
  if (!rawKey || !rawKey.startsWith("sk-ai_")) {
    return { valid: false, error: "Invalid API key format", status: 401 };
  }

  const keyHash = hashKey(rawKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: {
      id: true,
      userId: true,
      revokedAt: true,
      expiresAt: true,
    },
  });

  if (!apiKey) {
    return { valid: false, error: "Invalid API key", status: 401 };
  }

  if (apiKey.revokedAt) {
    return { valid: false, error: "API key has been revoked", status: 401 };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return { valid: false, error: "API key has expired", status: 401 };
  }

  // Fire-and-forget usage tracking — don't block the response
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: {
        lastUsedAt: new Date(),
        totalRequests: { increment: 1 },
      },
    })
    .catch(() => {});

  return {
    valid: true,
    keyId: apiKey.id,
    userId: apiKey.userId,
  };
}
