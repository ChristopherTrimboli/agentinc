/**
 * X402 Facilitator - Settle Endpoint
 *
 * Settles native SOL payment transactions.
 */

import { NextRequest, NextResponse } from "next/server";
import { settlePayment } from "@/lib/x402/sol-facilitator";
import { createErrorResponse, ERROR_CODES } from "@/lib/x402/config";
import {
  SettleRequestSchema,
  validateRequestBody,
} from "@/lib/x402/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request body
    const validation = validateRequestBody(body, SettleRequestSchema);
    if (!validation.success) {
      return NextResponse.json(
        createErrorResponse("Invalid request body", ERROR_CODES.INVALID_INPUT, {
          message: validation.error,
        }),
        { status: 400 },
      );
    }

    const { paymentPayload, paymentRequirements } = validation.data;

    // Settle the payment
    const result = await settlePayment(paymentPayload, paymentRequirements);

    // Return standardized response
    return NextResponse.json({
      success: result.success,
      ...(result.errorReason && { errorReason: result.errorReason }),
      transaction: result.transaction,
      network: result.network,
      payer: result.payer,
    });
  } catch (error) {
    return NextResponse.json(
      createErrorResponse("Settlement failed", ERROR_CODES.INTERNAL_ERROR, {
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 },
    );
  }
}
