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
 * Cached Privy verification result. Only caches the expensive Privy API
 * verification — the active wallet is resolved separately from the DB
 * so wallet switches take effect immediately.
 */
interface CachedPrivyAuth {
  userId: string;
  /** First Solana wallet from Privy (fallback if no active wallet in DB) */
  privyWalletAddress?: string;
  privyWalletId?: string;
}

/**
 * Verify authentication from request headers.
 * Returns user info if authenticated, null otherwise.
 *
 * The Privy token → userId verification is cached in Redis for 60s.
 * The active wallet is always resolved from the database so that
 * wallet switches take effect immediately (no stale cache).
 */
export async function verifyAuth(req: NextRequest): Promise<AuthResult | null> {
  const idToken = req.headers.get("privy-id-token");
  if (!idToken) return null;

  let cached: CachedPrivyAuth | null = null;

  // Try Redis cache for the expensive Privy token verification
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      cached = await redis.get<CachedPrivyAuth>(authCacheKey(idToken));
    } catch {
      // Cache miss or error — fall through to Privy
    }
  }

  // If not cached, verify with Privy (expensive network call)
  if (!cached) {
    const privy = getPrivyClient();

    try {
      const user = await privy.users().get({ id_token: idToken });

      // Find the first Solana wallet as default fallback
      const solanaWallet = user.linked_accounts?.find((account) => {
        if (account.type !== "wallet") return false;
        const w = account as unknown as Record<string, unknown>;
        return (
          w.chain_type === "solana" ||
          w.chainType === "solana" ||
          w.chain === "solana"
        );
      });

      const w = solanaWallet as unknown as Record<string, unknown> | undefined;
      const walletData =
        w && typeof w.id === "string" && typeof w.address === "string"
          ? { id: w.id, address: w.address }
          : undefined;

      cached = {
        userId: user.id,
        privyWalletAddress: walletData?.address,
        privyWalletId: walletData?.id,
      };

      // Cache the Privy verification result
      if (isRedisConfigured()) {
        try {
          const redis = getRedis();
          await redis.set(authCacheKey(idToken), cached, {
            ex: AUTH_CACHE_TTL,
          });
        } catch {
          // Non-critical — just skip caching
        }
      }
    } catch (error) {
      console.error("[Auth] verifyAuth error:", error);
      return null;
    }
  }

  // ── Resolve active wallet from DB (always fresh, not cached) ────
  // This ensures wallet switches take effect immediately for transaction
  // building, billing, and all other wallet-dependent operations.
  try {
    const user = await prisma.user.findUnique({
      where: { id: cached.userId },
      select: {
        activeWallet: {
          select: { address: true, privyWalletId: true },
        },
      },
      cacheStrategy: { ttl: 5 },
    });

    if (user?.activeWallet) {
      return {
        userId: cached.userId,
        walletAddress: user.activeWallet.address,
        walletId: user.activeWallet.privyWalletId,
      };
    }
  } catch (error) {
    console.warn(
      "[Auth] Failed to look up active wallet, falling back to Privy default:",
      error,
    );
  }

  // Fall back to first Privy wallet if no active wallet in DB
  return {
    userId: cached.userId,
    walletAddress: cached.privyWalletAddress,
    walletId: cached.privyWalletId,
  };
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
