/**
 * Shared X402 Utilities
 *
 * Common functions used by both external (sol-middleware) and
 * server-side (sol-server-middleware) payment flows.
 */

import { NextResponse } from "next/server";
import { SOL_NETWORK, TREASURY_ADDRESS, type SolNetwork } from "./config";
import {
  getSolPrice,
  usdToLamports,
  type SolPaymentRequirements,
} from "./sol-facilitator";

/**
 * Simple in-memory rate limiter.
 * For production, consider using Redis-based rate limiting (@upstash/ratelimit).
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if a request should be rate limited.
 *
 * @param key - Unique identifier (e.g., IP address)
 * @param limit - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Object indicating if limited and remaining requests
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { limited: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { limited: false, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { limited: true, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    limited: false,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Clean up expired rate limit entries (call periodically).
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/**
 * Build x402-compliant payment requirements.
 */
export function buildPaymentRequirements(
  lamports: bigint,
  resource: string,
  description: string,
  usdPrice?: number,
  solPrice?: number,
): SolPaymentRequirements {
  return {
    scheme: "exact",
    network: SOL_NETWORK,
    maxAmountRequired: lamports.toString(),
    asset: "native",
    payTo: TREASURY_ADDRESS,
    resource,
    description,
    maxTimeoutSeconds: 300,
    extra:
      usdPrice !== undefined && solPrice !== undefined
        ? {
            usdAmount: usdPrice.toFixed(4),
            solPrice,
          }
        : undefined,
  };
}

/**
 * Create a 402 Payment Required response with native SOL requirements.
 */
export async function create402Response(
  usdPrice: number,
  description: string,
  resourceUrl: string,
): Promise<NextResponse> {
  const solPrice = await getSolPrice();
  const lamports = await usdToLamports(usdPrice);

  const paymentRequirements = buildPaymentRequirements(
    lamports,
    resourceUrl,
    description,
    usdPrice,
    solPrice,
  );

  const responseBody = {
    x402Version: 1,
    error: "Payment required",
    accepts: [paymentRequirements],
  };

  return NextResponse.json(responseBody, {
    status: 402,
    headers: {
      "X-Payment-Required": Buffer.from(JSON.stringify(responseBody)).toString(
        "base64",
      ),
    },
  });
}

/**
 * Add payment receipt header to response.
 */
export function addPaymentReceiptHeader(
  response: Response,
  receipt: {
    success: boolean;
    transaction?: string;
    network: SolNetwork;
    payer?: string;
    amount?: {
      lamports: string;
      sol: string;
      usd: string;
    };
    error?: string;
    flow?: "external" | "privy-server";
  },
): Response {
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });
  newResponse.headers.set(
    "X-PAYMENT-RESPONSE",
    Buffer.from(JSON.stringify(receipt)).toString("base64"),
  );
  return newResponse;
}

/**
 * Convert lamports to SOL string for display.
 */
export function lamportsToSolString(lamports: bigint): string {
  const sol = Number(lamports) / 1e9;
  if (sol < 0.000001) return "<0.000001";
  if (sol < 0.001) return sol.toFixed(8);
  if (sol < 1) return sol.toFixed(6);
  return sol.toFixed(4);
}
