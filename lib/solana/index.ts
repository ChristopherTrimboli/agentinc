import bs58 from "bs58";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  JITO_ENDPOINTS,
  FALLBACK_RPC_URLS,
  getConnection,
} from "@/lib/constants/solana";
import { getPrivyClient } from "@/lib/auth/verifyRequest";
import {
  getAuthorizationContext,
  isServerWalletConfigured,
} from "@/lib/privy/wallet-service";
import { validatePrivySignResponse } from "@/lib/x402/validation";

// Re-export getConnection from constants
export { getConnection };

// Re-export priority fee utilities
export {
  estimatePriorityFee,
  createComputeBudgetInstructions,
  COMPUTE_UNITS,
} from "@/lib/solana/fees";

/**
 * Validate a transaction before signing.
 * Checks:
 * - Transaction is valid and can be deserialized
 * - Transaction size is within Solana limits (1232 bytes)
 * - Transaction has at least one instruction
 * - Transaction has a valid recent blockhash
 */
export function validateTransaction(transactionBase64: string): {
  valid: boolean;
  error?: string;
} {
  try {
    // Check base64 encoding is valid
    const txBuffer = Buffer.from(transactionBase64, "base64");

    // Check size (Solana max is 1232 bytes)
    if (txBuffer.length > 1232) {
      return {
        valid: false,
        error: "Transaction too large (max 1232 bytes)",
      };
    }

    if (txBuffer.length === 0) {
      return {
        valid: false,
        error: "Transaction is empty",
      };
    }

    // Try to deserialize the transaction to verify it's valid
    let tx: Transaction | VersionedTransaction;
    try {
      // Try versioned transaction first (more common)
      tx = VersionedTransaction.deserialize(txBuffer);
    } catch {
      // Fall back to legacy transaction
      try {
        tx = Transaction.from(txBuffer);
      } catch (deserializeError) {
        return {
          valid: false,
          error: "Invalid transaction format",
        };
      }
    }

    // Check for instructions
    const hasInstructions =
      "instructions" in tx
        ? tx.instructions.length > 0
        : tx.message.compiledInstructions.length > 0;

    if (!hasInstructions) {
      return {
        valid: false,
        error: "Transaction has no instructions",
      };
    }

    // Check for recent blockhash (basic check that it's set)
    let blockhash: string;
    if (tx instanceof Transaction) {
      blockhash = tx.recentBlockhash || "";
    } else {
      blockhash = tx.message.recentBlockhash;
    }

    if (!blockhash || blockhash === "11111111111111111111111111111111") {
      return {
        valid: false,
        error: "Transaction has invalid or missing blockhash",
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : "Transaction validation failed",
    };
  }
}

// Sign a transaction server-side using Privy embedded wallet.
// Passes authorization_context when server wallet is configured (server-owned wallets).
export async function signTransaction(
  walletId: string,
  transaction: string, // base64 encoded unsigned transaction
): Promise<string> {
  // Validate transaction before signing
  const validation = validateTransaction(transaction);
  if (!validation.valid) {
    throw new Error(`Transaction validation failed: ${validation.error}`);
  }

  const privy = getPrivyClient();

  const signParams: {
    transaction: string;
    authorization_context?: ReturnType<typeof getAuthorizationContext>;
  } = {
    transaction,
  };

  if (isServerWalletConfigured()) {
    signParams.authorization_context = getAuthorizationContext();
  }

  const rawResult = await privy
    .wallets()
    .solana()
    .signTransaction(walletId, signParams);

  const validated = validatePrivySignResponse(rawResult);
  if (!validated.success) {
    throw new Error(`[Solana] signTransaction failed: ${validated.error}`);
  }

  return validated.data.signed_transaction;
}

// Send via Jito for priority landing
async function sendViaJito(base58Tx: string): Promise<string | null> {
  for (const jitoEndpoint of JITO_ENDPOINTS) {
    try {
      const response = await fetch(jitoEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sendTransaction",
          params: [
            base58Tx,
            {
              encoding: "base58",
              skipPreflight: true,
              maxRetries: 0,
            },
          ],
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      if (data.error) continue;

      if (data.result) {
        return data.result;
      }
    } catch (error) {
      // Log and continue to next endpoint
      console.error(`[Jito] Failed to send via ${jitoEndpoint}:`, error);
    }
  }
  return null;
}

// Send via standard RPC
async function sendViaRpc(base58Tx: string): Promise<string | null> {
  for (const rpcUrl of FALLBACK_RPC_URLS) {
    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sendTransaction",
          params: [
            base58Tx,
            {
              encoding: "base58",
              skipPreflight: false,
              preflightCommitment: "confirmed",
              maxRetries: 5,
            },
          ],
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();

      if (data.error) {
        const msg: string = data.error.message ?? JSON.stringify(data.error);
        console.error(`[RPC] sendTransaction error from ${rpcUrl}:`, msg);
        // Re-throw fatal errors immediately
        if (
          msg.includes("insufficient") ||
          msg.includes("Blockhash not found")
        ) {
          throw new Error(msg);
        }
        continue;
      }

      if (data.result) {
        return data.result;
      }
    } catch (err) {
      // Re-throw insufficient funds errors
      if (err instanceof Error && err.message.includes("insufficient")) {
        throw err;
      }
      // Log and continue to next endpoint
      console.error(`[RPC] Failed to send via ${rpcUrl}:`, err);
    }
  }
  return null;
}

/**
 * Simulate a signed base64 transaction and return the full simulation result.
 * Useful for diagnosing why a transaction isn't landing.
 */
export async function simulateSignedTransaction(
  signedTransactionBase64: string,
): Promise<{
  err: unknown;
  logs: string[] | null;
  unitsConsumed?: number;
}> {
  const connection = getConnection();
  const txBytes = Buffer.from(signedTransactionBase64, "base64");
  const tx = VersionedTransaction.deserialize(txBytes);
  const result = await connection.simulateTransaction(tx, {
    commitment: "confirmed",
    sigVerify: false,
  });
  return {
    err: result.value.err,
    logs: result.value.logs,
    unitsConsumed: result.value.unitsConsumed ?? undefined,
  };
}

// Send a signed transaction (base64) with Jito priority + RPC fallback
export async function sendSignedTransaction(
  signedTransaction: string, // base64 encoded signed transaction
  options: { useJito?: boolean } = { useJito: true },
): Promise<{ signature: string; method: "jito" | "rpc" }> {
  const txBytes = Buffer.from(signedTransaction, "base64");
  const base58Tx = bs58.encode(txBytes);

  // Try Jito first
  if (options.useJito) {
    const signature = await sendViaJito(base58Tx);
    if (signature) {
      return { signature, method: "jito" };
    }
  }

  // Fallback to RPC
  const signature = await sendViaRpc(base58Tx);
  if (signature) {
    return { signature, method: "rpc" };
  }

  throw new Error("Failed to send transaction via all endpoints");
}

// Full server-side flow: sign + send with Jito priority
export async function serverSignAndSend(
  walletId: string,
  transaction: string, // base64 encoded unsigned transaction
  options: { useJito?: boolean } = { useJito: true },
): Promise<{ signature: string; method: "jito" | "rpc" | "privy" }> {
  if (!walletId) {
    throw new Error("Wallet ID is required for server-side signing");
  }

  // Sign the transaction server-side
  const signedTransaction = await signTransaction(walletId, transaction);

  // Send with Jito priority
  const result = await sendSignedTransaction(signedTransaction, options);

  return result;
}

/**
 * Wait for a submitted transaction signature to reach "confirmed" commitment
 * by polling getSignatureStatuses. Does not require the original blockhash.
 */
export async function confirmTransactionBySignature(
  signature: string,
  timeoutMs = 90_000,
  pollIntervalMs = 1_500,
): Promise<void> {
  const connection = getConnection();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { value } = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: false,
    });
    const status = value[0];

    if (status) {
      if (status.err) {
        throw new Error(
          `Transaction ${signature} failed on-chain: ${JSON.stringify(status.err)}`,
        );
      }
      if (
        status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized"
      ) {
        return;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `Transaction ${signature} confirmation timed out after ${timeoutMs / 1000}s`,
  );
}

// Get recent blockhash
export async function getRecentBlockhash(): Promise<{
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const connection = getConnection();
  return connection.getLatestBlockhash("confirmed");
}
