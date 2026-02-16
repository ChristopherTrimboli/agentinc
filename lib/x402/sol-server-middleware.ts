/**
 * Hybrid SOL Payment Middleware
 *
 * Supports TWO payment flows:
 *
 * 1. EXTERNAL USERS (any wallet):
 *    - Send signed transaction in X-PAYMENT header
 *    - Standard x402 protocol flow with flat-rate pricing
 *    - Works with Phantom, Solflare, any Solana wallet
 *
 * 2. PRIVY USERS (usage-based):
 *    - Authenticated via Privy token
 *    - Server signs transaction automatically
 *    - Charges ACTUAL cost from AI Gateway after generation completes
 *    - No user interaction needed per request
 *
 * External users use flat-rate pricing (they pay upfront).
 * Privy users use usage-based pricing (charged after completion).
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verifyRequest";
import prisma from "@/lib/prisma";
import {
  sendSolFromWallet,
  hasEnoughBalance,
  isServerWalletConfigured,
  lamportsToSol,
  withWalletLock,
  getWalletBalance,
} from "@/lib/privy/wallet-service";
import { sanitizeTxSignature } from "@/lib/utils/formatting";
import {
  usdToLamports,
  getSolPrice,
  verifyPayment,
  settlePayment,
  extractPaymentFromHeaders,
  type SolPaymentPayload,
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
  addPaymentReceiptHeader as addReceiptHeader,
} from "./shared";
import { isRedisConfigured, getRedis } from "@/lib/redis";

// Re-export for backward compatibility
export { SOL_NETWORK, type SolNetwork, type PricingKey };

/**
 * Failed payment record for retry queue.
 * Serializable version uses string for lamports (bigint can't be JSON-serialized).
 */
interface FailedPayment {
  userId: string;
  walletId: string;
  walletAddress: string;
  lamports: string; // stored as string for JSON serialization
  usdCost: number;
  description: string;
  timestamp: string; // ISO string for serialization
  attempts: number;
  lastError: string;
}

// Redis keys
const FAILED_PAYMENTS_KEY = "x402:failed_payments";
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Load failed payments from Redis (or return empty array).
 */
async function loadFailedPayments(): Promise<FailedPayment[]> {
  if (!isRedisConfigured()) return [];
  try {
    const redis = getRedis();
    const data = await redis.get<FailedPayment[]>(FAILED_PAYMENTS_KEY);
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Save failed payments to Redis.
 * TTL of 7 days — after that, failed payments are considered abandoned.
 */
async function saveFailedPayments(queue: FailedPayment[]): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    const redis = getRedis();
    await redis.set(FAILED_PAYMENTS_KEY, queue, { ex: 7 * 24 * 3600 });
  } catch {
    // Non-critical
  }
}

/**
 * Retry a payment with exponential backoff
 */
async function retryPaymentWithBackoff(
  walletId: string,
  walletAddress: string,
  lamports: bigint,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
): Promise<{ success: boolean; signature?: string; error?: string }> {
  let lastError = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Exponential backoff: 1s, 2s, 4s
    if (attempt > 1) {
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const result = await sendSolFromWallet(
      walletId,
      walletAddress,
      SOL_TREASURY_ADDRESS,
      lamports,
    );

    if (result.success) {
      return { success: true, signature: result.signature };
    }

    lastError = result.error || "Unknown error";
  }

  return { success: false, error: lastError };
}

/**
 * Queue a failed payment for later retry.
 * Persisted in Redis so it survives restarts.
 */
/**
 * Queue a failed payment for later retry.
 * Uses Redis RPUSH for atomic append (no read-modify-write race condition).
 * Falls back to non-atomic load/save if RPUSH is unavailable.
 */
export async function queueFailedPayment(
  userId: string,
  walletId: string,
  walletAddress: string,
  lamports: bigint,
  usdCost: number,
  description: string,
  error: string,
): Promise<void> {
  const newEntry: FailedPayment = {
    userId,
    walletId,
    walletAddress,
    lamports: lamports.toString(),
    usdCost,
    description,
    timestamp: new Date().toISOString(),
    attempts: 0,
    lastError: error,
  };

  // Use atomic Redis list append to avoid read-modify-write race condition
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const listKey = `${FAILED_PAYMENTS_KEY}:list`;
      await redis.rpush(listKey, JSON.stringify(newEntry));
      // Set TTL on the list (refreshed on each append)
      await redis.expire(listKey, 7 * 24 * 3600);
      return;
    } catch {
      // Fall through to legacy approach
    }
  }

  // Legacy fallback (non-atomic, acceptable for local dev)
  const queue = await loadFailedPayments();

  const existingIndex = queue.findIndex(
    (p) => p.userId === userId && p.walletAddress === walletAddress,
  );

  if (existingIndex >= 0) {
    const existing = queue[existingIndex];
    existing.lamports = (BigInt(existing.lamports) + lamports).toString();
    existing.usdCost += usdCost;
    existing.lastError = error;
    existing.timestamp = new Date().toISOString();
  } else {
    queue.push(newEntry);
  }

  await saveFailedPayments(queue);
}

/**
 * Get failed payments for a user (for display/retry)
 */
export async function getFailedPayments(
  userId: string,
): Promise<FailedPayment[]> {
  const queue = await loadFailedPayments();
  return queue.filter((p) => p.userId === userId);
}

/**
 * Process the failed payment queue (call periodically or on-demand)
 */
export async function processFailedPaymentQueue(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  const queue = await loadFailedPayments();
  const remaining: FailedPayment[] = [];

  for (const payment of queue) {
    if (payment.attempts >= MAX_RETRY_ATTEMPTS) {
      // Too many attempts — drop from queue
      failed++;
      continue;
    }

    processed++;
    payment.attempts++;

    const result = await sendSolFromWallet(
      payment.walletId,
      payment.walletAddress,
      SOL_TREASURY_ADDRESS,
      BigInt(payment.lamports),
    );

    if (result.success) {
      succeeded++;
      // Don't add back to remaining
    } else {
      payment.lastError = result.error || "Unknown error";
      payment.timestamp = new Date().toISOString();
      remaining.push(payment);
    }
  }

  await saveFailedPayments(remaining);
  return { processed, succeeded, failed };
}

// Re-export treasury address for backward compatibility
export const SOL_TREASURY_ADDRESS = TREASURY_ADDRESS;

// Treasury wallet ID for Privy (if treasury is a Privy-managed wallet for auto-refunds)
// Imported from config via TREASURY_ADDRESS, wallet ID comes from env directly
const TREASURY_WALLET_ID = process.env.X402_TREASURY_WALLET_ID || "";

/**
 * Pending refund record for tracking refunds that need processing.
 * Serializable — lamports stored as string, timestamp as ISO string.
 */
interface PendingRefund {
  id: string;
  userId: string;
  walletAddress: string;
  lamports: string; // string for JSON serialization
  usdAmount: number;
  reason: string;
  originalTxSignature: string;
  timestamp: string; // ISO string
  status: "pending" | "completed" | "failed";
  refundTxSignature?: string;
  error?: string;
}

const PENDING_REFUNDS_KEY = "x402:pending_refunds";

async function loadPendingRefunds(): Promise<PendingRefund[]> {
  if (!isRedisConfigured()) return [];
  try {
    const redis = getRedis();
    const data = await redis.get<PendingRefund[]>(PENDING_REFUNDS_KEY);
    return data || [];
  } catch {
    return [];
  }
}

async function savePendingRefunds(refunds: PendingRefund[]): Promise<void> {
  if (!isRedisConfigured()) return;
  try {
    const redis = getRedis();
    await redis.set(PENDING_REFUNDS_KEY, refunds, { ex: 30 * 24 * 3600 }); // 30 day TTL
  } catch {
    // Non-critical
  }
}

/**
 * Check if auto-refunds from treasury are possible
 * (requires treasury to be a Privy-managed wallet)
 */
export function isAutoRefundEnabled(): boolean {
  return !!(
    TREASURY_WALLET_ID &&
    SOL_TREASURY_ADDRESS &&
    isServerWalletConfigured()
  );
}

/**
 * Issue a refund to a user's wallet.
 *
 * If treasury is Privy-managed (TREASURY_WALLET_ID set), attempts auto-refund.
 * Otherwise, queues for manual processing.
 *
 * @param userId - User ID for logging
 * @param walletAddress - User's wallet address to refund to
 * @param lamports - Amount to refund in lamports
 * @param usdAmount - Original USD amount (for logging)
 * @param reason - Reason for refund
 * @param originalTxSignature - Original payment transaction signature
 * @returns Refund result
 */
export async function issueRefund(
  userId: string,
  walletAddress: string,
  lamports: bigint,
  usdAmount: number,
  reason: string,
  originalTxSignature: string,
): Promise<{
  success: boolean;
  refundTxSignature?: string;
  error?: string;
  manualRequired?: boolean;
}> {
  const refundId = `refund_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Create refund record
  const refund: PendingRefund = {
    id: refundId,
    userId,
    walletAddress,
    lamports: lamports.toString(),
    usdAmount,
    reason,
    originalTxSignature,
    timestamp: new Date().toISOString(),
    status: "pending",
  };

  const refunds = await loadPendingRefunds();
  refunds.push(refund);

  // Attempt auto-refund if treasury is Privy-managed
  if (isAutoRefundEnabled()) {
    try {
      // Check treasury has enough balance
      const treasuryBalance = await getWalletBalance(SOL_TREASURY_ADDRESS);
      if (treasuryBalance < lamports) {
        refund.status = "failed";
        refund.error = "Treasury insufficient balance";
        await savePendingRefunds(refunds);
        return {
          success: false,
          error: "Treasury insufficient balance",
          manualRequired: true,
        };
      }

      // Send refund from treasury to user
      const refundResult = await sendSolFromWallet(
        TREASURY_WALLET_ID,
        SOL_TREASURY_ADDRESS,
        walletAddress,
        lamports,
      );

      if (refundResult.success) {
        refund.status = "completed";
        refund.refundTxSignature = refundResult.signature;
        await savePendingRefunds(refunds);
        return { success: true, refundTxSignature: refundResult.signature };
      } else {
        refund.status = "failed";
        refund.error = refundResult.error;
        await savePendingRefunds(refunds);
        return {
          success: false,
          error: refundResult.error,
          manualRequired: true,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      refund.status = "failed";
      refund.error = errorMsg;
      await savePendingRefunds(refunds);
      return { success: false, error: errorMsg, manualRequired: true };
    }
  }

  // Auto-refund not available - queue for manual processing
  await savePendingRefunds(refunds);
  return {
    success: false,
    error: "Auto-refund not configured - queued for manual processing",
    manualRequired: true,
  };
}

/**
 * Get pending refunds (for admin dashboard or cron job)
 */
export async function getPendingRefunds(): Promise<PendingRefund[]> {
  const refunds = await loadPendingRefunds();
  return refunds.filter((r) => r.status === "pending");
}

/**
 * Get all refunds for a user
 */
export async function getUserRefunds(userId: string): Promise<PendingRefund[]> {
  const refunds = await loadPendingRefunds();
  return refunds.filter((r) => r.userId === userId);
}

// Re-export pricing for backward compatibility (canonical source is config.ts)
export const SOL_PRICING = PRICING;
export const SOL_ROUTE_DESCRIPTIONS = ROUTE_DESCRIPTIONS;

// ── Wallet resolution for payments ───────────────────────────────────

/**
 * Wallet info needed for server-side payment operations.
 * Server-owned wallets can always sign — no signer check needed.
 */
interface PaymentWalletInfo {
  walletId: string;
  walletAddress: string;
}

/**
 * Resolve the user's active wallet for payment operations.
 * Returns the active wallet from the UserWallet table.
 */
async function getPaymentWalletInfo(
  userId: string,
): Promise<PaymentWalletInfo | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      activeWallet: {
        select: {
          privyWalletId: true,
          address: true,
        },
      },
    },
    cacheStrategy: { ttl: 5 },
  });

  if (!user?.activeWallet?.privyWalletId || !user.activeWallet.address) {
    return null;
  }

  return {
    walletId: user.activeWallet.privyWalletId,
    walletAddress: user.activeWallet.address,
  };
}

/**
 * Result of a usage-based billing charge
 */
export interface UsageBillingResult {
  success: boolean;
  transaction?: string;
  usdCost: number;
  solCost: string;
  lamports: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

/**
 * Charge a user for AI usage based on cost from AI SDK.
 * Call this from onFinish callback in streamText.
 *
 * The AI SDK returns cost information directly in providerMetadata when using AI Gateway.
 * This avoids needing to make a separate API call to fetch generation costs.
 *
 * @param userId - Privy user ID
 * @param usdCost - Cost in USD (from AI SDK providerMetadata or calculated from usage)
 * @param description - Human-readable description for logging
 * @param metadata - Optional metadata (model, tokens) for logging
 * @returns Billing result with transaction details
 */
export async function chargeForUsage(
  userId: string,
  usdCost: number,
  description: string = "AI Generation",
  metadata?: { model?: string; inputTokens?: number; outputTokens?: number },
): Promise<UsageBillingResult> {
  // Input validation
  if (!userId || typeof userId !== "string") {
    return {
      success: false,
      usdCost: 0,
      solCost: "0",
      lamports: "0",
      error: "Invalid userId",
    };
  }

  if (typeof usdCost !== "number" || !Number.isFinite(usdCost)) {
    return {
      success: false,
      usdCost: 0,
      solCost: "0",
      lamports: "0",
      error: "Invalid cost value",
    };
  }

  // Check if treasury is configured
  if (!SOL_TREASURY_ADDRESS) {
    return {
      success: false,
      usdCost: 0,
      solCost: "0",
      lamports: "0",
      error: "Treasury not configured",
    };
  }

  // Skip charging if cost is zero or negative
  if (usdCost <= 0) {
    return {
      success: true,
      usdCost: 0,
      solCost: "0",
      lamports: "0",
      ...metadata,
    };
  }

  try {
    // Resolve wallet via unified helper (supports both legacy and multi-wallet)
    const walletInfo = await getPaymentWalletInfo(userId);

    if (!walletInfo) {
      return {
        success: false,
        usdCost,
        solCost: "0",
        lamports: "0",
        ...metadata,
        error: "No wallet associated with account",
      };
    }

    const { walletAddress, walletId } = walletInfo;

    // Use wallet lock to prevent race conditions between balance check and payment.
    // usdToLamports() is called INSIDE the lock so the SOL price can't change
    // between conversion and the actual balance check / payment.
    return withWalletLock(walletAddress, async () => {
      const lamports = await usdToLamports(usdCost);
      const solCost = lamportsToSol(lamports);

      // Check balance
      const hasBalance = await hasEnoughBalance(walletAddress, lamports);
      if (!hasBalance) {
        return {
          success: false,
          usdCost,
          solCost,
          lamports: lamports.toString(),
          ...metadata,
          error: `Insufficient balance: need ${solCost} SOL`,
        };
      }

      // Execute the payment with retry
      const sendResult = await retryPaymentWithBackoff(
        walletId,
        walletAddress,
        lamports,
        MAX_RETRY_ATTEMPTS,
      );

      if (!sendResult.success) {
        // All retries failed - queue for later
        await queueFailedPayment(
          userId,
          walletId,
          walletAddress,
          lamports,
          usdCost,
          description,
          sendResult.error || "Unknown error",
        );
      }

      return {
        success: sendResult.success,
        transaction: sendResult.signature,
        usdCost,
        solCost,
        lamports: lamports.toString(),
        ...metadata,
        error: sendResult.error,
      };
    });
  } catch (error) {
    return {
      success: false,
      usdCost,
      solCost: "0",
      lamports: "0",
      ...metadata,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Payment receipt added to successful responses
 * Follows x402 response format for compatibility
 */
interface PaymentReceipt {
  success: boolean;
  transaction?: string;
  network: SolNetwork;
  payer?: string;
  amount: {
    lamports: string;
    sol: string;
    usd: string;
  };
  error?: string;
  /** Indicates which payment flow was used */
  flow: "external" | "privy-server";
}

/**
 * Create insufficient balance error response
 */
function createInsufficientBalanceResponse(
  requiredLamports: bigint,
  walletAddress: string,
  usdPrice: number,
): NextResponse {
  return NextResponse.json(
    {
      error: "Insufficient balance",
      code: "INSUFFICIENT_BALANCE",
      details: {
        required: {
          lamports: requiredLamports.toString(),
          sol: lamportsToSol(requiredLamports),
          usd: usdPrice.toFixed(4),
        },
        wallet: walletAddress,
        message: `Please deposit at least ${lamportsToSol(requiredLamports)} SOL to your wallet`,
      },
    },
    { status: 402 },
  );
}

// buildPaymentRequirements and addPaymentReceiptHeader are imported from ./shared

/**
 * Handle external x402 payment flow (any wallet)
 *
 * @param precomputedLamports - Pre-computed lamports to avoid TOCTOU price drift
 */
async function handleExternalPayment(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response | NextResponse>,
  paymentPayload: SolPaymentPayload,
  usdPrice: number,
  description: string,
  precomputedLamports?: bigint,
): Promise<Response> {
  const resourceUrl = req.url;
  const lamports = precomputedLamports ?? (await usdToLamports(usdPrice));

  // Build payment requirements for verification
  const paymentRequirements = buildPaymentRequirements(
    lamports,
    resourceUrl,
    description,
  );

  // Verify the external payment
  const verifyResult = await verifyPayment(paymentPayload, paymentRequirements);

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

  // Only settle if response is successful
  if (response.status < 400) {
    const settleResult = await settlePayment(
      paymentPayload,
      paymentRequirements,
    );

    const receipt: PaymentReceipt = {
      success: settleResult.success,
      transaction: settleResult.transaction || undefined,
      network: SOL_NETWORK,
      payer: verifyResult.payer,
      amount: {
        lamports: lamports.toString(),
        sol: lamportsToSol(lamports),
        usd: usdPrice.toFixed(4),
      },
      error: settleResult.errorReason,
      flow: "external",
    };

    return addReceiptHeader(response, receipt);
  }

  return response;
}

/**
 * Handle Privy server-side payment flow (automatic)
 * Uses wallet lock to prevent race conditions between balance check and payment.
 */
async function handlePrivyPayment(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response | NextResponse>,
  userId: string,
  usdPrice: number,
): Promise<Response> {
  // Resolve wallet via unified helper (supports both legacy and multi-wallet)
  const walletInfo = await getPaymentWalletInfo(userId);

  if (!walletInfo) {
    return NextResponse.json(
      {
        error: "Wallet not found",
        code: "NO_WALLET",
        details: {
          message:
            "No wallet associated with your account. Please log out and log back in.",
        },
      },
      { status: 403 },
    );
  }

  const { walletAddress, walletId } = walletInfo;

  // Use wallet lock to prevent race conditions.
  // usdToLamports() is called INSIDE the lock so the SOL price can't drift
  // between conversion and the actual balance check / payment.
  return withWalletLock(walletAddress, async () => {
    const lamports = await usdToLamports(usdPrice);

    // Check balance before payment
    const hasBalance = await hasEnoughBalance(walletAddress, lamports);
    if (!hasBalance) {
      return createInsufficientBalanceResponse(
        lamports,
        walletAddress,
        usdPrice,
      );
    }

    // PAY FIRST - Collect payment before delivering service
    // This prevents "free service" if handler succeeds but payment fails
    const sendResult = await sendSolFromWallet(
      walletId,
      walletAddress,
      SOL_TREASURY_ADDRESS,
      lamports,
    );

    if (!sendResult.success) {
      // Payment failed - don't execute handler
      return NextResponse.json(
        {
          error: "Payment failed",
          code: "PAYMENT_FAILED",
          details: {
            message: sendResult.error || "Failed to process payment",
          },
        },
        { status: 402 },
      );
    }

    // Payment succeeded - now execute the handler
    let response: Response;
    let handlerError: Error | null = null;

    try {
      response = await handler(req);
    } catch (error) {
      handlerError = error instanceof Error ? error : new Error(String(error));
      // Create error response
      response = NextResponse.json(
        {
          error: "Service error",
          code: "HANDLER_ERROR",
          details: { message: "An error occurred processing your request" },
        },
        { status: 500 },
      );
    }

    // Build receipt
    const receipt: PaymentReceipt = {
      success: true,
      transaction: sendResult.signature || undefined,
      network: SOL_NETWORK,
      payer: walletAddress,
      amount: {
        lamports: lamports.toString(),
        sol: lamportsToSol(lamports),
        usd: usdPrice.toFixed(4),
      },
      flow: "privy-server",
    };

    // If handler failed after payment, issue a refund
    if (response.status >= 400 || handlerError) {
      const errorReason = handlerError
        ? `Handler threw error: ${handlerError.message}`
        : `Handler returned error status: ${response.status}`;

      // Issue refund
      const refundResult = await issueRefund(
        userId,
        walletAddress,
        lamports,
        usdPrice,
        errorReason,
        sendResult.signature || "",
      );

      // Update receipt with refund info
      if (refundResult.success) {
        receipt.error = `Service failed - refund issued: ${sanitizeTxSignature(refundResult.refundTxSignature || "")}`;
        // Add refund info to response headers
        const refundInfo = {
          refunded: true,
          refundTransaction: refundResult.refundTxSignature,
          amount: receipt.amount,
        };
        const newResponse = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: new Headers(response.headers),
        });
        newResponse.headers.set(
          "X-PAYMENT-REFUND",
          Buffer.from(JSON.stringify(refundInfo)).toString("base64"),
        );
        return addReceiptHeader(newResponse, receipt);
      } else if (refundResult.manualRequired) {
        receipt.error = `Service failed - refund pending manual processing. Original tx: ${sanitizeTxSignature(sendResult.signature || "")}`;
      } else {
        receipt.error = `Service failed - refund attempt failed: ${refundResult.error}`;
      }
    }

    return addReceiptHeader(response, receipt);
  });
}

/**
 * Hybrid x402 payment middleware.
 *
 * Supports BOTH payment flows:
 *
 * 1. External wallets: Any Solana wallet can pay via X-PAYMENT header
 * 2. Privy users: Automatic server-side signing for authenticated users
 *
 * Priority order:
 * 1. Check for X-PAYMENT header → use external flow
 * 2. Check for Privy auth → use server-side flow
 * 3. No payment method → return 402 with requirements
 *
 * @param handler - The route handler function
 * @param priceKey - Key from SOL_PRICING config
 * @returns Wrapped handler with hybrid payment support
 */
export function withServerSolPayment<
  T extends (req: NextRequest) => Promise<Response | NextResponse>,
>(handler: T, priceKey: PricingKey): T {
  const wrappedHandler = async (req: NextRequest): Promise<Response> => {
    const usdPrice = SOL_PRICING[priceKey];
    const description = SOL_ROUTE_DESCRIPTIONS[priceKey];
    const resourceUrl = req.url;

    // Check if treasury is configured - FAIL CLOSED for security
    if (!SOL_TREASURY_ADDRESS) {
      return NextResponse.json(
        {
          error: "Payment system unavailable",
          code: "PAYMENT_SYSTEM_MISCONFIGURED",
          details: {
            message:
              "The payment system is not properly configured. Please contact support.",
          },
        },
        { status: 503 },
      );
    }

    // Compute lamports ONCE to avoid TOCTOU price drift between flows
    const lamports = await usdToLamports(usdPrice);

    // FLOW 1: Check for external x402 payment (X-PAYMENT header)
    const externalPayment = extractPaymentFromHeaders(req.headers);
    if (externalPayment) {
      return handleExternalPayment(
        req,
        handler,
        externalPayment,
        usdPrice,
        description,
        lamports,
      );
    }

    // FLOW 2: Check for Privy authentication (server-side payment)
    if (isServerWalletConfigured()) {
      const authResult = await verifyAuth(req);
      if (authResult) {
        return handlePrivyPayment(req, handler, authResult.userId, usdPrice);
      }
    }

    // FLOW 3: No payment method - return 402 with requirements (pass pre-computed lamports)
    return create402Response(usdPrice, description, resourceUrl, lamports);
  };

  return wrappedHandler as unknown as T;
}

/**
 * Check if server-side SOL payments are fully enabled
 */
export function isServerSolPaymentEnabled(): boolean {
  return !!(SOL_TREASURY_ADDRESS && isServerWalletConfigured());
}

/**
 * Check if usage-based billing is enabled (Treasury + Server Wallet).
 * AI Gateway costs come from providerMetadata in the AI SDK response,
 * so no separate API key is needed for billing.
 */
export function isUsageBasedBillingEnabled(): boolean {
  return !!(SOL_TREASURY_ADDRESS && isServerWalletConfigured());
}

/**
 * Get current pricing with SOL conversion
 */
export async function getServerPricingWithSol(): Promise<
  Record<PricingKey, { usd: number; lamports: string; sol: string }>
> {
  // Fetch SOL price once and compute all conversions locally
  const solPrice = await getSolPrice();
  const LAMPORTS = 1_000_000_000; // LAMPORTS_PER_SOL

  const result: Record<string, { usd: number; lamports: string; sol: string }> =
    {};

  for (const [key, usdPrice] of Object.entries(SOL_PRICING)) {
    const solAmount = usdPrice / solPrice;
    const lamports = BigInt(Math.ceil(solAmount * LAMPORTS));
    result[key] = {
      usd: usdPrice,
      lamports: lamports.toString(),
      sol: lamportsToSol(lamports),
    };
  }

  return result as Record<
    PricingKey,
    { usd: number; lamports: string; sol: string }
  >;
}

/**
 * Billing context passed to handlers for usage-based billing
 */
export interface BillingContext {
  /** User ID for billing */
  userId: string;
  /** User's wallet address */
  walletAddress: string;
  /**
   * Charge for AI usage after generation completes.
   * Call this from onFinish with the cost from providerMetadata.
   *
   * @param usdCost - Cost in USD (from AI SDK providerMetadata.cost or calculated)
   * @param description - Human-readable description for logging
   * @param metadata - Optional metadata (model, tokens) for logging
   */
  chargeUsage: (
    usdCost: number,
    description?: string,
    metadata?: { model?: string; inputTokens?: number; outputTokens?: number },
  ) => Promise<UsageBillingResult>;
}

/**
 * Extended request with billing context
 */
export interface RequestWithBilling extends NextRequest {
  billingContext?: BillingContext;
}

/**
 * Usage-based payment middleware for streaming AI endpoints.
 *
 * This middleware:
 * 1. Validates Privy auth and wallet setup
 * 2. Passes billing context to the handler
 * 3. The handler calls chargeGeneration() in onFinish with the generation ID
 *
 * For external x402 users, falls back to flat-rate pre-payment.
 *
 * @param handler - The route handler function
 * @param priceKey - Key for fallback pricing (external users)
 * @returns Wrapped handler with usage-based billing support
 */
export function withUsageBasedPayment<
  T extends (req: RequestWithBilling) => Promise<Response | NextResponse>,
>(handler: T, priceKey: PricingKey): T {
  const wrappedHandler = async (req: NextRequest): Promise<Response> => {
    const description = SOL_ROUTE_DESCRIPTIONS[priceKey];
    const usdFallbackPrice = SOL_PRICING[priceKey];
    const resourceUrl = req.url;

    // Check if treasury is configured - FAIL CLOSED for security
    if (!SOL_TREASURY_ADDRESS) {
      return NextResponse.json(
        {
          error: "Payment system unavailable",
          code: "PAYMENT_SYSTEM_MISCONFIGURED",
          details: {
            message:
              "The payment system is not properly configured. Please contact support.",
          },
        },
        { status: 503 },
      );
    }

    // FLOW 1: Check for external x402 payment (X-PAYMENT header)
    // External users use flat-rate pre-payment
    const externalPayment = extractPaymentFromHeaders(req.headers);
    if (externalPayment) {
      return handleExternalPayment(
        req,
        handler as (req: NextRequest) => Promise<Response | NextResponse>,
        externalPayment,
        usdFallbackPrice,
        description,
      );
    }

    // FLOW 2: Check for Privy authentication (usage-based billing)
    if (isServerWalletConfigured()) {
      const authResult = await verifyAuth(req);
      if (authResult) {
        const walletInfo = await getPaymentWalletInfo(authResult.userId);

        if (!walletInfo) {
          return NextResponse.json(
            {
              error: "Wallet not found",
              code: "NO_WALLET",
              details: {
                message:
                  "No wallet associated with your account. Please log out and log back in.",
              },
            },
            { status: 403 },
          );
        }

        // Create billing context for the handler
        const billingContext: BillingContext = {
          userId: authResult.userId,
          walletAddress: walletInfo.walletAddress,
          chargeUsage: (
            usdCost: number,
            desc?: string,
            metadata?: {
              model?: string;
              inputTokens?: number;
              outputTokens?: number;
            },
          ) =>
            chargeForUsage(
              authResult.userId,
              usdCost,
              desc || description,
              metadata,
            ),
        };

        // Execute handler with billing context
        const reqWithBilling = req as RequestWithBilling;
        reqWithBilling.billingContext = billingContext;

        return handler(reqWithBilling);
      }
    }

    // FLOW 3: No payment method - return 402 with requirements
    return create402Response(usdFallbackPrice, description, resourceUrl);
  };

  return wrappedHandler as unknown as T;
}
