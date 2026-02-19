/**
 * Wallet Read Tools
 *
 * Read-only tools for inspecting the user's wallet: SOL balance, token holdings,
 * and transaction history. These execute immediately without approval.
 */

import { tool } from "ai";
import { z } from "zod";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnection, SOLANA_RPC_URL } from "@/lib/constants/solana";
import type {
  WalletToolContext,
  TokenBalance,
  TransactionEntry,
} from "./types";

// ── getWalletBalance ─────────────────────────────────────────────────

function createGetWalletBalance(ctx: WalletToolContext) {
  return tool({
    description:
      "Get the SOL balance of your active wallet. Returns the balance in SOL and lamports.",
    inputSchema: z.object({}),
    execute: async (_input: Record<string, never>) => {
      try {
        const connection = getConnection();
        const pubkey = new PublicKey(ctx.walletAddress);
        const lamports = await connection.getBalance(pubkey);
        const sol = lamports / LAMPORTS_PER_SOL;

        return {
          address: ctx.walletAddress,
          lamports,
          sol: sol.toFixed(6),
          solNumeric: sol,
        };
      } catch (error) {
        return {
          error: `Failed to get wallet balance: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });
}

// ── getTokenBalances ─────────────────────────────────────────────────

function createGetTokenBalances(ctx: WalletToolContext) {
  return tool({
    description:
      "Get all SPL token holdings in your active wallet. Returns token mints, symbols, names, balances, and metadata.",
    inputSchema: z.object({}),
    execute: async (_input: Record<string, never>) => {
      try {
        // Use Helius enhanced RPC for richer token data
        const response = await fetch(SOLANA_RPC_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getTokenAccountsByOwner",
            params: [
              ctx.walletAddress,
              { programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" },
              {
                encoding: "jsonParsed",
                commitment: "confirmed",
              },
            ],
          }),
        });

        const data = await response.json();

        if (data.error) {
          return { error: `RPC error: ${data.error.message}` };
        }

        const accounts = data.result?.value || [];
        const tokens: TokenBalance[] = [];

        for (const account of accounts) {
          const info = account.account.data.parsed?.info;
          if (!info) continue;

          const uiAmount = info.tokenAmount?.uiAmount ?? 0;
          // Skip zero-balance token accounts
          if (uiAmount === 0) continue;

          tokens.push({
            mint: info.mint,
            amount: info.tokenAmount?.amount || "0",
            uiAmount,
            decimals: info.tokenAmount?.decimals ?? 0,
          });
        }

        // Enrich with token metadata via Helius DAS if we have tokens
        if (tokens.length > 0) {
          try {
            const enriched = await enrichTokenMetadata(
              tokens.map((t) => t.mint),
            );
            for (const token of tokens) {
              const meta = enriched.get(token.mint);
              if (meta) {
                token.symbol = meta.symbol;
                token.name = meta.name;
                token.imageUrl = meta.imageUrl;
              }
            }
          } catch {
            // Metadata enrichment is best-effort
          }
        }

        // Sort by uiAmount descending
        tokens.sort((a, b) => b.uiAmount - a.uiAmount);

        return {
          address: ctx.walletAddress,
          tokenCount: tokens.length,
          tokens,
        };
      } catch (error) {
        return {
          error: `Failed to get token balances: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });
}

// ── getTransactionHistory ────────────────────────────────────────────

const txHistorySchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(10)
    .describe("Number of recent transactions to fetch (1-50, default 10)"),
});

const verifyPaymentTxSchema = z.object({
  signature: z
    .string()
    .describe("Transaction signature to verify on Solana"),
  expectedRecipient: z
    .string()
    .describe("Expected recipient Solana address (treasury/payee)"),
  minAmountSol: z
    .number()
    .positive()
    .describe("Minimum SOL amount expected to be received by the recipient"),
  expectedPayer: z
    .string()
    .optional()
    .describe("Optional expected payer wallet address"),
  requiredFinality: z
    .enum(["confirmed", "finalized"])
    .default("confirmed")
    .describe("Required confirmation level"),
});

function createGetTransactionHistory(ctx: WalletToolContext) {
  return tool({
    description:
      "Get recent transaction history for your active wallet. Returns the most recent transactions with type, status, and details.",
    inputSchema: txHistorySchema,
    execute: async (input: z.infer<typeof txHistorySchema>) => {
      try {
        const connection = getConnection();
        const pubkey = new PublicKey(ctx.walletAddress);

        const signatures = await connection.getSignaturesForAddress(pubkey, {
          limit: input.limit,
        });

        const transactions: TransactionEntry[] = signatures.map((sig) => ({
          signature: sig.signature,
          timestamp: sig.blockTime ?? null,
          type: sig.memo ? "memo" : "unknown",
          status: sig.err ? "failed" : "success",
          fee: 0,
          description: sig.memo || undefined,
        }));

        return {
          address: ctx.walletAddress,
          count: transactions.length,
          transactions,
        };
      } catch (error) {
        return {
          error: `Failed to get transaction history: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });
}

function createVerifyPaymentTx() {
  return tool({
    description:
      "Verify a SOL payment transaction by signature using on-chain data. Checks recipient, minimum amount, confirmation status, and optional payer address.",
    inputSchema: verifyPaymentTxSchema,
    execute: async (input: z.infer<typeof verifyPaymentTxSchema>) => {
      try {
        let recipientPubkey: PublicKey;
        try {
          recipientPubkey = new PublicKey(input.expectedRecipient);
        } catch {
          return {
            valid: false,
            error: `Invalid expectedRecipient address: ${input.expectedRecipient}`,
          };
        }

        if (input.expectedPayer) {
          try {
            new PublicKey(input.expectedPayer);
          } catch {
            return {
              valid: false,
              error: `Invalid expectedPayer address: ${input.expectedPayer}`,
            };
          }
        }

        const connection = getConnection();
        const tx = await connection.getParsedTransaction(input.signature, {
          commitment: input.requiredFinality,
          maxSupportedTransactionVersion: 0,
        });

        if (!tx) {
          return {
            valid: false,
            signature: input.signature,
            error:
              "Transaction not found at the requested finality (or not yet indexed).",
          };
        }

        if (tx.meta?.err) {
          return {
            valid: false,
            signature: input.signature,
            error: `Transaction failed on-chain: ${JSON.stringify(tx.meta.err)}`,
          };
        }

        const confirmation = await connection.getSignatureStatuses([
          input.signature,
        ]);
        const status = confirmation.value[0];
        const confirmationStatus = status?.confirmationStatus ?? "processed";

        const statusRank: Record<string, number> = {
          processed: 1,
          confirmed: 2,
          finalized: 3,
        };
        const requiredRank =
          input.requiredFinality === "finalized" ? statusRank.finalized : statusRank.confirmed;
        const gotRank = statusRank[confirmationStatus] ?? 0;
        const meetsFinality = gotRank >= requiredRank;

        const payer =
          tx.transaction.message.accountKeys[0]?.pubkey?.toBase58() || "";
        if (input.expectedPayer && payer !== input.expectedPayer) {
          return {
            valid: false,
            signature: input.signature,
            payer,
            error: `Payer mismatch: expected ${input.expectedPayer}, got ${payer}`,
          };
        }

        let matchedLamports = 0;
        const transfers: Array<{
          source: string;
          destination: string;
          lamports: number;
          sol: string;
        }> = [];

        for (const instruction of tx.transaction.message.instructions) {
          const parsedInstruction = instruction as {
            program?: string;
            parsed?: {
              type?: string;
              info?: {
                source?: string;
                destination?: string;
                lamports?: string | number;
              };
            };
          };

          if (
            parsedInstruction.program !== "system" ||
            parsedInstruction.parsed?.type !== "transfer"
          ) {
            continue;
          }

          const source = parsedInstruction.parsed.info?.source;
          const destination = parsedInstruction.parsed.info?.destination;
          const lamportsRaw = parsedInstruction.parsed.info?.lamports ?? 0;
          const lamports =
            typeof lamportsRaw === "string"
              ? Number.parseInt(lamportsRaw, 10)
              : lamportsRaw;

          if (!source || !destination || !Number.isFinite(lamports)) continue;

          transfers.push({
            source,
            destination,
            lamports,
            sol: (lamports / LAMPORTS_PER_SOL).toFixed(9),
          });

          if (destination === recipientPubkey.toBase58()) {
            matchedLamports += lamports;
          }
        }

        const minLamports = Math.ceil(input.minAmountSol * LAMPORTS_PER_SOL);
        const amountValid = matchedLamports >= minLamports;
        const valid = meetsFinality && amountValid;

        return {
          valid,
          signature: input.signature,
          requiredFinality: input.requiredFinality,
          confirmationStatus,
          meetsFinality,
          payer,
          expectedRecipient: input.expectedRecipient,
          receivedLamportsToRecipient: matchedLamports,
          receivedSolToRecipient: (matchedLamports / LAMPORTS_PER_SOL).toFixed(9),
          minAmountSolRequired: input.minAmountSol,
          minLamportsRequired: minLamports,
          amountValid,
          blockTime: tx.blockTime ?? null,
          slot: tx.slot,
          explorerUrl: `https://solscan.io/tx/${input.signature}`,
          transfers,
        };
      } catch (error) {
        return {
          valid: false,
          signature: input.signature,
          error: `Failed to verify payment transaction: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });
}

// ── Helpers ──────────────────────────────────────────────────────────

interface TokenMeta {
  symbol?: string;
  name?: string;
  imageUrl?: string;
}

/** Batch-fetch token metadata via Helius DAS getAssetBatch */
async function enrichTokenMetadata(
  mints: string[],
): Promise<Map<string, TokenMeta>> {
  const result = new Map<string, TokenMeta>();

  // Helius DAS API: getAssetBatch
  const response = await fetch(SOLANA_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getAssetBatch",
      params: {
        ids: mints,
      },
    }),
  });

  const data = await response.json();
  const assets = data.result || [];

  for (const asset of assets) {
    if (!asset?.id) continue;
    result.set(asset.id, {
      symbol: asset.content?.metadata?.symbol,
      name: asset.content?.metadata?.name,
      imageUrl: asset.content?.links?.image || asset.content?.files?.[0]?.uri,
    });
  }

  return result;
}

// ── Export factory ───────────────────────────────────────────────────

export function createWalletReadTools(ctx: WalletToolContext) {
  return {
    getWalletBalance: createGetWalletBalance(ctx),
    getTokenBalances: createGetTokenBalances(ctx),
    getTransactionHistory: createGetTransactionHistory(ctx),
    verifyPaymentTx: createVerifyPaymentTx(),
  };
}
