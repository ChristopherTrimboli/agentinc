/**
 * Wallet Write Tools
 *
 * State-changing tools for transferring SOL and SPL tokens from the user's
 * active Privy wallet. All tools use `requireApproval: true` so the user
 * must explicitly approve every transfer in the chat UI before execution.
 *
 * Security layers:
 * - AI SDK `needsApproval` — human-in-the-loop confirmation
 * - Distributed wallet locks — prevent concurrent operations
 * - Rate limiting — 5 transfers/min per user
 * - Balance validation — pre-check before attempting
 * - Audit logging — every operation recorded to WalletTransaction table
 */

import { tool } from "ai";
import { z } from "zod";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import {
  createComputeBudgetInstructions,
  COMPUTE_UNITS,
} from "@/lib/solana/fees";
import { getPrivyClient } from "@/lib/auth/verifyRequest";
import {
  getAuthorizationContext,
  withWalletLock,
  TRANSACTION_FEE_BUFFER_LAMPORTS,
} from "@/lib/privy/wallet-service";
import { validatePrivySignResponse } from "@/lib/x402/validation";
import { rateLimitByUser } from "@/lib/rateLimit";
import prisma from "@/lib/prisma";
import type {
  WalletToolContext,
  TransferResult,
  BatchTransferResult,
} from "./types";
import {
  MAX_BATCH_RECIPIENTS,
  MAX_TOTAL_BATCH_RECIPIENTS,
  WALLET_TRANSFER_RATE_LIMIT,
} from "./types";

// ── transferSol ──────────────────────────────────────────────────────

const transferSolSchema = z.object({
  recipient: z
    .string()
    .describe("The recipient's Solana wallet address (base58)"),
  amount: z
    .string()
    .describe(
      "Amount of SOL to send (e.g., '0.5' for half a SOL, '1.0' for one SOL)",
    ),
});

function createTransferSol(ctx: WalletToolContext) {
  return tool({
    description:
      "Transfer SOL from your wallet to another Solana address. Requires your approval before execution.",
    inputSchema: transferSolSchema,
    needsApproval: true,
    execute: async (input: z.infer<typeof transferSolSchema>) => {
      const { recipient, amount } = input;
      // Rate limit check
      const rateLimited = await rateLimitByUser(
        ctx.userId,
        "wallet-transfer",
        WALLET_TRANSFER_RATE_LIMIT,
      );
      if (rateLimited) {
        return {
          error:
            "Rate limited: too many transfers. Please wait a minute and try again.",
        };
      }

      try {
        // Validate recipient address
        let recipientPubkey: PublicKey;
        try {
          recipientPubkey = new PublicKey(recipient);
        } catch {
          return { error: `Invalid recipient address: ${recipient}` };
        }

        // Parse amount to lamports
        const solAmount = parseFloat(amount);
        if (isNaN(solAmount) || solAmount <= 0) {
          return {
            error: `Invalid amount: ${amount}. Must be a positive number.`,
          };
        }
        const lamports = BigInt(Math.round(solAmount * LAMPORTS_PER_SOL));

        // Execute with wallet lock to prevent concurrent operations
        const result = await withWalletLock(ctx.walletAddress, async () => {
          return await executeSolTransfer(
            ctx,
            recipientPubkey,
            lamports,
            solAmount,
          );
        });

        // Audit log
        await logWalletTransaction(ctx, {
          type: "sol_transfer",
          recipient,
          amount: lamports.toString(),
          amountUi: `${solAmount} SOL`,
          signature: result.signature || undefined,
          status: result.success ? "success" : "failed",
          errorMessage: result.error,
        });

        return result;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        await logWalletTransaction(ctx, {
          type: "sol_transfer",
          recipient,
          amount: "0",
          amountUi: `${amount} SOL`,
          status: "failed",
          errorMessage: errorMsg,
        });
        return { error: `Transfer failed: ${errorMsg}` };
      }
    },
  });
}

// ── transferToken ────────────────────────────────────────────────────

const transferTokenSchema = z.object({
  tokenMint: z.string().describe("The SPL token mint address (base58)"),
  recipient: z
    .string()
    .describe("The recipient's Solana wallet address (base58)"),
  amount: z
    .string()
    .describe(
      "Amount of tokens to send in human-readable form (e.g., '100' for 100 tokens)",
    ),
});

function createTransferToken(ctx: WalletToolContext) {
  return tool({
    description:
      "Transfer SPL tokens from your wallet to another Solana address. Requires your approval before execution.",
    inputSchema: transferTokenSchema,
    needsApproval: true,
    execute: async (input: z.infer<typeof transferTokenSchema>) => {
      const { tokenMint, recipient, amount } = input;
      // Rate limit check
      const rateLimited = await rateLimitByUser(
        ctx.userId,
        "wallet-transfer",
        WALLET_TRANSFER_RATE_LIMIT,
      );
      if (rateLimited) {
        return {
          error:
            "Rate limited: too many transfers. Please wait a minute and try again.",
        };
      }

      try {
        // Validate addresses
        let mintPubkey: PublicKey;
        let recipientPubkey: PublicKey;
        try {
          mintPubkey = new PublicKey(tokenMint);
          recipientPubkey = new PublicKey(recipient);
        } catch {
          return { error: "Invalid mint or recipient address." };
        }

        const tokenAmount = parseFloat(amount);
        if (isNaN(tokenAmount) || tokenAmount <= 0) {
          return {
            error: `Invalid amount: ${amount}. Must be a positive number.`,
          };
        }

        // Execute with wallet lock
        const result = await withWalletLock(ctx.walletAddress, async () => {
          return await executeTokenTransfer(
            ctx,
            mintPubkey,
            recipientPubkey,
            tokenAmount,
          );
        });

        // Audit log
        await logWalletTransaction(ctx, {
          type: "token_transfer",
          recipient,
          tokenMint,
          amount: result.rawAmount || "0",
          amountUi: `${tokenAmount} tokens`,
          signature: result.signature || undefined,
          status: result.success ? "success" : "failed",
          errorMessage: result.error,
        });

        return result;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        await logWalletTransaction(ctx, {
          type: "token_transfer",
          recipient,
          tokenMint,
          amount: "0",
          amountUi: `${amount} tokens`,
          status: "failed",
          errorMessage: errorMsg,
        });
        return { error: `Token transfer failed: ${errorMsg}` };
      }
    },
  });
}

// ── batchTransferTokens ──────────────────────────────────────────────

const batchTransferSchema = z.object({
  tokenMint: z.string().describe("The SPL token mint address (base58)"),
  recipients: z
    .array(z.string())
    .min(1)
    .max(MAX_TOTAL_BATCH_RECIPIENTS)
    .describe("Array of recipient Solana wallet addresses (max 100)"),
  amountPerRecipient: z
    .string()
    .describe(
      "Amount of tokens to send to each recipient in human-readable form (e.g., '10' for 10 tokens each)",
    ),
});

function createBatchTransferTokens(ctx: WalletToolContext) {
  return tool({
    description:
      "Airdrop/batch transfer SPL tokens to multiple recipients at once. Splits into multiple transactions if needed (max 20 per tx). Requires your approval before execution.",
    inputSchema: batchTransferSchema,
    needsApproval: true,
    execute: async (input: z.infer<typeof batchTransferSchema>) => {
      const { tokenMint, recipients, amountPerRecipient } = input;
      // Rate limit check
      const rateLimited = await rateLimitByUser(
        ctx.userId,
        "wallet-transfer",
        WALLET_TRANSFER_RATE_LIMIT,
      );
      if (rateLimited) {
        return {
          error:
            "Rate limited: too many transfers. Please wait a minute and try again.",
        };
      }

      try {
        // Validate mint
        let mintPubkey: PublicKey;
        try {
          mintPubkey = new PublicKey(tokenMint);
        } catch {
          return { error: `Invalid token mint address: ${tokenMint}` };
        }

        // Validate recipients
        const recipientPubkeys: PublicKey[] = [];
        for (const addr of recipients) {
          try {
            recipientPubkeys.push(new PublicKey(addr));
          } catch {
            return { error: `Invalid recipient address: ${addr}` };
          }
        }

        const amountPer = parseFloat(amountPerRecipient);
        if (isNaN(amountPer) || amountPer <= 0) {
          return {
            error: `Invalid amount: ${amountPerRecipient}. Must be a positive number.`,
          };
        }

        // Execute with wallet lock
        const result = await withWalletLock(ctx.walletAddress, async () => {
          return await executeBatchTransfer(
            ctx,
            mintPubkey,
            recipientPubkeys,
            amountPer,
          );
        });

        // Audit log
        await logWalletTransaction(ctx, {
          type: "batch_transfer",
          tokenMint,
          recipients: recipients.map((addr, i) => ({
            address: addr,
            amount: amountPerRecipient,
            success: i < result.successCount,
          })),
          amount: (
            BigInt(result.successCount) *
            BigInt(Math.round(amountPer * Math.pow(10, result.decimals || 6)))
          ).toString(),
          amountUi: `${amountPer} x ${recipients.length} = ${amountPer * recipients.length} tokens`,
          status: result.failureCount === 0 ? "success" : "failed",
          errorMessage:
            result.failureCount > 0
              ? `${result.failureCount}/${result.totalRecipients} transfers failed`
              : undefined,
        });

        return result;
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Unknown error";
        await logWalletTransaction(ctx, {
          type: "batch_transfer",
          tokenMint,
          amount: "0",
          amountUi: `${amountPerRecipient} x ${recipients.length} tokens`,
          status: "failed",
          errorMessage: errorMsg,
        });
        return { error: `Batch transfer failed: ${errorMsg}` };
      }
    },
  });
}

// ── Transaction Executors ────────────────────────────────────────────

async function executeSolTransfer(
  ctx: WalletToolContext,
  recipient: PublicKey,
  lamports: bigint,
  _solAmount: number,
): Promise<TransferResult & { rawAmount?: string }> {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const fromPubkey = new PublicKey(ctx.walletAddress);

  // Check balance
  const balance = await connection.getBalance(fromPubkey);
  const required = lamports + TRANSACTION_FEE_BUFFER_LAMPORTS;
  if (BigInt(balance) < required) {
    const currentSol = balance / LAMPORTS_PER_SOL;
    return {
      signature: "",
      success: false,
      error: `Insufficient balance. You have ${currentSol.toFixed(4)} SOL but need ~${(Number(required) / LAMPORTS_PER_SOL).toFixed(4)} SOL (including fees).`,
    };
  }

  // Build versioned transaction with priority fees
  const priorityIxs = await createComputeBudgetInstructions(
    COMPUTE_UNITS.SOL_TRANSFER,
    [ctx.walletAddress],
  );

  const instructions = [
    ...priorityIxs,
    SystemProgram.transfer({ fromPubkey, toPubkey: recipient, lamports }),
  ];

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const message = new TransactionMessage({
    payerKey: fromPubkey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);

  // Sign via Privy
  const unsignedTx = Buffer.from(transaction.serialize()).toString("base64");

  const privy = getPrivyClient();
  const authContext = getAuthorizationContext();
  const rawResult = await privy
    .wallets()
    .solana()
    .signTransaction(ctx.walletId, {
      transaction: unsignedTx,
      authorization_context: authContext,
    });

  const validation = validatePrivySignResponse(rawResult);
  if (!validation.success) {
    return { signature: "", success: false, error: validation.error };
  }

  // Submit
  const signedTxBuffer = Buffer.from(
    validation.data.signed_transaction,
    "base64",
  );
  const signature = await connection.sendRawTransaction(signedTxBuffer, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );

  return {
    signature,
    success: true,
    rawAmount: lamports.toString(),
  };
}

async function executeTokenTransfer(
  ctx: WalletToolContext,
  mint: PublicKey,
  recipient: PublicKey,
  uiAmount: number,
): Promise<TransferResult & { rawAmount?: string }> {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const fromPubkey = new PublicKey(ctx.walletAddress);

  // Detect token program
  const tokenProgram = await detectTokenProgram(connection, mint);

  // Get decimals
  const decimals = await getTokenDecimals(connection, mint);
  const rawAmount = BigInt(Math.round(uiAmount * Math.pow(10, decimals)));

  // Check token balance
  const senderAta = await getAssociatedTokenAddress(
    mint,
    fromPubkey,
    false,
    tokenProgram,
  );
  let currentBalance: bigint;
  try {
    const balanceResult = await connection.getTokenAccountBalance(senderAta);
    currentBalance = BigInt(balanceResult.value.amount);
  } catch {
    return {
      signature: "",
      success: false,
      error: "You don't have a token account for this mint. Balance is 0.",
    };
  }

  if (currentBalance < rawAmount) {
    const currentUi = Number(currentBalance) / Math.pow(10, decimals);
    return {
      signature: "",
      success: false,
      error: `Insufficient token balance. You have ${currentUi} but tried to send ${uiAmount}.`,
    };
  }

  // Build instructions
  const instructions: TransactionInstruction[] = [];

  // Create recipient ATA if needed
  const recipientAta = await getAssociatedTokenAddress(
    mint,
    recipient,
    true,
    tokenProgram,
  );
  try {
    const recipientAccount = await connection.getAccountInfo(recipientAta);
    if (!recipientAccount) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          fromPubkey,
          recipientAta,
          recipient,
          mint,
          tokenProgram,
        ),
      );
    }
  } catch {
    // Account doesn't exist, create it
    instructions.push(
      createAssociatedTokenAccountInstruction(
        fromPubkey,
        recipientAta,
        recipient,
        mint,
        tokenProgram,
      ),
    );
  }

  // Add transfer instruction
  instructions.push(
    createTransferInstruction(
      senderAta,
      recipientAta,
      fromPubkey,
      rawAmount,
      [],
      tokenProgram,
    ),
  );

  // Build versioned transaction with priority fees
  const priorityIxs = await createComputeBudgetInstructions(
    COMPUTE_UNITS.TOKEN_TRANSFER,
    [ctx.walletAddress],
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const message = new TransactionMessage({
    payerKey: fromPubkey,
    recentBlockhash: blockhash,
    instructions: [...priorityIxs, ...instructions],
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);

  // Sign via Privy
  const unsignedTx = Buffer.from(transaction.serialize()).toString("base64");

  const privy = getPrivyClient();
  const authContext = getAuthorizationContext();
  const rawResult = await privy
    .wallets()
    .solana()
    .signTransaction(ctx.walletId, {
      transaction: unsignedTx,
      authorization_context: authContext,
    });

  const validation = validatePrivySignResponse(rawResult);
  if (!validation.success) {
    return { signature: "", success: false, error: validation.error };
  }

  // Submit
  const signedTxBuffer = Buffer.from(
    validation.data.signed_transaction,
    "base64",
  );
  const signature = await connection.sendRawTransaction(signedTxBuffer, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );

  return {
    signature,
    success: true,
    rawAmount: rawAmount.toString(),
  };
}

/** Timeout for confirming a single batch transaction on-chain */
const CONFIRM_TIMEOUT_MS = 60_000; // 60 seconds

async function executeBatchTransfer(
  ctx: WalletToolContext,
  mint: PublicKey,
  recipients: PublicKey[],
  amountPerRecipient: number,
): Promise<BatchTransferResult & { decimals?: number }> {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const fromPubkey = new PublicKey(ctx.walletAddress);

  // Detect token program and decimals
  const tokenProgram = await detectTokenProgram(connection, mint);
  const decimals = await getTokenDecimals(connection, mint);
  const rawAmountPer = BigInt(
    Math.round(amountPerRecipient * Math.pow(10, decimals)),
  );
  const totalRaw = rawAmountPer * BigInt(recipients.length);

  // Check token balance
  const senderAta = await getAssociatedTokenAddress(
    mint,
    fromPubkey,
    false,
    tokenProgram,
  );
  let currentBalance: bigint;
  try {
    const balanceResult = await connection.getTokenAccountBalance(senderAta);
    currentBalance = BigInt(balanceResult.value.amount);
  } catch {
    return {
      totalRecipients: recipients.length,
      successCount: 0,
      failureCount: recipients.length,
      transactions: [],
      decimals,
      error: "You don't have a token account for this mint.",
    } as BatchTransferResult & { decimals?: number; error?: string };
  }

  if (currentBalance < totalRaw) {
    const currentUi = Number(currentBalance) / Math.pow(10, decimals);
    const totalUi = amountPerRecipient * recipients.length;
    return {
      totalRecipients: recipients.length,
      successCount: 0,
      failureCount: recipients.length,
      transactions: [],
      decimals,
      error: `Insufficient token balance. You have ${currentUi} but need ${totalUi} total (${amountPerRecipient} x ${recipients.length}).`,
    } as BatchTransferResult & { decimals?: number; error?: string };
  }

  // Split into batches of 5 per tx to stay within Solana's 1232-byte transaction
  // size limit (each recipient may need ATA creation + transfer = ~2 instructions)
  const BATCH_SIZE = 5;
  const batches: PublicKey[][] = [];
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    batches.push(recipients.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `[Wallet] Starting batch airdrop: ${recipients.length} recipients in ${batches.length} batches of ${BATCH_SIZE}`,
  );

  const result: BatchTransferResult = {
    totalRecipients: recipients.length,
    successCount: 0,
    failureCount: 0,
    transactions: [],
  };

  // Phase 1: Sign and send all batches (sequential signing to avoid Privy rate limits)
  const pendingTxs: Array<{
    signature: string;
    blockhash: string;
    lastValidBlockHeight: number;
    batchSize: number;
  }> = [];

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    console.log(
      `[Wallet] Signing batch ${batchIdx + 1}/${batches.length} (${batch.length} recipients)`,
    );

    try {
      const sent = await signAndSendBatchTx(
        ctx,
        connection,
        fromPubkey,
        mint,
        senderAta,
        batch,
        rawAmountPer,
        tokenProgram,
      );

      if (sent.error) {
        console.error(
          `[Wallet] Batch ${batchIdx + 1} sign/send failed: ${sent.error}`,
        );
        result.transactions.push({
          success: false,
          recipientCount: batch.length,
          error: sent.error,
        });
        result.failureCount += batch.length;
      } else {
        console.log(
          `[Wallet] Batch ${batchIdx + 1} sent: ${sent.signature!.slice(0, 16)}...`,
        );
        pendingTxs.push({
          signature: sent.signature!,
          blockhash: sent.blockhash!,
          lastValidBlockHeight: sent.lastValidBlockHeight!,
          batchSize: batch.length,
        });
      }
    } catch (error) {
      console.error(`[Wallet] Batch ${batchIdx + 1} exception:`, error);
      result.transactions.push({
        success: false,
        recipientCount: batch.length,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      result.failureCount += batch.length;
    }
  }

  if (pendingTxs.length === 0) {
    console.error("[Wallet] All batches failed to send, skipping confirmation");
    return { ...result, decimals };
  }

  console.log(
    `[Wallet] Confirming ${pendingTxs.length} transactions in parallel...`,
  );

  // Phase 2: Confirm all sent transactions in parallel (with timeout per confirmation)
  const confirmResults = await Promise.allSettled(
    pendingTxs.map(async (tx) => {
      const confirmPromise = connection.confirmTransaction(
        {
          signature: tx.signature,
          blockhash: tx.blockhash,
          lastValidBlockHeight: tx.lastValidBlockHeight,
        },
        "confirmed",
      );

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Transaction confirmation timed out")),
          CONFIRM_TIMEOUT_MS,
        ),
      );

      await Promise.race([confirmPromise, timeoutPromise]);
      return tx;
    }),
  );

  for (const settled of confirmResults) {
    if (settled.status === "fulfilled") {
      const tx = settled.value;
      result.transactions.push({
        signature: tx.signature,
        success: true,
        recipientCount: tx.batchSize,
      });
      result.successCount += tx.batchSize;
    } else {
      // Find the matching pending tx for batch size
      const failedTx = pendingTxs.find(
        (t) => !result.transactions.some((r) => r.signature === t.signature),
      );
      const errMsg =
        settled.reason instanceof Error
          ? settled.reason.message
          : "Confirmation failed";
      console.error(`[Wallet] Batch confirmation failed: ${errMsg}`);
      result.transactions.push({
        success: false,
        recipientCount: failedTx?.batchSize ?? 0,
        error: errMsg,
      });
      result.failureCount += failedTx?.batchSize ?? 0;
    }
  }

  console.log(
    `[Wallet] Batch airdrop complete: ${result.successCount} succeeded, ${result.failureCount} failed`,
  );

  return { ...result, decimals };
}

/**
 * Build, sign, and send a single batch transaction (without waiting for confirmation).
 * Returns the signature + blockhash info needed to confirm later.
 */
async function signAndSendBatchTx(
  ctx: WalletToolContext,
  connection: Connection,
  fromPubkey: PublicKey,
  mint: PublicKey,
  senderAta: PublicKey,
  recipients: PublicKey[],
  rawAmountPer: bigint,
  tokenProgram: PublicKey,
): Promise<{
  signature?: string;
  blockhash?: string;
  lastValidBlockHeight?: number;
  error?: string;
}> {
  const instructions: TransactionInstruction[] = [];

  // Derive all recipient ATAs (local computation, no RPC)
  const recipientAtas = await Promise.all(
    recipients.map((r) =>
      getAssociatedTokenAddress(mint, r, true, tokenProgram),
    ),
  );

  // Batch-check which ATAs already exist in a single RPC call
  const ataAccounts = await connection.getMultipleAccountsInfo(recipientAtas);

  // Build instructions: create missing ATAs + add transfer for each recipient
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const recipientAta = recipientAtas[i];

    if (!ataAccounts[i]) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          fromPubkey,
          recipientAta,
          recipient,
          mint,
          tokenProgram,
        ),
      );
    }

    instructions.push(
      createTransferInstruction(
        senderAta,
        recipientAta,
        fromPubkey,
        rawAmountPer,
        [],
        tokenProgram,
      ),
    );
  }

  // Build versioned transaction with priority fees
  const priorityIxs = await createComputeBudgetInstructions(
    COMPUTE_UNITS.TOKEN_BATCH,
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const message = new TransactionMessage({
    payerKey: fromPubkey,
    recentBlockhash: blockhash,
    instructions: [...priorityIxs, ...instructions],
  }).compileToV0Message();

  const transaction = new VersionedTransaction(message);

  // Sign via Privy
  const unsignedTx = Buffer.from(transaction.serialize()).toString("base64");

  const privy = getPrivyClient();
  const authContext = getAuthorizationContext();
  const rawResult = await privy
    .wallets()
    .solana()
    .signTransaction(ctx.walletId, {
      transaction: unsignedTx,
      authorization_context: authContext,
    });

  const validation = validatePrivySignResponse(rawResult);
  if (!validation.success) {
    return { error: validation.error };
  }

  const signedTxBuffer = Buffer.from(
    validation.data.signed_transaction,
    "base64",
  );

  const signature = await connection.sendRawTransaction(signedTxBuffer, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  return { signature, blockhash, lastValidBlockHeight };
}

// ── Helpers ──────────────────────────────────────────────────────────

async function detectTokenProgram(
  connection: Connection,
  mint: PublicKey,
): Promise<PublicKey> {
  try {
    const mintAccount = await connection.getAccountInfo(mint);
    if (mintAccount?.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      return TOKEN_2022_PROGRAM_ID;
    }
  } catch {
    // Fall through to default
  }
  return TOKEN_PROGRAM_ID;
}

async function getTokenDecimals(
  connection: Connection,
  mint: PublicKey,
): Promise<number> {
  try {
    const mintInfo = await connection.getParsedAccountInfo(mint);
    if (mintInfo.value && "parsed" in mintInfo.value.data) {
      return mintInfo.value.data.parsed?.info?.decimals ?? 6;
    }
  } catch {
    // Default to 6
  }
  return 6;
}

/** Write audit log entry to the WalletTransaction table */
async function logWalletTransaction(
  ctx: WalletToolContext,
  data: {
    type: string;
    recipient?: string;
    recipients?: unknown;
    tokenMint?: string;
    tokenSymbol?: string;
    amount: string;
    amountUi: string;
    signature?: string;
    status: string;
    errorMessage?: string;
  },
) {
  try {
    await prisma.walletTransaction.create({
      data: {
        userId: ctx.userId,
        walletAddress: ctx.walletAddress,
        type: data.type,
        signature: data.signature || null,
        status: data.status,
        recipient: data.recipient || null,
        recipients: data.recipients
          ? JSON.parse(JSON.stringify(data.recipients))
          : undefined,
        tokenMint: data.tokenMint || null,
        tokenSymbol: data.tokenSymbol || null,
        amount: data.amount,
        amountUi: data.amountUi,
        agentId: ctx.agentId || null,
        chatId: ctx.chatId || null,
        errorMessage: data.errorMessage || null,
      },
    });
  } catch (error) {
    // Audit logging should never block the tool response
    console.error("[Wallet] Failed to log transaction:", error);
  }
}

// ── Export factory ───────────────────────────────────────────────────

export function createWalletWriteTools(ctx: WalletToolContext) {
  return {
    transferSol: createTransferSol(ctx),
    transferToken: createTransferToken(ctx),
    batchTransferTokens: createBatchTransferTokens(ctx),
  };
}
