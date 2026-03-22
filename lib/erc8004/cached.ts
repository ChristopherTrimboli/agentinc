/**
 * Cached wrappers for 8004 indexer SDK calls.
 *
 * Uses Next.js `unstable_cache` so results persist across requests on Vercel
 * (backed by the data cache) and revalidate every 5 minutes.
 * Prevents hammering the indexer on every page load.
 */

import { unstable_cache } from "next/cache";

import { getErc8004Sdk } from "@/lib/erc8004";

const REVALIDATE = 300; // 5 minutes

export const getCachedGlobalStats = unstable_cache(
  async () => {
    const sdk = getErc8004Sdk();
    return sdk.getGlobalStats();
  },
  ["8004-global-stats"],
  { revalidate: REVALIDATE },
);

export const getCachedCollectionPointers = unstable_cache(
  async () => {
    const sdk = getErc8004Sdk();
    return sdk.getCollectionPointers();
  },
  ["8004-collection-pointers"],
  { revalidate: REVALIDATE },
);

export const getCachedIsIndexerAvailable = unstable_cache(
  async () => {
    const sdk = getErc8004Sdk();
    return sdk.isIndexerAvailable();
  },
  ["8004-indexer-available"],
  { revalidate: 60 }, // 1 minute for health checks
);

export const getCachedSearchAgents = unstable_cache(
  async (limit: number, offset: number) => {
    const sdk = getErc8004Sdk();
    return sdk.searchAgents({ limit, offset });
  },
  ["8004-search-agents"],
  { revalidate: REVALIDATE, tags: [] },
);

// unstable_cache doesn't automatically key by args — wrap per-call so
// each unique (limit, offset) combination gets its own cache entry.
export function getCachedSearchAgentsPage(limit: number, offset: number) {
  return unstable_cache(
    async () => {
      const sdk = getErc8004Sdk();
      return sdk.searchAgents({ limit, offset });
    },
    [`8004-search-agents-${limit}-${offset}`],
    { revalidate: REVALIDATE },
  )();
}

export const getCachedCollectionAssets = unstable_cache(
  async (col: string, limit: number, offset: number) => {
    const sdk = getErc8004Sdk();
    return sdk.getCollectionAssets(col, { limit, offset });
  },
  ["8004-collection-assets"],
  { revalidate: REVALIDATE, tags: [] },
);

export function getCachedCollectionAssetsPage(
  col: string,
  limit: number,
  offset: number,
) {
  return unstable_cache(
    async () => {
      const sdk = getErc8004Sdk();
      return sdk.getCollectionAssets(col, { limit, offset });
    },
    [`8004-collection-assets-${col}-${limit}-${offset}`],
    { revalidate: REVALIDATE },
  )();
}

// ── Uncached (direct SDK) helpers for full refresh ──────────────────────────

export async function getUncachedGlobalStats() {
  const sdk = getErc8004Sdk();
  return sdk.getGlobalStats();
}

export async function getUncachedCollectionPointers() {
  const sdk = getErc8004Sdk();
  return sdk.getCollectionPointers();
}

export async function getUncachedIsIndexerAvailable() {
  const sdk = getErc8004Sdk();
  return sdk.isIndexerAvailable();
}

export async function getUncachedSearchAgentsPage(
  limit: number,
  offset: number,
) {
  const sdk = getErc8004Sdk();
  return sdk.searchAgents({ limit, offset });
}

export async function getUncachedCollectionAssetsPage(
  col: string,
  limit: number,
  offset: number,
) {
  const sdk = getErc8004Sdk();
  return sdk.getCollectionAssets(col, { limit, offset });
}
