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
  };
}
