import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import { isRedisConfigured, getRedis } from "@/lib/redis";

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
 * Uses a hash prefix of the token to avoid storing the full token in Redis.
 */
function authCacheKey(idToken: string): string {
  // Use last 16 chars of the token as a fingerprint (tokens are JWTs, tail is signature)
  const fingerprint = idToken.slice(-16);
  return `auth:${fingerprint}`;
}

/**
 * Verify authentication from request headers.
 * Returns user info if authenticated, null otherwise.
 *
 * Caches successful verifications in Redis for 60s to avoid
 * hitting Privy API on every request. Cache misses fall through
 * to Privy verification as before.
 */
export async function verifyAuth(req: NextRequest): Promise<AuthResult | null> {
  const idToken = req.headers.get("privy-id-token");
  if (!idToken) return null;

  // Try Redis cache first
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const cached = await redis.get<AuthResult>(authCacheKey(idToken));
      if (cached) return cached;
    } catch {
      // Cache miss or error — fall through to Privy
    }
  }

  const privy = getPrivyClient();

  try {
    const user = await privy.users().get({ id_token: idToken });

    // Find the Solana embedded wallet
    const solanaWallet = user.linked_accounts?.find((account) => {
      if (account.type !== "wallet") return false;

      const wallet = account as {
        chain_type?: string;
        chainType?: string;
        chain?: string;
      };

      return (
        wallet.chain_type === "solana" ||
        wallet.chainType === "solana" ||
        wallet.chain === "solana"
      );
    });

    const walletData = solanaWallet as
      | { id: string; address: string }
      | undefined;

    const result: AuthResult = {
      userId: user.id,
      walletAddress: walletData?.address,
      walletId: walletData?.id,
    };

    // Cache successful auth in Redis
    if (isRedisConfigured()) {
      try {
        const redis = getRedis();
        await redis.set(authCacheKey(idToken), result, { ex: AUTH_CACHE_TTL });
      } catch {
        // Non-critical — just skip caching
      }
    }

    return result;
  } catch (error) {
    console.error("[Auth] verifyAuth error:", error);
    return null;
  }
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
