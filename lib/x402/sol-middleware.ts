/**
 * Native SOL Payment Middleware (External x402 Users)
 *
 * Custom x402 middleware for EXTERNAL wallet users who pay upfront.
 * These users sign transactions client-side (Phantom, Solflare, etc).
 *
 * Uses flat-rate pricing since we can't get AI Gateway costs for external users.
 *
 * For Privy users with usage-based billing, see sol-server-middleware.ts
 */

import { NextRequest, NextResponse } from "next/server";
import {
  usdToLamports,
  verifyPayment,
  settlePayment,
  extractPaymentFromHeaders,
} from "./sol-facilitator";
import {
  SOL_NETWORK,
  TREASURY_ADDRESS,
  PRICING,
  ROUTE_DESCRIPTIONS,
  type SolNetwork,
  type PricingKey,
} from "./config";
import {
  create402Response,
  buildPaymentRequirements,
  addPaymentReceiptHeader,
} from "./shared";

// Re-export for backward compatibility
export { SOL_NETWORK, type SolNetwork };
export const SOL_TREASURY_ADDRESS = TREASURY_ADDRESS;
export const SOL_PRICING = PRICING;
export const SOL_ROUTE_DESCRIPTIONS = ROUTE_DESCRIPTIONS;

/**
 * Wrap an API route handler with native SOL payment protection.
 *
 * @param handler - The route handler function
 * @param priceKey - Key from SOL_PRICING config
 * @returns Wrapped handler that requires SOL payment
 */
export function withSolPayment<
  T extends (req: NextRequest) => Promise<Response | NextResponse>,
>(handler: T, priceKey: PricingKey): T {
  // Validate config
  if (!SOL_TREASURY_ADDRESS) {
    const errorHandler = async () => {
      return NextResponse.json(
        { error: "Payment system not configured" },
        { status: 500 },
      );
    };
    return errorHandler as unknown as T;
  }

  const wrappedHandler = async (req: NextRequest): Promise<Response> => {
    const usdPrice = SOL_PRICING[priceKey];
    const description = SOL_ROUTE_DESCRIPTIONS[priceKey];
    const resourceUrl = req.url;

    // Check for payment header
    const paymentPayload = extractPaymentFromHeaders(req.headers);

    if (!paymentPayload) {
      // No payment - return 402 with requirements
      return create402Response(usdPrice, description, resourceUrl);
    }

    // Build payment requirements for verification
    const lamports = await usdToLamports(usdPrice);
    const paymentRequirements = buildPaymentRequirements(
      lamports,
      resourceUrl,
      description,
    );

    // Verify payment
    const verifyResult = await verifyPayment(
      paymentPayload,
      paymentRequirements,
    );

    if (!verifyResult.isValid) {
      return NextResponse.json(
        {
          x402Version: 1,
          error: `Payment verification failed: ${verifyResult.invalidReason}`,
          accepts: [paymentRequirements],
        },
        { status: 402 },
      );
    }

    // Execute the handler
    const response = await handler(req);

    // Only settle if response is successful (status < 400)
    if (response.status < 400) {
      const settleResult = await settlePayment(
        paymentPayload,
        paymentRequirements,
      );

      // Add payment response header
      const paymentResponse = {
        success: settleResult.success,
        transaction: settleResult.transaction,
        network: SOL_NETWORK,
        payer: verifyResult.payer,
        ...(settleResult.errorReason && { error: settleResult.errorReason }),
      };

      return addPaymentReceiptHeader(response, paymentResponse);
    }

    return response;
  };

  return wrappedHandler as unknown as T;
}

/**
 * Check if SOL payments are enabled
 */
export function isSolPaymentEnabled(): boolean {
  return !!SOL_TREASURY_ADDRESS;
}

/**
 * Get current pricing with SOL conversion
 */
export async function getPricingWithSol(): Promise<
  Record<PricingKey, { usd: number; lamports: string; sol: number }>
> {
  const result: Record<string, { usd: number; lamports: string; sol: number }> =
    {};

  for (const [key, usdPrice] of Object.entries(SOL_PRICING)) {
    const lamports = await usdToLamports(usdPrice);
    result[key] = {
      usd: usdPrice,
      lamports: lamports.toString(),
      sol: Number(lamports) / 1e9,
    };
  }

  return result as Record<
    PricingKey,
    { usd: number; lamports: string; sol: number }
  >;
}
