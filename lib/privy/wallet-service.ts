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
import {
  getCurrentNetwork as getNetworkFromConfig,
  type SolNetwork,
} from "@/lib/x402/config";
import { validatePrivySignResponse } from "@/lib/x402/validation";

/**
 * Transaction fee buffer in lamports (0.001 SOL = 1,000,000 lamports).
 * This is added to required amounts to ensure transactions don't fail due to fees.
 */
export const TRANSACTION_FEE_BUFFER_LAMPORTS = BigInt(1_000_000);

/**
 * Wallet lock mechanism to prevent race conditions.
 * Ensures only one payment per wallet can be processed at a time.
 */
const walletLocks = new Map<string, Promise<void>>();

/**
 * Acquire a lock for a wallet address.
 * Returns a release function that must be called when done.
 */
export async function acquireWalletLock(
  walletAddress: string,
): Promise<() => void> {
  // Wait for any existing lock to be released
  while (walletLocks.has(walletAddress)) {
    await walletLocks.get(walletAddress);
  }

  // Create a new lock
  let releaseLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });
  walletLocks.set(walletAddress, lockPromise);

  // Return the release function
  return () => {
    walletLocks.delete(walletAddress);
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

/** @deprecated Use SolNetwork from @/lib/x402/config instead */
export type SolanaNetwork = SolNetwork;

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
 * Get the current network.
 * Delegates to the canonical implementation in @/lib/x402/config.
 */
export function getCurrentNetwork(): SolNetwork {
  return getNetworkFromConfig();
}

/**
 * Get CAIP-2 chain ID for the current network
 */
export function getCAIP2ChainId(network: SolanaNetwork): string {
  return network === "solana"
    ? "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" // Mainnet
    : "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1"; // Devnet
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
export async function signSolTransferTransaction(
  walletId: string,
  walletAddress: string,
  recipientAddress: string,
  lamports: bigint,
): Promise<{ signedTransaction: string; success: boolean; error?: string }> {
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

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    // Serialize unsigned transaction to base64
    const unsignedTx = transaction
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    // Sign transaction via Privy (but don't broadcast yet)
    const authContext = getAuthorizationContext();
    const rawResult = await privy.wallets().solana().signTransaction(walletId, {
      transaction: unsignedTx,
      authorization_context: authContext,
    });

    // Validate the response structure
    const validation = validatePrivySignResponse(rawResult);
    if (!validation.success) {
      return {
        signedTransaction: "",
        success: false,
        error: validation.error,
      };
    }

    return {
      signedTransaction: validation.data.signed_transaction,
      success: true,
    };
  } catch (error) {
    return {
      signedTransaction: "",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

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
