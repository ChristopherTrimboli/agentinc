/**
 * X402 Facilitator - Verify Endpoint
 *
 * Verifies native SOL payment transactions.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyPayment } from "@/lib/x402/sol-facilitator";
import { createErrorResponse, ERROR_CODES } from "@/lib/x402/config";
import {
  VerifyRequestSchema,
  validateRequestBody,
} from "@/lib/x402/validation";
import { rateLimitByIP } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  // Rate limit: 30 requests per minute per IP (public endpoint)
  const rateLimited = await rateLimitByIP(req, "x402-verify", 30);
  if (rateLimited) return rateLimited;

  try {
    const body = await req.json();

    // Validate request body
    const validation = validateRequestBody(body, VerifyRequestSchema);
    if (!validation.success) {
      return NextResponse.json(
        createErrorResponse("Invalid request body", ERROR_CODES.INVALID_INPUT, {
          message: validation.error,
        }),
        { status: 400 },
      );
    }

    const { paymentPayload, paymentRequirements } = validation.data;

    // Verify the payment
    const result = await verifyPayment(paymentPayload, paymentRequirements);

    // Return standardized response
    return NextResponse.json({
      isValid: result.isValid,
      ...(result.invalidReason && { invalidReason: result.invalidReason }),
      ...(result.payer && { payer: result.payer }),
    });
  } catch (error) {
    console.error("[X402 Verify] Error:", error);
    return NextResponse.json(
      createErrorResponse("Verification failed", ERROR_CODES.INTERNAL_ERROR, {
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 },
    );
  }
}
