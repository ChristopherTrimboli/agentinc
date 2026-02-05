/**
 * Native SOL Facilitator
 *
 * Custom x402 facilitator that accepts native SOL payments.
 * Converts USD prices to SOL using live price data.
 */

import {
  Connection,
  PublicKey,
  VersionedTransaction,
  TransactionConfirmationStrategy,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import { SolPaymentPayloadSchema } from "./validation";

// Cache SOL price for 5 seconds to keep prices fresh while avoiding rate limits
let cachedSolPrice: { price: number; timestamp: number } | null = null;
const PRICE_CACHE_TTL = 5_000; // 5 seconds

/**
 * Emergency fallback SOL price in USD.
 * Used when all price APIs fail and there's no cached price.
 * This is a conservative estimate - better to overcharge slightly than undercharge.
 * Updated periodically based on market conditions.
 */
const FALLBACK_SOL_PRICE_USD = 150;

/**
 * Maximum age for stale cache before using fallback (1 hour)
 */
const STALE_CACHE_MAX_AGE = 60 * 60 * 1000;

/**
 * Fetch current SOL price in USD.
 *
 * Priority order:
 * 1. Fresh cached price (< 5 seconds old)
 * 2. Jupiter Price API
 * 3. CoinGecko API
 * 4. Stale cached price (< 1 hour old)
 * 5. Emergency fallback price
 */
export async function getSolPrice(): Promise<number> {
  // Return cached price if still valid
  if (
    cachedSolPrice &&
    Date.now() - cachedSolPrice.timestamp < PRICE_CACHE_TTL
  ) {
    return cachedSolPrice.price;
  }

  try {
    // Use Jupiter Price API (Solana native, fast, free)
    const response = await fetch(
      "https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112",
      { signal: AbortSignal.timeout(5000) }, // 5 second timeout
    );
    const data = await response.json();
    const price =
      data.data?.["So11111111111111111111111111111111111111112"]?.price;

    if (price && typeof price === "number" && price > 0) {
      cachedSolPrice = { price, timestamp: Date.now() };
      return price;
    }

    // Fallback to CoinGecko
    const cgResponse = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { signal: AbortSignal.timeout(5000) }, // 5 second timeout
    );
    const cgData = await cgResponse.json();
    const cgPrice = cgData.solana?.usd;

    if (cgPrice && typeof cgPrice === "number" && cgPrice > 0) {
      cachedSolPrice = { price: cgPrice, timestamp: Date.now() };
      return cgPrice;
    }

    throw new Error("Could not fetch SOL price from any API");
  } catch {
    // If we have a cached price that's not too old, use it
    if (
      cachedSolPrice &&
      Date.now() - cachedSolPrice.timestamp < STALE_CACHE_MAX_AGE
    ) {
      return cachedSolPrice.price;
    }

    // Last resort: use emergency fallback
    return FALLBACK_SOL_PRICE_USD;
  }
}

/**
 * Convert USD amount to lamports
 */
export async function usdToLamports(usdAmount: number): Promise<bigint> {
  const solPrice = await getSolPrice();
  const solAmount = usdAmount / solPrice;
  return BigInt(Math.ceil(solAmount * LAMPORTS_PER_SOL));
}

/**
 * Convert lamports to USD
 */
export async function lamportsToUsd(lamports: bigint): Promise<number> {
  const solPrice = await getSolPrice();
  const solAmount = Number(lamports) / LAMPORTS_PER_SOL;
  return solAmount * solPrice;
}

/**
 * Payment requirements for native SOL
 */
export interface SolPaymentRequirements {
  scheme: "exact";
  network: "solana" | "solana-devnet";
  maxAmountRequired: string; // In lamports
  asset: "native"; // Native SOL indicator
  payTo: string; // Treasury wallet address
  resource: string;
  description: string;
  maxTimeoutSeconds: number;
  extra?: {
    usdAmount?: string; // Original USD amount for reference
    solPrice?: number; // SOL price at time of quote
  };
}

/**
 * Payment payload from client
 */
export interface SolPaymentPayload {
  x402Version: number;
  scheme: "exact";
  network: "solana" | "solana-devnet";
  payload: {
    transaction: string; // Base64-encoded signed transaction
  };
}

/**
 * Verification response
 */
export interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
}

/**
 * Settlement response
 */
export interface SettleResponse {
  success: boolean;
  errorReason?: string;
  transaction: string;
  network: string;
  payer: string;
}

/**
 * Get Solana connection
 */
function getConnection(network: "solana" | "solana-devnet"): Connection {
  const rpcUrl =
    network === "solana" ? SOLANA_RPC_URL : "https://api.devnet.solana.com";
  return new Connection(rpcUrl, "confirmed");
}

/**
 * Extract payment payload from request headers (x402 standard).
 * Checks both X-PAYMENT (v1) and PAYMENT-SIGNATURE (v2) headers.
 *
 * @param headers - Request headers
 * @returns Parsed payment payload or null if not found
 */
export function extractPaymentFromHeaders(
  headers: Headers,
): SolPaymentPayload | null {
  // Try X-PAYMENT header first (x402 v1 standard), then PAYMENT-SIGNATURE (v2)
  const rawHeader =
    headers.get("X-PAYMENT") || headers.get("PAYMENT-SIGNATURE");

  if (!rawHeader) return null;

  try {
    const decoded = Buffer.from(rawHeader, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);

    // Validate against Zod schema to ensure type safety
    const result = SolPaymentPayloadSchema.safeParse(parsed);
    if (!result.success) {
      console.warn(
        "[x402] Invalid payment payload:",
        result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
      return null;
    }

    return result.data;
  } catch {
    return null;
  }
}

/**
 * Verify a native SOL payment transaction.
 *
 * Validates:
 * 1. Transaction is properly signed
 * 2. Transaction simulation succeeds
 * 3. Transaction contains a SOL transfer to treasury
 * 4. Transfer amount meets or exceeds required amount
 */
export async function verifyPayment(
  paymentPayload: SolPaymentPayload,
  paymentRequirements: SolPaymentRequirements,
): Promise<VerifyResponse> {
  try {
    const { network, payload } = paymentPayload;
    const { maxAmountRequired, payTo } = paymentRequirements;

    // Validate network matches server expectation (prevents devnet payments on mainnet)
    if (network !== paymentRequirements.network) {
      return {
        isValid: false,
        invalidReason: `Network mismatch: expected ${paymentRequirements.network}, got ${network}`,
      };
    }

    // Decode transaction
    const txBuffer = Buffer.from(payload.transaction, "base64");
    const transaction = VersionedTransaction.deserialize(txBuffer);

    // Get connection for simulation
    const connection = getConnection(network);

    // Verify transaction has signatures (is signed by payer)
    if (!transaction.signatures || transaction.signatures.length === 0) {
      return { isValid: false, invalidReason: "Transaction not signed" };
    }

    // Get the payer (first signer)
    const message = transaction.message;
    const payerPubkey = message.staticAccountKeys[0];
    const payer = payerPubkey.toBase58();

    // Parse transaction to find SOL transfer to treasury
    const treasuryPubkey = new PublicKey(payTo);
    const requiredLamports = BigInt(maxAmountRequired);
    const accountKeys = message.staticAccountKeys;

    // Find treasury account index
    const treasuryIndex = accountKeys.findIndex((key) =>
      key.equals(treasuryPubkey),
    );

    if (treasuryIndex === -1) {
      return {
        isValid: false,
        invalidReason: "Treasury not found in transaction accounts",
        payer,
      };
    }

    // Verify the transaction contains a proper SOL transfer instruction
    // System Program transfer instruction: program ID at index, then accounts, then data
    const systemProgramId = new PublicKey("11111111111111111111111111111111");
    const systemProgramIndex = accountKeys.findIndex((key) =>
      key.equals(systemProgramId),
    );

    if (systemProgramIndex === -1) {
      return {
        isValid: false,
        invalidReason: "No System Program in transaction - not a SOL transfer",
        payer,
      };
    }

    // Parse compiled instructions to find transfer to treasury
    let foundValidTransfer = false;
    let transferAmount = BigInt(0);

    for (const instruction of message.compiledInstructions) {
      // Check if this instruction uses System Program
      if (instruction.programIdIndex !== systemProgramIndex) {
        continue;
      }

      // System Program transfer instruction format:
      // - instruction type (4 bytes): 2 = transfer
      // - lamports (8 bytes): amount to transfer
      const data = instruction.data;
      if (data.length < 12) continue;

      // Check instruction type (first 4 bytes, little-endian)
      const instructionType =
        data[0] | (data[1] << 8) | (data[2] << 16) | (data[3] << 24);
      if (instructionType !== 2) continue; // 2 = transfer

      // Get transfer amount (next 8 bytes, little-endian)
      // Use BigInt for all operations to avoid 32-bit overflow
      const amount =
        BigInt(data[4]) |
        (BigInt(data[5]) << 8n) |
        (BigInt(data[6]) << 16n) |
        (BigInt(data[7]) << 24n) |
        (BigInt(data[8]) << 32n) |
        (BigInt(data[9]) << 40n) |
        (BigInt(data[10]) << 48n) |
        (BigInt(data[11]) << 56n);

      // Check if destination is treasury (second account in transfer)
      // Transfer instruction accounts: [from, to]
      if (instruction.accountKeyIndexes.length < 2) continue;
      const toIndex = instruction.accountKeyIndexes[1];
      if (toIndex === treasuryIndex) {
        foundValidTransfer = true;
        transferAmount += amount;
      }
    }

    if (!foundValidTransfer) {
      return {
        isValid: false,
        invalidReason: "No SOL transfer to treasury found in transaction",
        payer,
      };
    }

    if (transferAmount < requiredLamports) {
      return {
        isValid: false,
        invalidReason: `Insufficient transfer amount: ${transferAmount} lamports, required ${requiredLamports}`,
        payer,
      };
    }

    // Simulate transaction to verify it would succeed on-chain
    const simulation = await connection.simulateTransaction(transaction, {
      sigVerify: true,
    });

    if (simulation.value.err) {
      return {
        isValid: false,
        invalidReason: `Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`,
        payer,
      };
    }

    return { isValid: true, payer };
  } catch (error) {
    return {
      isValid: false,
      invalidReason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Settle a native SOL payment by submitting the transaction
 */
export async function settlePayment(
  paymentPayload: SolPaymentPayload,
  paymentRequirements: SolPaymentRequirements,
): Promise<SettleResponse> {
  const { network, payload } = paymentPayload;
  const connection = getConnection(network);

  try {
    // Decode and submit transaction
    const txBuffer = Buffer.from(payload.transaction, "base64");
    const transaction = VersionedTransaction.deserialize(txBuffer);

    // Get payer
    const payerPubkey = transaction.message.staticAccountKeys[0];
    const payer = payerPubkey.toBase58();

    // Submit transaction
    const signature = await connection.sendRawTransaction(txBuffer, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    const confirmationStrategy: TransactionConfirmationStrategy = {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    };

    const confirmation = await connection.confirmTransaction(
      confirmationStrategy,
      "confirmed",
    );

    if (confirmation.value.err) {
      return {
        success: false,
        errorReason: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
        transaction: signature,
        network,
        payer,
      };
    }

    // Verify the payment actually went to treasury
    const tx = await connection.getTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return {
        success: false,
        errorReason: "Could not fetch confirmed transaction",
        transaction: signature,
        network,
        payer,
      };
    }

    // Check balance changes
    const treasuryPubkey = new PublicKey(paymentRequirements.payTo);
    const accountKeys = transaction.message.staticAccountKeys;
    const treasuryIndex = accountKeys.findIndex((key) =>
      key.equals(treasuryPubkey),
    );

    if (treasuryIndex !== -1 && tx.meta) {
      const preBalance = BigInt(tx.meta.preBalances[treasuryIndex]);
      const postBalance = BigInt(tx.meta.postBalances[treasuryIndex]);
      const received = postBalance - preBalance;
      const required = BigInt(paymentRequirements.maxAmountRequired);

      if (received < required) {
        return {
          success: false,
          errorReason: `Insufficient payment: received ${received} lamports, required ${required}`,
          transaction: signature,
          network,
          payer,
        };
      }
    }

    return {
      success: true,
      transaction: signature,
      network,
      payer,
    };
  } catch (error) {
    return {
      success: false,
      errorReason: error instanceof Error ? error.message : "Unknown error",
      transaction: "",
      network,
      payer: "",
    };
  }
}

/**
 * Get supported networks and schemes
 */
export function getSupported() {
  return {
    kinds: [
      {
        x402Version: 1,
        scheme: "exact",
        network: "solana",
        asset: "native",
      },
      {
        x402Version: 1,
        scheme: "exact",
        network: "solana-devnet",
        asset: "native",
      },
    ],
  };
}
