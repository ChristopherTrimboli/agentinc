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
  { revalidate: REVALIDATE },
);

export const getCachedCollectionAssets = unstable_cache(
  async (col: string, limit: number, offset: number) => {
    const sdk = getErc8004Sdk();
    return sdk.getCollectionAssets(col, { limit, offset });
  },
  ["8004-collection-assets"],
  { revalidate: REVALIDATE },
);
