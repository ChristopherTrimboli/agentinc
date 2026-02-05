/**
 * X402 Payment Configuration
 *
 * Central configuration for native SOL payments.
 * This file is the CANONICAL SOURCE OF TRUTH for all x402 configuration.
 * Other files should import from here - do not duplicate these values.
 *
 * PRICING ARCHITECTURE:
 * - External x402 users: Flat-rate pre-payment
 * - Privy users: Usage-based post-payment from AI Gateway costs
 */

import { PublicKey } from "@solana/web3.js";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Supported Solana networks for x402 payments
 */
export type SolNetwork = "solana" | "solana-devnet";

/**
 * Pricing key for looking up route prices
 */
export type PricingKey = keyof typeof PRICING;

// =============================================================================
// NETWORK CONFIGURATION
// =============================================================================

/**
 * Get the current Solana network.
 *
 * Priority:
 * 1. Explicit SOLANA_NETWORK env var
 * 2. Auto-detect from SOLANA_RPC_URL
 * 3. Default based on NODE_ENV (production = mainnet, else devnet)
 */
export function getCurrentNetwork(): SolNetwork {
  // Explicit override takes precedence
  if (process.env.SOLANA_NETWORK === "devnet") {
    return "solana-devnet";
  }
  if (process.env.SOLANA_NETWORK === "mainnet") {
    return "solana";
  }

  // Auto-detect from RPC URL
  const rpcUrl = process.env.SOLANA_RPC_URL || "";
  if (rpcUrl.includes("devnet")) {
    return "solana-devnet";
  }

  // Default based on environment
  return process.env.NODE_ENV === "production" ? "solana" : "solana-devnet";
}

/**
 * Current network (cached for performance)
 */
export const SOL_NETWORK: SolNetwork = getCurrentNetwork();

// =============================================================================
// TREASURY CONFIGURATION
// =============================================================================

/**
 * Treasury wallet address that receives payments.
 * Validated at startup to catch misconfiguration early.
 */
export const TREASURY_ADDRESS = process.env.X402_TREASURY_ADDRESS || "";

/**
 * Treasury wallet ID for Privy (enables auto-refunds from treasury)
 */
export const TREASURY_WALLET_ID = process.env.X402_TREASURY_WALLET_ID || "";

/**
 * Validate a Solana address is properly formatted
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || address.length === 0) return false;
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// FACILITATOR CONFIGURATION
// =============================================================================

/**
 * Our own facilitator URL (self-hosted)
 */
export const FACILITATOR_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/x402/facilitator`
  : "http://localhost:3000/api/x402/facilitator";

// =============================================================================
// PRICING CONFIGURATION
// =============================================================================

/**
 * Flat-rate pricing in USD (used for external x402 users who pay upfront).
 * Privy users are charged actual costs from AI Gateway instead.
 */
export const PRICING = {
  chat: 0.01, // $0.01 per request
  speech: 0.005, // $0.005 per request
  transcribe: 0.005, // $0.005 per request
  generateImage: 0.02, // $0.02 per request
} as const;

/**
 * Human-readable descriptions for each route
 */
export const ROUTE_DESCRIPTIONS: Record<PricingKey, string> = {
  chat: "AI Chat Inference",
  speech: "Text-to-Speech Generation",
  transcribe: "Speech-to-Text Transcription",
  generateImage: "AI Image Generation",
} as const;

/**
 * Maximum allowed price for validation (prevents accidental overcharging)
 */
export const MAX_USD_PRICE = 10.0;

/**
 * Minimum allowed price for validation
 */
export const MIN_USD_PRICE = 0.0001;

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validation result with detailed error messages
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate x402 configuration at startup.
 * Should be called during server initialization.
 */
export function validateX402Config(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Treasury address validation
  if (!TREASURY_ADDRESS) {
    errors.push("X402_TREASURY_ADDRESS is required but not set");
  } else if (!isValidSolanaAddress(TREASURY_ADDRESS)) {
    errors.push(
      `X402_TREASURY_ADDRESS is not a valid Solana address: ${TREASURY_ADDRESS}`,
    );
  }

  // Treasury wallet ID (optional but recommended for auto-refunds)
  if (!TREASURY_WALLET_ID) {
    warnings.push("X402_TREASURY_WALLET_ID not set - auto-refunds disabled");
  }

  // Network configuration sanity check
  if (SOL_NETWORK === "solana" && process.env.NODE_ENV !== "production") {
    warnings.push(
      "Using mainnet in non-production environment - is this intentional?",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get validation results for startup checks.
 * Returns the validation result for the caller to handle as needed.
 */
export function logValidationResults(): ValidationResult {
  return validateX402Config();
}

// =============================================================================
// STANDARDIZED ERROR RESPONSES
// =============================================================================

/**
 * Standard error codes for x402 payment errors.
 * Use these consistently across all endpoints.
 */
export const ERROR_CODES = {
  // Payment required errors (402)
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PAYMENT_VERIFICATION_FAILED: "PAYMENT_VERIFICATION_FAILED",

  // Configuration errors (503)
  PAYMENT_SYSTEM_MISCONFIGURED: "PAYMENT_SYSTEM_MISCONFIGURED",

  // Auth errors (401/403)
  UNAUTHORIZED: "UNAUTHORIZED",
  NO_WALLET: "NO_WALLET",
  WALLET_NOT_SETUP: "WALLET_NOT_SETUP",

  // Validation errors (400)
  INVALID_INPUT: "INVALID_INPUT",
  INVALID_AMOUNT: "INVALID_AMOUNT",

  // Server errors (500)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  HANDLER_ERROR: "HANDLER_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Standardized error response structure for all x402 endpoints.
 */
export interface X402ErrorResponse {
  error: string;
  code: ErrorCode;
  details?: {
    message?: string;
    required?: {
      lamports?: string;
      sol?: string;
      usd?: string;
    };
    wallet?: string;
    [key: string]: unknown;
  };
}

/**
 * Create a standardized error response.
 * Use this to ensure consistent error format across all endpoints.
 */
export function createErrorResponse(
  error: string,
  code: ErrorCode,
  details?: X402ErrorResponse["details"],
): X402ErrorResponse {
  return {
    error,
    code,
    ...(details && { details }),
  };
}

// =============================================================================
// LEGACY ALIASES (for backward compatibility)
// =============================================================================

/** @deprecated Use TREASURY_ADDRESS instead */
export const X402_TREASURY_ADDRESS = TREASURY_ADDRESS;

/** @deprecated Use SOL_NETWORK instead */
export const X402_NETWORK = SOL_NETWORK;

/** @deprecated Use FACILITATOR_URL instead */
export const X402_FACILITATOR_URL = FACILITATOR_URL;

/** @deprecated Use SolNetwork instead */
export type X402Network = SolNetwork;
