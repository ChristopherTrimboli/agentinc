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

// ── In-memory cache for agent tool calls ─────────────────────────────

const TOOL_CACHE_TTL_MS = 60_000;

interface CachedResult<T> {
  data: T;
  expiresAt: number;
}

const holderCache = new Map<string, CachedResult<TokenHolder[]>>();

function getCachedHolders(key: string): TokenHolder[] | null {
  const entry = holderCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    holderCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedHolders(key: string, data: TokenHolder[]): void {
  holderCache.set(key, { data, expiresAt: Date.now() + TOOL_CACHE_TTL_MS });
}

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
        const cacheKey = `${mint}:${limit}`;
        let holders = getCachedHolders(cacheKey);

        if (!holders) {
          holders = await fetchTokenHolders(mint, limit);
          setCachedHolders(cacheKey, holders);
        }

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
}

/** Fetch the decimals value for an SPL token mint via getAccountInfo. */
async function fetchMintDecimals(mint: string): Promise<number> {
  const response = await fetch(SOLANA_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "mint-decimals",
      method: "getAccountInfo",
      params: [mint, { encoding: "base64" }],
    }),
  });

  const data = await response.json();
  const b64 = data?.result?.value?.data?.[0];
  if (!b64) throw new Error(`Mint account not found: ${mint}`);

  const buf = Buffer.from(b64, "base64");
  return buf[44];
}

/**
 * Fetch top token holders via Helius DAS `getTokenAccounts`.
 * Paginated: fetches up to `limit` holders sorted by amount descending.
 */
async function fetchTokenHolders(
  mint: string,
  limit: number,
): Promise<TokenHolder[]> {
  const decimals = await fetchMintDecimals(mint);
  const allAccounts: HeliusTokenAccount[] = [];
  let cursor: string | undefined;
  const pageSize = Math.min(limit, 100);

  // Paginate through Helius results
  while (true) {
    const params: Record<string, unknown> = {
      mint,
      limit: pageSize,
      displayOptions: { showZeroBalance: false },
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
  const divisor = Math.pow(10, decimals);
  return sorted.map((account) => {
    const uiAmount = account.amount / divisor;

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
