/**
 * Privy Wallet Service
 *
 * Server-side wallet operations for x402 payments.
 * Uses Privy's "Additional Signer" pattern to allow the server to
 * sign transactions from user-owned wallets without user interaction.
 *
 * ARCHITECTURE:
 * 1. Signer is added CLIENT-SIDE via useSigners().addSigners() in UserSync.tsx
 * 2. Once added, this service can sign transactions SERVER-SIDE
 * 3. Settlement goes through the standard x402 facilitator
 *
 * This keeps the protocol spec-compliant and reusable for external users.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import { getPrivyClient } from "@/lib/auth/verifyRequest";
import { validatePrivySignResponse } from "@/lib/x402/validation";
import { isRedisConfigured, getRedis } from "@/lib/redis";

/**
 * Transaction fee buffer in lamports (0.001 SOL = 1,000,000 lamports).
 * This is added to required amounts to ensure transactions don't fail due to fees.
 */
export const TRANSACTION_FEE_BUFFER_LAMPORTS = BigInt(1_000_000);

/**
 * Distributed wallet lock using Redis SET NX EX.
 *
 * In serverless environments each request can hit a different instance,
 * making in-memory locks useless. This uses Redis for a distributed
 * mutex with automatic TTL expiration as a safety net.
 *
 * Falls back to in-memory promise-chaining when Redis is unavailable
 * (e.g. local dev without Redis).
 */

const WALLET_LOCK_TTL_SECONDS = 30;
const WALLET_LOCK_RETRY_DELAY_MS = 100;
const WALLET_LOCK_MAX_RETRIES = 50; // 50 * 100ms = 5s max wait

// In-memory fallback for when Redis is unavailable
const memoryWalletLocks = new Map<string, Promise<void>>();

/**
 * Acquire a distributed lock for a wallet address via Redis.
 * Returns a release function that must be called when done.
 *
 * Uses Redis SET NX EX for atomic acquire with TTL safety net.
 * Falls back to in-memory promise-chaining if Redis is unavailable.
 */
export async function acquireWalletLock(
  walletAddress: string,
): Promise<() => void> {
  // Use distributed Redis lock when available
  if (isRedisConfigured()) {
    const redis = getRedis();
    const lockKey = `wallet-lock:${walletAddress}`;
    const lockValue = crypto.randomUUID();

    for (let i = 0; i < WALLET_LOCK_MAX_RETRIES; i++) {
      try {
        const acquired = await redis.set(lockKey, lockValue, {
          nx: true,
          ex: WALLET_LOCK_TTL_SECONDS,
        });
        if (acquired) {
          // Return release function that only deletes if we still hold the lock
          return async () => {
            try {
              const current = await redis.get(lockKey);
              if (current === lockValue) {
                await redis.del(lockKey);
              }
            } catch {
              // Best-effort release; TTL will clean up
            }
          };
        }
      } catch (error) {
        // Redis error — fall through to in-memory
        console.warn(
          "[WalletLock] Redis lock failed, using in-memory fallback:",
          error,
        );
        break;
      }
      await new Promise((r) => setTimeout(r, WALLET_LOCK_RETRY_DELAY_MS));
    }
  }

  // In-memory fallback (for local dev or Redis failure)
  let releaseLock: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  const prev = memoryWalletLocks.get(walletAddress) ?? Promise.resolve();
  memoryWalletLocks.set(walletAddress, gate);
  await prev;

  return () => {
    if (memoryWalletLocks.get(walletAddress) === gate) {
      memoryWalletLocks.delete(walletAddress);
    }
    releaseLock!();
  };
}

/**
 * Execute a function with wallet lock protection.
 * Prevents concurrent operations on the same wallet.
 */
export async function withWalletLock<T>(
  walletAddress: string,
  fn: () => Promise<T>,
): Promise<T> {
  const release = await acquireWalletLock(walletAddress);
  try {
    return await fn();
  } finally {
    release();
  }
}

/**
 * Check if server signer is configured
 */
export function isServerSignerConfigured(): boolean {
  return !!(
    process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY &&
    process.env.PRIVY_SIGNER_KEY_QUORUM_ID
  );
}

/**
 * Get the Privy client for wallet operations.
 * Uses the shared singleton from verifyRequest.ts to avoid duplicate clients.
 */
export function getPrivyWalletClient() {
  return getPrivyClient();
}

/**
 * Get the authorization context for server-side wallet operations.
 * This must be passed to each wallet operation that requires authorization.
 */
export function getAuthorizationContext() {
  const privateKey = process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      "PRIVY_AUTHORIZATION_PRIVATE_KEY not configured - required for server wallet operations",
    );
  }
  return {
    authorization_private_keys: [privateKey],
  };
}

/**
 * Get the balance of a wallet in lamports
 */
export async function getWalletBalance(walletAddress: string): Promise<bigint> {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const pubkey = new PublicKey(walletAddress);
  const balance = await connection.getBalance(pubkey);
  return BigInt(balance);
}

/**
 * Build and sign a SOL transfer transaction using Privy.
 * Returns the signed transaction in base64 format for use with x402 facilitator.
 *
 * This keeps the x402 flow intact - Privy signs, facilitator settles.
 *
 * @param walletId - The Privy wallet ID
 * @param walletAddress - The sender's Solana address
 * @param recipientAddress - The recipient's Solana address
 * @param lamports - Amount to send in lamports
 * @returns Signed transaction in base64 format
 */
/**
 * Send SOL from a Privy wallet.
 *
 * This function:
 * 1. Builds the transaction with a fresh blockhash from our RPC
 * 2. Signs via Privy's server-side API
 * 3. Submits to OUR RPC (ensures blockhash consistency)
 *
 * This avoids the "blockhash not found" error that occurs when
 * Privy's internal RPC has different blockhashes than ours.
 */
export async function sendSolFromWallet(
  walletId: string,
  walletAddress: string,
  recipientAddress: string,
  lamports: bigint,
): Promise<{ signature: string; success: boolean; error?: string }> {
  try {
    const privy = getPrivyWalletClient();
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");

    // Build the transfer transaction
    const fromPubkey = new PublicKey(walletAddress);
    const toPubkey = new PublicKey(recipientAddress);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
      }),
    );

    // Get recent blockhash from OUR RPC
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    // Serialize unsigned transaction to base64
    const unsignedTx = transaction
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    // Sign via Privy (just sign, don't broadcast)
    const authContext = getAuthorizationContext();
    const rawResult = await privy.wallets().solana().signTransaction(walletId, {
      transaction: unsignedTx,
      authorization_context: authContext,
    });

    // Validate the response structure
    const validation = validatePrivySignResponse(rawResult);
    if (!validation.success) {
      return {
        signature: "",
        success: false,
        error: validation.error,
      };
    }

    // Decode the signed transaction
    const signedTxBuffer = Buffer.from(
      validation.data.signed_transaction,
      "base64",
    );

    // Submit to OUR RPC (ensures blockhash consistency)
    const signature = await connection.sendRawTransaction(signedTxBuffer, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    // Confirm the transaction
    await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      "confirmed",
    );

    return {
      signature,
      success: true,
    };
  } catch (error) {
    return {
      signature: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if a wallet has sufficient balance for a transaction
 *
 * @param walletAddress - The wallet address to check
 * @param requiredLamports - Amount needed in lamports (including buffer for fees)
 * @returns true if balance is sufficient
 */
export async function hasEnoughBalance(
  walletAddress: string,
  requiredLamports: bigint,
): Promise<boolean> {
  try {
    const balance = await getWalletBalance(walletAddress);
    return balance >= requiredLamports + TRANSACTION_FEE_BUFFER_LAMPORTS;
  } catch {
    return false;
  }
}

/**
 * Format lamports to SOL string for display
 */
export function lamportsToSol(lamports: bigint): string {
  const sol = Number(lamports) / LAMPORTS_PER_SOL;
  if (sol < 0.000001) return "<0.000001";
  if (sol < 0.001) return sol.toFixed(8); // Show full precision for tiny amounts
  if (sol < 1) return sol.toFixed(6); // 6 decimals for amounts under 1 SOL
  return sol.toFixed(4); // 4 decimals for larger amounts
}
