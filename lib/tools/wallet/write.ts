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
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";
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

  // Build transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({ fromPubkey, toPubkey: recipient, lamports }),
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  // Sign via Privy
  const unsignedTx = transaction
    .serialize({ requireAllSignatures: false })
    .toString("base64");

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

  // Build transaction
  const transaction = new Transaction();

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
      transaction.add(
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
    transaction.add(
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
  transaction.add(
    createTransferInstruction(
      senderAta,
      recipientAta,
      fromPubkey,
      rawAmount,
      [],
      tokenProgram,
    ),
  );

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  // Sign via Privy
  const unsignedTx = transaction
    .serialize({ requireAllSignatures: false })
    .toString("base64");

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

  // Split into batches of MAX_BATCH_RECIPIENTS
  const batches: PublicKey[][] = [];
  for (let i = 0; i < recipients.length; i += MAX_BATCH_RECIPIENTS) {
    batches.push(recipients.slice(i, i + MAX_BATCH_RECIPIENTS));
  }

  const result: BatchTransferResult = {
    totalRecipients: recipients.length,
    successCount: 0,
    failureCount: 0,
    transactions: [],
  };

  // Execute batches sequentially (each needs its own blockhash/signature)
  for (const batch of batches) {
    try {
      const txResult = await executeSingleBatchTx(
        ctx,
        connection,
        fromPubkey,
        mint,
        senderAta,
        batch,
        rawAmountPer,
        tokenProgram,
      );

      result.transactions.push({
        signature: txResult.signature,
        success: txResult.success,
        recipientCount: batch.length,
        error: txResult.error,
      });

      if (txResult.success) {
        result.successCount += batch.length;
      } else {
        result.failureCount += batch.length;
      }
    } catch (error) {
      result.transactions.push({
        success: false,
        recipientCount: batch.length,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      result.failureCount += batch.length;
    }
  }

  return { ...result, decimals };
}

async function executeSingleBatchTx(
  ctx: WalletToolContext,
  connection: Connection,
  fromPubkey: PublicKey,
  mint: PublicKey,
  senderAta: PublicKey,
  recipients: PublicKey[],
  rawAmountPer: bigint,
  tokenProgram: PublicKey,
): Promise<TransferResult> {
  const transaction = new Transaction();

  // For each recipient: create ATA if needed + add transfer instruction
  for (const recipient of recipients) {
    const recipientAta = await getAssociatedTokenAddress(
      mint,
      recipient,
      true,
      tokenProgram,
    );

    try {
      const account = await connection.getAccountInfo(recipientAta);
      if (!account) {
        transaction.add(
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
      transaction.add(
        createAssociatedTokenAccountInstruction(
          fromPubkey,
          recipientAta,
          recipient,
          mint,
          tokenProgram,
        ),
      );
    }

    transaction.add(
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

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  // Sign via Privy
  const unsignedTx = transaction
    .serialize({ requireAllSignatures: false })
    .toString("base64");

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

  return { signature, success: true };
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
