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
 * Logs a clear error at startup if missing or invalid so misconfiguration
 * is caught immediately rather than silently sending payments to nowhere.
 */
export const TREASURY_ADDRESS: string = (() => {
  const addr = process.env.X402_TREASURY_ADDRESS || "";
  // Only validate on the server — client bundles don't have access to
  // non-NEXT_PUBLIC_ env vars, so this check would always false-alarm there.
  if (typeof window === "undefined") {
    if (!addr) {
      console.error(
        "[x402] CRITICAL: X402_TREASURY_ADDRESS is not set. Payments will be rejected until configured.",
      );
    } else {
      try {
        new PublicKey(addr);
      } catch {
        console.error(
          `[x402] CRITICAL: X402_TREASURY_ADDRESS is not a valid Solana address: "${addr}"`,
        );
      }
    }
  }
  return addr;
})();

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
 * X API (Twitter) per-tool pricing in USD.
 *
 * Based on X's pay-per-use pricing pilot (January 2026).
 * Source: https://pricetimeline.com/data/price/x-api
 *
 * Costs reflect the actual X API charges per endpoint category:
 *   Posts: Read          $0.005/resource
 *   User: Read           $0.010/resource
 *   Following/Followers  $0.010/resource
 *   Content: Create      $0.010/request
 *   User Interaction     $0.015/request  (like, follow, repost)
 *   DM Interaction       $0.015/request
 *   Interaction: Delete  $0.010/request
 *   Bookmark             $0.005/request
 *   List: Create         $0.010/request
 *   List: Manage         $0.005/request
 *   Media Metadata       $0.005/request
 *
 * Where a tool makes multiple API calls (e.g. followUser = user lookup +
 * follow), the cost is the sum of all underlying operations.
 */
export const X_API_PRICING = {
  // Read operations
  getTweet: 0.005, // Posts: Read ($0.005)
  searchTweets: 0.005, // Posts: Read/search ($0.005)
  getHomeTimeline: 0.005, // Posts: Read ($0.005)
  getUserProfile: 0.01, // User: Read ($0.010)
  getMyProfile: 0.01, // User: Read ($0.010)
  getFollowers: 0.01, // Following/Followers: Read ($0.010)
  getFollowing: 0.01, // Following/Followers: Read ($0.010)

  // Write operations
  postTweet: 0.01, // Content: Create ($0.010)
  deleteTweet: 0.01, // Interaction: Delete ($0.010)
  likeTweet: 0.015, // User Interaction: Create ($0.015)
  unlikeTweet: 0.01, // Interaction: Delete ($0.010)
  retweet: 0.015, // User Interaction: Create ($0.015)
  unretweet: 0.01, // Interaction: Delete ($0.010)
  bookmarkTweet: 0.005, // Bookmark ($0.005)
  removeBookmark: 0.005, // Bookmark ($0.005)
  followUser: 0.025, // User: Read + User Interaction ($0.010 + $0.015)
  unfollowUser: 0.02, // User: Read + Interaction: Delete ($0.010 + $0.010)
  sendDirectMessage: 0.025, // User: Read + DM Interaction ($0.010 + $0.015)

  // Media & lists
  uploadMedia: 0.005, // Media Metadata ($0.005)
  createList: 0.01, // List: Create ($0.010)
  addToList: 0.015, // User: Read + List: Manage ($0.010 + $0.005)
} as const;

export type XApiPricingKey = keyof typeof X_API_PRICING;

/**
 * Twilio per-tool pricing in USD.
 *
 * Based on Twilio's current pay-as-you-go rates (US).
 * Source: https://www.twilio.com/en-us/sms/pricing/us
 *         https://www.twilio.com/en-us/voice/pricing/us
 *         https://www.twilio.com/en-us/whatsapp/pricing
 *
 * Rates:
 *   SMS outbound:      $0.0083/message
 *   MMS outbound:      $0.0220/message
 *   Voice outbound:    $0.0140/min (billed per call, assume ~1 min min)
 *   WhatsApp:          $0.0050/message (Twilio fee) + Meta template fees
 *   Status/history:    Free (Twilio API reads)
 */
export const TWILIO_PRICING = {
  // Messaging
  sendSms: 0.0083, // SMS outbound ($0.0083/msg)
  sendMms: 0.022, // MMS outbound ($0.0220/msg)
  sendImage: 0.022, // MMS image ($0.0220/msg, same as MMS)

  // Voice
  makeCall: 0.014, // Voice outbound ($0.014/min, 1 min minimum)
  playAudioCall: 0.014, // Voice outbound ($0.014/min, 1 min minimum)

  // WhatsApp
  sendWhatsApp: 0.005, // WhatsApp ($0.005 Twilio fee + Meta fees)

  // Read-only / status (free — no Twilio charge for reads)
  checkMessageStatus: 0,
  checkCallStatus: 0,
  getMessageHistory: 0,
  checkTwilioConfig: 0,
} as const;

export type TwilioPricingKey = keyof typeof TWILIO_PRICING;

/**
 * Image Generation per-tool pricing in USD.
 *
 * Based on Black Forest Labs Flux Pro 1.1 API pricing.
 * Source: https://bfl.ai/pricing/api
 *
 * Rate: $0.04 per image (Flux Pro 1.1 standard)
 */
export const IMAGE_GEN_PRICING = {
  generateImage: 0.04, // BFL Flux Pro 1.1 ($0.04/image)
} as const;

export type ImageGenPricingKey = keyof typeof IMAGE_GEN_PRICING;

/**
 * Knowledge Base (RAG) per-tool pricing in USD.
 *
 * Based on OpenAI text-embedding-3-large pricing.
 * Source: https://platform.openai.com/docs/models/text-embedding-3-large
 *
 * Rate: $0.00013 per 1K tokens (~$0.0001 per typical embedding)
 * addResource chunks text and creates multiple embeddings, so slightly higher.
 * getInformation creates one embedding for the query.
 * removeResource is a DB-only operation (free).
 */
export const KNOWLEDGE_PRICING = {
  addResource: 0.0005, // ~5 chunks × $0.0001/embedding avg
  getInformation: 0.0001, // 1 embedding query ($0.0001)
  removeResource: 0, // DB delete only (free)
} as const;

export type KnowledgePricingKey = keyof typeof KNOWLEDGE_PRICING;

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
