/**
 * Privy Wallet Service
 *
 * Server-side wallet operations supporting two wallet types:
 *
 * 1. SERVER-OWNED wallets (new, serverOwned=true):
 *    - Created server-side via privy.wallets().create()
 *    - Server signs as the wallet OWNER (full control: sign, export, etc.)
 *    - No client-side ceremony needed
 *
 * 2. LEGACY USER-OWNED wallets (migrated, serverOwned=false):
 *    - Created client-side, user is the owner
 *    - Server signs as an ADDITIONAL SIGNER (can sign, but can't export)
 *    - Signer was added via the old client-side addSigners() flow
 *
 * Both types use the same authorization_context for signing — Privy
 * doesn't distinguish between owner and signer for sign operations.
 * The only difference is that server-owned wallets support export/import.
 */

import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import {
  createComputeBudgetInstructions,
  COMPUTE_UNITS,
} from "@/lib/solana/fees";
import { getPrivyClient } from "@/lib/auth/verifyRequest";
import { validatePrivySignResponse } from "@/lib/x402/validation";
import { isRedisConfigured, getRedis } from "@/lib/redis";

/**
 * Transaction fee buffer in lamports (0.001 SOL = 1,000,000 lamports).
 * This is added to required amounts to ensure transactions don't fail due to fees.
 */
export const TRANSACTION_FEE_BUFFER_LAMPORTS = BigInt(1_000_000);

// ── Distributed Wallet Lock ──────────────────────────────────────────

const WALLET_LOCK_TTL_SECONDS = 30;
const WALLET_LOCK_RETRY_DELAY_MS = 100;
const WALLET_LOCK_MAX_RETRIES = 50; // 50 * 100ms = 5s max wait

/** In-memory lock TTL — auto-release if holder dies (e.g. serverless timeout) */
const MEMORY_LOCK_TTL_MS = 120_000; // 2 minutes
/** Max wait time to acquire the in-memory lock before giving up */
const MEMORY_LOCK_ACQUIRE_TIMEOUT_MS = 10_000; // 10 seconds

interface MemoryLockEntry {
  gate: Promise<void>;
  expiresAt: number;
}

const memoryWalletLocks = new Map<string, MemoryLockEntry>();

/**
 * Acquire a distributed lock for a wallet address via Redis.
 * Returns a release function that must be called when done.
 *
 * Uses Redis SET NX EX for atomic acquire with TTL safety net.
 * Falls back to in-memory promise-chaining with TTL if Redis is unavailable.
 */
export async function acquireWalletLock(
  walletAddress: string,
): Promise<() => void> {
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
  // Includes TTL to prevent deadlocks from timed-out serverless functions

  // Clean up expired locks first
  const existing = memoryWalletLocks.get(walletAddress);
  if (existing && existing.expiresAt < Date.now()) {
    console.warn(
      `[WalletLock] Clearing expired in-memory lock for ${walletAddress.slice(0, 8)}...`,
    );
    memoryWalletLocks.delete(walletAddress);
  }

  let releaseLock: () => void;
  const gate = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  const entry: MemoryLockEntry = {
    gate,
    expiresAt: Date.now() + MEMORY_LOCK_TTL_MS,
  };

  const prev = memoryWalletLocks.get(walletAddress);
  memoryWalletLocks.set(walletAddress, entry);

  // Wait for previous lock holder, but with a timeout to prevent infinite hangs
  if (prev) {
    const timeout = new Promise<void>((resolve) =>
      setTimeout(() => {
        console.warn(
          `[WalletLock] In-memory lock acquire timeout for ${walletAddress.slice(0, 8)}..., proceeding`,
        );
        resolve();
      }, MEMORY_LOCK_ACQUIRE_TIMEOUT_MS),
    );
    await Promise.race([prev.gate, timeout]);
  }

  return () => {
    if (memoryWalletLocks.get(walletAddress) === entry) {
      memoryWalletLocks.delete(walletAddress);
    }
    releaseLock!();
  };
}

/** Max time a wallet-locked operation can run before being aborted */
const WALLET_OP_TIMEOUT_MS = 240_000; // 4 minutes (below 5-minute serverless limit)

/**
 * Execute a function with wallet lock protection.
 * Prevents concurrent operations on the same wallet.
 * Includes a hard timeout to prevent indefinite hangs.
 */
export async function withWalletLock<T>(
  walletAddress: string,
  fn: () => Promise<T>,
): Promise<T> {
  const release = await acquireWalletLock(walletAddress);
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Wallet operation timed out after 4 minutes. The transactions may still be processing on-chain.",
              ),
            ),
          WALLET_OP_TIMEOUT_MS,
        ),
      ),
    ]);
    return result;
  } finally {
    release();
  }
}

// ── Server-Owned Wallet Helpers ──────────────────────────────────────

/**
 * Check if server wallet operations are configured.
 * Requires the authorization private key (server owns the wallets).
 */
export function isServerWalletConfigured(): boolean {
  return !!process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY;
}

/**
 * Get the authorization context for server-side wallet operations.
 * Since the server OWNS these wallets (not just a signer), the auth
 * key has full control: sign, send, export, update policies, etc.
 */
export function getAuthorizationContext() {
  const privateKey = process.env.PRIVY_AUTHORIZATION_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      "PRIVY_AUTHORIZATION_PRIVATE_KEY not configured — required for server wallet operations",
    );
  }
  return {
    authorization_private_keys: [privateKey],
  };
}

/**
 * Create a new server-owned Solana wallet via Privy.
 *
 * Created without an explicit user owner — the app controls the wallet
 * and signs transactions using the authorization private key. This means
 * the server can immediately sign without any client-side ceremony.
 *
 * @returns The created wallet's Privy ID and Solana address
 */
export async function createServerOwnedWallet(): Promise<{
  walletId: string;
  address: string;
}> {
  const privy = getPrivyClient();

  const wallet = await privy.wallets().create({
    chain_type: "solana",
  });

  return {
    walletId: wallet.id,
    address: wallet.address,
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
 * Send SOL from a server-owned Privy wallet.
 *
 * This function:
 * 1. Builds the transaction with a fresh blockhash from our RPC
 * 2. Signs via Privy's server-side API (as wallet owner)
 * 3. Submits to OUR RPC (ensures blockhash consistency)
 */
export async function sendSolFromWallet(
  walletId: string,
  walletAddress: string,
  recipientAddress: string,
  lamports: bigint,
): Promise<{ signature: string; success: boolean; error?: string }> {
  try {
    const privy = getPrivyClient();
    const connection = new Connection(SOLANA_RPC_URL, "confirmed");

    const fromPubkey = new PublicKey(walletAddress);
    const toPubkey = new PublicKey(recipientAddress);

    // Build instructions with dynamic priority fees
    const priorityIxs = await createComputeBudgetInstructions(
      COMPUTE_UNITS.SOL_TRANSFER,
      [walletAddress, recipientAddress],
    );

    const instructions = [
      ...priorityIxs,
      SystemProgram.transfer({ fromPubkey, toPubkey, lamports }),
    ];

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");

    const message = new TransactionMessage({
      payerKey: fromPubkey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const transaction = new VersionedTransaction(message);
    const unsignedTx = Buffer.from(transaction.serialize()).toString("base64");

    const authContext = getAuthorizationContext();
    const rawResult = await privy.wallets().solana().signTransaction(walletId, {
      transaction: unsignedTx,
      authorization_context: authContext,
    });

    const validation = validatePrivySignResponse(rawResult);
    if (!validation.success) {
      return {
        signature: "",
        success: false,
        error: validation.error,
      };
    }

    const signedTxBuffer = Buffer.from(
      validation.data.signed_transaction,
      "base64",
    );

    const signature = await connection.sendRawTransaction(signedTxBuffer, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

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
export { lamportsToSol } from "@/lib/utils/solana";
