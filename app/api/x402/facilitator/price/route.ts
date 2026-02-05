/**
 * X402 Facilitator - Price Endpoint
 *
 * Returns current SOL price and USD to lamports conversion.
 * Rate limited to prevent abuse.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSolPrice, usdToLamports } from "@/lib/x402/sol-facilitator";
import {
  MAX_USD_PRICE,
  MIN_USD_PRICE,
  createErrorResponse,
  ERROR_CODES,
} from "@/lib/x402/config";
import { checkRateLimit } from "@/lib/x402/shared";

// Rate limit: 100 requests per minute per IP
const RATE_LIMIT = 100;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export async function GET(req: NextRequest) {
  // Apply rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anonymous";
  const rateCheck = checkRateLimit(
    `price:${ip}`,
    RATE_LIMIT,
    RATE_LIMIT_WINDOW_MS,
  );

  if (rateCheck.limited) {
    return NextResponse.json(
      createErrorResponse("Rate limit exceeded", ERROR_CODES.INVALID_INPUT, {
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((rateCheck.resetAt - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rateCheck.resetAt - Date.now()) / 1000),
          ),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const usdAmount = searchParams.get("usd");

    const solPrice = await getSolPrice();

    const response: {
      solPrice: number;
      timestamp: number;
      lamports?: string;
      usdAmount?: number;
      sol?: string;
    } = {
      solPrice,
      timestamp: Date.now(),
    };

    // If USD amount provided, validate and include lamports conversion
    if (usdAmount) {
      const usd = parseFloat(usdAmount);

      // Validate the USD amount
      if (isNaN(usd)) {
        return NextResponse.json(
          createErrorResponse(
            "Invalid USD amount",
            ERROR_CODES.INVALID_AMOUNT,
            {
              message: `"${usdAmount}" is not a valid number`,
            },
          ),
          { status: 400 },
        );
      }

      if (usd < 0) {
        return NextResponse.json(
          createErrorResponse(
            "USD amount cannot be negative",
            ERROR_CODES.INVALID_AMOUNT,
            {
              message: "Amount must be >= 0",
            },
          ),
          { status: 400 },
        );
      }

      if (usd < MIN_USD_PRICE && usd !== 0) {
        return NextResponse.json(
          createErrorResponse(
            "USD amount too small",
            ERROR_CODES.INVALID_AMOUNT,
            {
              message: `Minimum amount is $${MIN_USD_PRICE}`,
            },
          ),
          { status: 400 },
        );
      }

      if (usd > MAX_USD_PRICE) {
        return NextResponse.json(
          createErrorResponse(
            "USD amount too large",
            ERROR_CODES.INVALID_AMOUNT,
            {
              message: `Maximum amount is $${MAX_USD_PRICE}`,
            },
          ),
          { status: 400 },
        );
      }

      if (!Number.isFinite(usd)) {
        return NextResponse.json(
          createErrorResponse(
            "Invalid USD amount",
            ERROR_CODES.INVALID_AMOUNT,
            {
              message: "Amount must be a finite number",
            },
          ),
          { status: 400 },
        );
      }

      const lamports = await usdToLamports(usd);
      response.lamports = lamports.toString();
      response.usdAmount = usd;
      response.sol = (Number(lamports) / 1e9).toFixed(9);
    }

    return NextResponse.json(response, {
      headers: {
        "X-RateLimit-Remaining": String(rateCheck.remaining),
      },
    });
  } catch (error) {
    return NextResponse.json(
      createErrorResponse("Failed to fetch price", ERROR_CODES.INTERNAL_ERROR, {
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 },
    );
  }
}
