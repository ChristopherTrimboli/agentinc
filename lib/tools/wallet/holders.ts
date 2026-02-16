/**
 * Token Holder Lookup Tool
 *
 * Uses Helius DAS API `getTokenAccounts` to fetch the top holders of any
 * SPL token. This powers use cases like "find top 100 holders of token XYZ".
 */

import { tool } from "ai";
import { z } from "zod";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import type { TokenHolder } from "./types";

// ── getTokenHolders ──────────────────────────────────────────────────

const tokenHolderSchema = z.object({
  mint: z
    .string()
    .describe(
      "The SPL token mint address to look up holders for (base58 Solana address)",
    ),
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe("Number of top holders to return (1-100, default 20)"),
});

function createGetTokenHolders() {
  return tool({
    description:
      "Get the top holders of any SPL token by mint address. Returns wallet addresses sorted by balance descending, with percentage of supply. Useful for holder analysis and airdrops.",
    inputSchema: tokenHolderSchema,
    execute: async (input: z.infer<typeof tokenHolderSchema>) => {
      const { mint, limit } = input;
      try {
        // Step 1: Fetch token accounts via Helius DAS API
        const holders = await fetchTokenHolders(mint, limit);

        if (holders.length === 0) {
          return {
            mint,
            holderCount: 0,
            holders: [],
            message: "No holders found for this token mint.",
          };
        }

        return {
          mint,
          holderCount: holders.length,
          holders,
        };
      } catch (error) {
        return {
          error: `Failed to get token holders: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    },
  });
}

// ── Helius DAS: getTokenAccounts ─────────────────────────────────────

interface HeliusTokenAccount {
  address: string;
  owner: string;
  amount: number;
  decimals: number;
}

/**
 * Fetch top token holders via Helius DAS `getTokenAccounts`.
 * Paginated: fetches up to `limit` holders sorted by amount descending.
 */
async function fetchTokenHolders(
  mint: string,
  limit: number,
): Promise<TokenHolder[]> {
  const allAccounts: HeliusTokenAccount[] = [];
  let cursor: string | undefined;
  const pageSize = Math.min(limit, 100);

  // Paginate through Helius results
  while (true) {
    const params: Record<string, unknown> = {
      mint,
      limit: pageSize,
      showZeroBalance: false,
    };
    if (cursor) {
      params.cursor = cursor;
    }

    const response = await fetch(SOLANA_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccounts",
        params,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Helius API error: ${data.error.message}`);
    }

    const accounts: HeliusTokenAccount[] = data.result?.token_accounts || [];
    allAccounts.push(...accounts);

    // Stop if we have enough or no more pages
    cursor = data.result?.cursor;
    if (!cursor || allAccounts.length >= limit) {
      break;
    }
  }

  // Calculate total supply from fetched accounts for percentage calculation
  const totalAmount = allAccounts.reduce((sum, a) => sum + a.amount, 0);

  // Sort by amount descending and take top `limit`
  const sorted = allAccounts
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);

  // Map to TokenHolder format
  return sorted.map((account) => {
    const uiAmount =
      account.decimals > 0
        ? account.amount / Math.pow(10, account.decimals)
        : account.amount;

    return {
      address: account.owner,
      amount: account.amount.toString(),
      uiAmount,
      percentage:
        totalAmount > 0
          ? Number(((account.amount / totalAmount) * 100).toFixed(4))
          : 0,
    };
  });
}

// ── Export factory ───────────────────────────────────────────────────

export function createTokenHolderTools() {
  return {
    getTokenHolders: createGetTokenHolders(),
  };
}
