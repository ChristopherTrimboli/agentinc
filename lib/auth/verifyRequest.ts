import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import { createHash } from "crypto";
import { isRedisConfigured, getRedis } from "@/lib/redis";
import prisma from "@/lib/prisma";

// Singleton Privy client
let _privyClient: PrivyClient | null = null;

/**
 * Get the singleton Privy client instance.
 * Use this instead of creating new PrivyClient instances in routes.
 */
export function getPrivyClient(): PrivyClient {
  if (!_privyClient) {
    if (
      !process.env.NEXT_PUBLIC_PRIVY_APP_ID ||
      !process.env.PRIVY_APP_SECRET
    ) {
      throw new Error("Privy environment variables not configured");
    }
    _privyClient = new PrivyClient({
      appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
      appSecret: process.env.PRIVY_APP_SECRET,
    });
  }
  return _privyClient;
}

export interface AuthResult {
  userId: string;
  walletAddress?: string;
  walletId?: string;
}

/**
 * Cache TTL for auth results in seconds.
 * Short TTL (60s) balances performance with security:
 * - Avoids hitting Privy API on every request
 * - Token revocations take effect within 60s
 */
const AUTH_CACHE_TTL = 60;

/**
 * Generate a short, stable cache key from the ID token.
 * Uses a SHA-256 hash of the full token to avoid collisions
 * (the previous last-16-chars approach could collide across different JWTs).
 */
function authCacheKey(idToken: string): string {
  const hash = createHash("sha256").update(idToken).digest("hex").slice(0, 32);
  return `auth:${hash}`;
}

/**
 * Verify authentication from request headers.
 * Returns user info if authenticated, null otherwise.
 *
 * Two-step process:
 * 1. Verify Privy ID token → userId (cached in Redis for 60s)
 * 2. Resolve active wallet from DB (always fresh, never cached)
 *
 * Wallet resolution always comes from the database (UserWallet table),
 * never from Privy linked_accounts. Server-owned wallets don't appear
 * in linked_accounts, so that path would return unusable addresses.
 */
export async function verifyAuth(req: NextRequest): Promise<AuthResult | null> {
  const idToken = req.headers.get("privy-id-token");
  if (!idToken) return null;

  // ── Step 1: Verify token → userId (cached) ─────────────────────
  let userId: string | null = null;

  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      userId = await redis.get<string>(authCacheKey(idToken));
    } catch {
      // Cache miss or error — fall through to Privy
    }
  }

  if (!userId) {
    const privy = getPrivyClient();
    try {
      const user = await privy.users().get({ id_token: idToken });
      userId = user.id;

      // Cache the userId (the only expensive part is the Privy API call)
      if (isRedisConfigured()) {
        try {
          const redis = getRedis();
          await redis.set(authCacheKey(idToken), userId, {
            ex: AUTH_CACHE_TTL,
          });
        } catch {
          // Non-critical — just skip caching
        }
      }
    } catch (error) {
      console.error("[Auth] Privy token verification failed:", error);
      return null;
    }
  }

  // ── Step 2: Resolve active wallet from DB (always fresh) ────────
  // Not cached — wallet switches must take effect on the next request.
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        activeWallet: {
          select: { address: true, privyWalletId: true },
        },
      },
    });

    if (user?.activeWallet) {
      return {
        userId,
        walletAddress: user.activeWallet.address,
        walletId: user.activeWallet.privyWalletId,
      };
    }
  } catch (error) {
    console.warn("[Auth] Failed to look up active wallet:", error);
  }

  // User is authenticated but has no active wallet yet (new user pre-sync)
  return { userId };
}

/**
 * Middleware helper that returns an unauthorized response if auth fails.
 * Use this to reduce boilerplate in API routes.
 */
export async function requireAuth(
  req: NextRequest,
): Promise<AuthResult | NextResponse> {
  const auth = await verifyAuth(req);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return auth;
}

/**
 * Type guard to check if the result is an auth object or a response.
 */
export function isAuthResult(
  result: AuthResult | NextResponse,
): result is AuthResult {
  return "userId" in result;
}

/**
 * Verify authentication and return just the user ID.
 * Convenience wrapper for routes that only need the userId string.
 * Use this instead of duplicating verifyAuth logic in each route file.
 */
export async function verifyAuthUserId(
  req: NextRequest,
): Promise<string | null> {
  const auth = await verifyAuth(req);
  return auth?.userId ?? null;
}
