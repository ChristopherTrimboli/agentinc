import { tool } from "ai";
import { z } from "zod";
import { isRedisConfigured, getRedis } from "@/lib/redis";

/**
 * Crypto tools using CoinGecko's free API (no API key required)
 * Rate limit: ~10-30 calls/minute on free tier
 *
 * Includes:
 * - Price data (single & multiple coins)
 * - Trending & search
 * - Global market data
 * - Coin details & history
 * - Categories
 * - Exchanges
 * - Onchain DEX data (GeckoTerminal)
 */

const COINGECKO_API = "https://api.coingecko.com/api/v3";
const GECKO_TERMINAL_API = "https://api.geckoterminal.com/api/v2";

// ── Redis caching for external API calls ─────────────────────────────────

const CRYPTO_CACHE_TTL = 30; // 30 seconds for price data
const CRYPTO_STATIC_CACHE_TTL = 300; // 5 minutes for trending/search/categories

const cryptoMemoryCache = new Map<
  string,
  { data: unknown; expiresAt: number }
>();

async function cachedFetch<T>(
  cacheKey: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  // Check in-memory first (fastest)
  const memCached = cryptoMemoryCache.get(cacheKey);
  if (memCached && Date.now() < memCached.expiresAt) {
    return memCached.data as T;
  }

  // Check Redis
  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      const cached = await redis.get<T>(cacheKey);
      if (cached !== null && cached !== undefined) {
        // Populate memory cache from Redis hit
        cryptoMemoryCache.set(cacheKey, {
          data: cached,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
        return cached;
      }
    } catch {
      // Fall through to fetch
    }
  }

  // Fetch from API
  const data = await fetcher();

  // Store in both caches
  cryptoMemoryCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  if (isRedisConfigured()) {
    try {
      const redis = getRedis();
      await redis.set(cacheKey, data, { ex: ttlSeconds });
    } catch {
      // Non-critical
    }
  }

  // Evict stale memory cache entries periodically
  if (cryptoMemoryCache.size > 200) {
    const now = Date.now();
    for (const [key, entry] of cryptoMemoryCache) {
      if (now >= entry.expiresAt) cryptoMemoryCache.delete(key);
    }
  }

  return data;
}

// Common coin ID mappings (CoinGecko uses specific IDs)
const COIN_ALIASES: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  usdc: "usd-coin",
  usdt: "tether",
  bnb: "binancecoin",
  xrp: "ripple",
  ada: "cardano",
  doge: "dogecoin",
  dot: "polkadot",
  matic: "matic-network",
  link: "chainlink",
  avax: "avalanche-2",
  atom: "cosmos",
  uni: "uniswap",
};

// Network aliases for onchain data
const NETWORK_ALIASES: Record<string, string> = {
  sol: "solana",
  eth: "eth",
  ethereum: "eth",
  base: "base",
  arbitrum: "arbitrum",
  polygon: "polygon_pos",
  bnb: "bsc",
  bsc: "bsc",
  avalanche: "avax",
  avax: "avax",
  optimism: "optimism",
};

function resolveCoinId(input: string): string {
  const normalized = input.toLowerCase().trim();
  return COIN_ALIASES[normalized] || normalized;
}

function resolveNetwork(input: string): string {
  const normalized = input.toLowerCase().trim();
  return NETWORK_ALIASES[normalized] || normalized;
}

// Helper for API requests with error handling and Redis caching
async function fetchCoinGeckoRaw<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${COINGECKO_API}${endpoint}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a minute.");
    }
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

async function fetchGeckoTerminalRaw<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${GECKO_TERMINAL_API}${endpoint}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again in a minute.");
    }
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

/** Cached CoinGecko fetch (30s TTL for price data) */
async function fetchCoinGecko<T>(
  endpoint: string,
  ttl = CRYPTO_CACHE_TTL,
): Promise<T> {
  return cachedFetch<T>(`crypto:cg:${endpoint}`, ttl, () =>
    fetchCoinGeckoRaw<T>(endpoint),
  );
}

/** Cached GeckoTerminal fetch (30s TTL for price data) */
async function fetchGeckoTerminal<T>(
  endpoint: string,
  ttl = CRYPTO_CACHE_TTL,
): Promise<T> {
  return cachedFetch<T>(`crypto:gt:${endpoint}`, ttl, () =>
    fetchGeckoTerminalRaw<T>(endpoint),
  );
}

const getCryptoPriceSchema = z.object({
  coin: z
    .string()
    .describe(
      "The cryptocurrency name or symbol (e.g., 'bitcoin', 'btc', 'solana', 'sol')",
    ),
  currency: z
    .string()
    .default("usd")
    .describe("The fiat currency for price (e.g., 'usd', 'eur', 'gbp')"),
});

/**
 * Get current price and 24h change for a cryptocurrency
 */
export const getCryptoPrice = tool({
  description:
    "Get the current price, 24h change, and market data for a cryptocurrency. Supports common symbols like BTC, ETH, SOL.",
  inputSchema: getCryptoPriceSchema,
  execute: async (input: z.infer<typeof getCryptoPriceSchema>) => {
    const coinId = resolveCoinId(input.coin);
    const currency = input.currency.toLowerCase();

    try {
      const params = new URLSearchParams({
        ids: coinId,
        vs_currencies: currency,
        include_24hr_change: "true",
        include_market_cap: "true",
        include_24hr_vol: "true",
      });
      const data = await fetchCoinGecko<Record<string, Record<string, number>>>(
        `/simple/price?${params}`,
      );

      if (!data[coinId]) {
        return {
          error: `Coin '${input.coin}' not found. Try using the full name (e.g., 'bitcoin' instead of 'btc').`,
          coin: input.coin,
          suggestion:
            "Use CoinGecko coin IDs like: bitcoin, ethereum, solana, cardano, polkadot",
        };
      }

      const coinData = data[coinId];
      const price = coinData[currency];
      const change24h = coinData[`${currency}_24h_change`];
      const marketCap = coinData[`${currency}_market_cap`];
      const volume24h = coinData[`${currency}_24h_vol`];

      return {
        coin: coinId,
        symbol: input.coin.toUpperCase(),
        price: price,
        currency: currency.toUpperCase(),
        change24h: change24h ? Number(change24h.toFixed(2)) : null,
        marketCap: marketCap ? Math.round(marketCap) : null,
        volume24h: volume24h ? Math.round(volume24h) : null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch price: ${error instanceof Error ? error.message : "Unknown error"}`,
        coin: input.coin,
      };
    }
  },
});

const getMultiplePricesSchema = z.object({
  coins: z
    .array(z.string())
    .min(1)
    .max(10)
    .describe("Array of cryptocurrency names or symbols (max 10)"),
  currency: z.string().default("usd").describe("The fiat currency for prices"),
});

/**
 * Get prices for multiple cryptocurrencies at once
 */
export const getMultipleCryptoPrices = tool({
  description:
    "Get current prices for multiple cryptocurrencies in a single request. More efficient than multiple single requests.",
  inputSchema: getMultiplePricesSchema,
  execute: async (input: z.infer<typeof getMultiplePricesSchema>) => {
    const coinIds = input.coins.map(resolveCoinId).join(",");
    const currency = input.currency.toLowerCase();

    try {
      const params = new URLSearchParams({
        ids: coinIds,
        vs_currencies: currency,
        include_24hr_change: "true",
      });
      const data = await fetchCoinGecko<Record<string, Record<string, number>>>(
        `/simple/price?${params}`,
      );

      const prices = input.coins.map((coin) => {
        const coinId = resolveCoinId(coin);
        const coinData = data[coinId];

        if (!coinData) {
          return {
            coin: coin,
            error: "Not found",
          };
        }

        return {
          coin: coinId,
          symbol: coin.toUpperCase(),
          price: coinData[currency],
          currency: currency.toUpperCase(),
          change24h: coinData[`${currency}_24h_change`]
            ? Number(coinData[`${currency}_24h_change`].toFixed(2))
            : null,
        };
      });

      return {
        prices,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch prices: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// ============================================================================
// TRENDING & SEARCH TOOLS
// ============================================================================

/**
 * Get trending coins, NFTs, and categories in the last 24 hours
 */
export const getTrendingCoins = tool({
  description:
    "Get trending cryptocurrencies, NFTs, and categories on CoinGecko in the last 24 hours. Great for discovering what's hot in the market.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const data = await fetchCoinGecko<{
        coins: Array<{
          item: {
            id: string;
            coin_id: number;
            name: string;
            symbol: string;
            market_cap_rank: number;
            thumb: string;
            price_btc: number;
            data?: {
              price: number;
              price_change_percentage_24h?: { usd?: number };
              market_cap?: string;
              total_volume?: string;
            };
          };
        }>;
        nfts: Array<{
          id: string;
          name: string;
          symbol: string;
          thumb: string;
          floor_price_24h_percentage_change?: number;
        }>;
        categories: Array<{
          id: number;
          name: string;
          market_cap_1h_change?: number;
        }>;
      }>("/search/trending", CRYPTO_STATIC_CACHE_TTL);

      return {
        trending_coins: data.coins.slice(0, 10).map((c) => ({
          name: c.item.name,
          symbol: c.item.symbol.toUpperCase(),
          id: c.item.id,
          market_cap_rank: c.item.market_cap_rank,
          price_btc: c.item.price_btc,
          price_usd: c.item.data?.price,
          change_24h: c.item.data?.price_change_percentage_24h?.usd,
        })),
        trending_nfts: data.nfts.slice(0, 5).map((n) => ({
          name: n.name,
          symbol: n.symbol,
          id: n.id,
          floor_price_change_24h: n.floor_price_24h_percentage_change,
        })),
        trending_categories: data.categories.slice(0, 5).map((cat) => ({
          name: cat.name,
          market_cap_change_1h: cat.market_cap_1h_change,
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch trending: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

const searchCryptoSchema = z.object({
  query: z.string().describe("Search query (coin name, symbol, or keyword)"),
});

/**
 * Search for coins, exchanges, categories, and NFTs
 */
export const searchCrypto = tool({
  description:
    "Search for cryptocurrencies, exchanges, categories, and NFTs by name or keyword. Returns matching results across all categories.",
  inputSchema: searchCryptoSchema,
  execute: async (input: z.infer<typeof searchCryptoSchema>) => {
    try {
      const data = await fetchCoinGecko<{
        coins: Array<{
          id: string;
          name: string;
          symbol: string;
          market_cap_rank: number | null;
          thumb: string;
        }>;
        exchanges: Array<{
          id: string;
          name: string;
          market_type: string;
        }>;
        categories: Array<{
          id: number;
          name: string;
        }>;
        nfts: Array<{
          id: string;
          name: string;
          symbol: string;
        }>;
      }>(
        `/search?query=${encodeURIComponent(input.query)}`,
        CRYPTO_STATIC_CACHE_TTL,
      );

      return {
        coins: data.coins.slice(0, 10).map((c) => ({
          id: c.id,
          name: c.name,
          symbol: c.symbol.toUpperCase(),
          market_cap_rank: c.market_cap_rank,
        })),
        exchanges: data.exchanges.slice(0, 5).map((e) => ({
          id: e.id,
          name: e.name,
          type: e.market_type,
        })),
        categories: data.categories.slice(0, 5).map((cat) => ({
          id: cat.id,
          name: cat.name,
        })),
        nfts: data.nfts.slice(0, 5).map((n) => ({
          id: n.id,
          name: n.name,
          symbol: n.symbol,
        })),
        query: input.query,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        query: input.query,
      };
    }
  },
});

// ============================================================================
// GLOBAL MARKET DATA TOOLS
// ============================================================================

/**
 * Get global cryptocurrency market data
 */
export const getGlobalMarketData = tool({
  description:
    "Get global cryptocurrency market data including total market cap, 24h volume, BTC/ETH dominance, number of active coins and exchanges.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const data = await fetchCoinGecko<{
        data: {
          active_cryptocurrencies: number;
          upcoming_icos: number;
          ongoing_icos: number;
          ended_icos: number;
          markets: number;
          total_market_cap: Record<string, number>;
          total_volume: Record<string, number>;
          market_cap_percentage: Record<string, number>;
          market_cap_change_percentage_24h_usd: number;
          updated_at: number;
        };
      }>("/global", CRYPTO_STATIC_CACHE_TTL);

      const d = data.data;
      return {
        active_cryptocurrencies: d.active_cryptocurrencies,
        active_exchanges: d.markets,
        total_market_cap_usd: Math.round(d.total_market_cap.usd),
        total_volume_24h_usd: Math.round(d.total_volume.usd),
        market_cap_change_24h_percent: Number(
          d.market_cap_change_percentage_24h_usd.toFixed(2),
        ),
        btc_dominance: Number(d.market_cap_percentage.btc?.toFixed(2)),
        eth_dominance: Number(d.market_cap_percentage.eth?.toFixed(2)),
        timestamp: new Date(d.updated_at * 1000).toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch global data: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

/**
 * Get global DeFi market data
 */
export const getDeFiGlobalData = tool({
  description:
    "Get global DeFi (Decentralized Finance) market data including DeFi market cap, trading volume, and dominance percentage.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const data = await fetchCoinGecko<{
        data: {
          defi_market_cap: string;
          eth_market_cap: string;
          defi_to_eth_ratio: string;
          trading_volume_24h: string;
          defi_dominance: string;
          top_coin_name: string;
          top_coin_defi_dominance: number;
        };
      }>("/global/decentralized_finance_defi", CRYPTO_STATIC_CACHE_TTL);

      const d = data.data;
      return {
        defi_market_cap_usd: Math.round(parseFloat(d.defi_market_cap)),
        eth_market_cap_usd: Math.round(parseFloat(d.eth_market_cap)),
        defi_to_eth_ratio: Number(parseFloat(d.defi_to_eth_ratio).toFixed(4)),
        trading_volume_24h_usd: Math.round(parseFloat(d.trading_volume_24h)),
        defi_dominance_percent: Number(parseFloat(d.defi_dominance).toFixed(2)),
        top_defi_coin: d.top_coin_name,
        top_coin_dominance: d.top_coin_defi_dominance,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch DeFi data: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// ============================================================================
// COIN DETAILS & MARKET DATA TOOLS
// ============================================================================

const getTopCoinsSchema = z.object({
  limit: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe("Number of coins to return (1-100, default 20)"),
  currency: z.string().default("usd").describe("Currency for prices"),
});

/**
 * Get top coins by market cap with full market data
 */
export const getTopCoins = tool({
  description:
    "Get top cryptocurrencies ranked by market cap with price, volume, and market data. Great for market overview.",
  inputSchema: getTopCoinsSchema,
  execute: async (input: z.infer<typeof getTopCoinsSchema>) => {
    try {
      const data = await fetchCoinGecko<
        Array<{
          id: string;
          symbol: string;
          name: string;
          current_price: number;
          market_cap: number;
          market_cap_rank: number;
          total_volume: number;
          price_change_percentage_24h: number;
          price_change_percentage_7d_in_currency?: number;
          circulating_supply: number;
          ath: number;
          ath_change_percentage: number;
        }>
      >(
        `/coins/markets?${new URLSearchParams({ vs_currency: input.currency, order: "market_cap_desc", per_page: String(input.limit), page: "1", sparkline: "false", price_change_percentage: "7d" })}`,
      );

      return {
        coins: data.map((c) => ({
          rank: c.market_cap_rank,
          name: c.name,
          symbol: c.symbol.toUpperCase(),
          id: c.id,
          price: c.current_price,
          market_cap: c.market_cap,
          volume_24h: c.total_volume,
          change_24h: c.price_change_percentage_24h
            ? Number(c.price_change_percentage_24h.toFixed(2))
            : null,
          change_7d: c.price_change_percentage_7d_in_currency
            ? Number(c.price_change_percentage_7d_in_currency.toFixed(2))
            : null,
          circulating_supply: Math.round(c.circulating_supply),
          ath: c.ath,
          ath_change_percent: Number(c.ath_change_percentage.toFixed(2)),
        })),
        currency: input.currency.toUpperCase(),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch top coins: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

const getCoinDetailsSchema = z.object({
  coin: z.string().describe("Coin ID or symbol (e.g., 'bitcoin', 'btc')"),
});

/**
 * Get detailed information about a specific coin
 */
export const getCoinDetails = tool({
  description:
    "Get comprehensive details about a cryptocurrency including description, links, social media, contract addresses, and development stats.",
  inputSchema: getCoinDetailsSchema,
  execute: async (input: z.infer<typeof getCoinDetailsSchema>) => {
    const coinId = resolveCoinId(input.coin);
    try {
      const data = await fetchCoinGecko<{
        id: string;
        symbol: string;
        name: string;
        description: { en: string };
        links: {
          homepage: string[];
          blockchain_site: string[];
          official_forum_url: string[];
          chat_url: string[];
          twitter_screen_name: string;
          telegram_channel_identifier: string;
          subreddit_url: string;
          repos_url: { github: string[]; bitbucket: string[] };
        };
        genesis_date: string;
        market_cap_rank: number;
        coingecko_rank: number;
        platforms: Record<string, string>;
        categories: string[];
        market_data?: {
          current_price: { usd: number };
          market_cap: { usd: number };
          total_volume: { usd: number };
          price_change_percentage_24h: number;
          price_change_percentage_7d: number;
          price_change_percentage_30d: number;
          ath: { usd: number };
          ath_date: { usd: string };
          atl: { usd: number };
          atl_date: { usd: string };
        };
        community_data?: {
          twitter_followers: number;
          telegram_channel_user_count: number;
          reddit_subscribers: number;
        };
      }>(
        `/coins/${encodeURIComponent(coinId)}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false`,
        CRYPTO_STATIC_CACHE_TTL,
      );

      return {
        id: data.id,
        name: data.name,
        symbol: data.symbol.toUpperCase(),
        description: data.description.en?.slice(0, 500) || null,
        market_cap_rank: data.market_cap_rank,
        categories: data.categories.slice(0, 5),
        genesis_date: data.genesis_date,
        links: {
          website: data.links.homepage.filter(Boolean)[0] || null,
          twitter: data.links.twitter_screen_name
            ? `https://twitter.com/${data.links.twitter_screen_name}`
            : null,
          telegram: data.links.telegram_channel_identifier
            ? `https://t.me/${data.links.telegram_channel_identifier}`
            : null,
          reddit: data.links.subreddit_url || null,
          github: data.links.repos_url?.github?.[0] || null,
        },
        contract_addresses: Object.entries(data.platforms || {})
          .filter(([, addr]) => addr)
          .slice(0, 5)
          .map(([platform, address]) => ({ platform, address })),
        market_data: data.market_data
          ? {
              price_usd: data.market_data.current_price.usd,
              market_cap_usd: data.market_data.market_cap.usd,
              volume_24h_usd: data.market_data.total_volume.usd,
              change_24h: data.market_data.price_change_percentage_24h,
              change_7d: data.market_data.price_change_percentage_7d,
              change_30d: data.market_data.price_change_percentage_30d,
              ath_usd: data.market_data.ath.usd,
              ath_date: data.market_data.ath_date.usd,
              atl_usd: data.market_data.atl.usd,
              atl_date: data.market_data.atl_date.usd,
            }
          : null,
        community: data.community_data
          ? {
              twitter_followers: data.community_data.twitter_followers,
              telegram_members: data.community_data.telegram_channel_user_count,
              reddit_subscribers: data.community_data.reddit_subscribers,
            }
          : null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch coin details: ${error instanceof Error ? error.message : "Unknown error"}`,
        coin: input.coin,
      };
    }
  },
});

const getCoinHistorySchema = z.object({
  coin: z.string().describe("Coin ID or symbol"),
  days: z
    .number()
    .min(1)
    .max(365)
    .default(30)
    .describe("Number of days of history (1-365)"),
  currency: z.string().default("usd").describe("Currency for prices"),
});

/**
 * Get historical price data for a coin
 */
export const getCoinHistory = tool({
  description:
    "Get historical price, market cap, and volume data for a cryptocurrency over a specified number of days. Returns data points for charting.",
  inputSchema: getCoinHistorySchema,
  execute: async (input: z.infer<typeof getCoinHistorySchema>) => {
    const coinId = resolveCoinId(input.coin);
    try {
      const data = await fetchCoinGecko<{
        prices: Array<[number, number]>;
        market_caps: Array<[number, number]>;
        total_volumes: Array<[number, number]>;
      }>(
        `/coins/${encodeURIComponent(coinId)}/market_chart?${new URLSearchParams({ vs_currency: input.currency, days: String(input.days) })}`,
      );

      // Sample data points to avoid overwhelming response
      const sampleRate = Math.max(1, Math.floor(data.prices.length / 30));
      const sampledPrices = data.prices.filter(
        (_, i) => i % sampleRate === 0 || i === data.prices.length - 1,
      );

      return {
        coin: coinId,
        currency: input.currency.toUpperCase(),
        days: input.days,
        data_points: sampledPrices.map((p, i) => ({
          date: new Date(p[0]).toISOString().split("T")[0],
          price: p[1],
          market_cap:
            data.market_caps[i * sampleRate]?.[1] ||
            data.market_caps[data.market_caps.length - 1]?.[1],
          volume:
            data.total_volumes[i * sampleRate]?.[1] ||
            data.total_volumes[data.total_volumes.length - 1]?.[1],
        })),
        price_start: data.prices[0]?.[1],
        price_end: data.prices[data.prices.length - 1]?.[1],
        price_change_percent:
          data.prices.length >= 2
            ? Number(
                (
                  ((data.prices[data.prices.length - 1][1] -
                    data.prices[0][1]) /
                    data.prices[0][1]) *
                  100
                ).toFixed(2),
              )
            : null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch history: ${error instanceof Error ? error.message : "Unknown error"}`,
        coin: input.coin,
      };
    }
  },
});

const getCoinOHLCSchema = z.object({
  coin: z.string().describe("Coin ID or symbol"),
  days: z
    .enum(["1", "7", "14", "30", "90", "180", "365"])
    .default("7")
    .describe("Number of days (1, 7, 14, 30, 90, 180, or 365)"),
  currency: z.string().default("usd").describe("Currency for prices"),
});

/**
 * Get OHLC (candlestick) data for a coin
 */
export const getCoinOHLC = tool({
  description:
    "Get OHLC (Open, High, Low, Close) candlestick data for a cryptocurrency. Useful for technical analysis and trading charts.",
  inputSchema: getCoinOHLCSchema,
  execute: async (input: z.infer<typeof getCoinOHLCSchema>) => {
    const coinId = resolveCoinId(input.coin);
    try {
      const data = await fetchCoinGecko<
        Array<[number, number, number, number, number]>
      >(
        `/coins/${encodeURIComponent(coinId)}/ohlc?${new URLSearchParams({ vs_currency: input.currency, days: input.days })}`,
      );

      return {
        coin: coinId,
        currency: input.currency.toUpperCase(),
        days: input.days,
        candles: data.slice(-30).map((c) => ({
          timestamp: new Date(c[0]).toISOString(),
          open: c[1],
          high: c[2],
          low: c[3],
          close: c[4],
        })),
        latest:
          data.length > 0
            ? {
                open: data[data.length - 1][1],
                high: data[data.length - 1][2],
                low: data[data.length - 1][3],
                close: data[data.length - 1][4],
              }
            : null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch OHLC: ${error instanceof Error ? error.message : "Unknown error"}`,
        coin: input.coin,
      };
    }
  },
});

// ============================================================================
// CATEGORIES TOOLS
// ============================================================================

/**
 * Get all coin categories with market data
 */
export const getCategories = tool({
  description:
    "Get cryptocurrency categories (DeFi, Layer 1, Gaming, Meme coins, etc.) with market cap and volume data. Great for sector analysis.",
  inputSchema: z.object({
    limit: z
      .number()
      .min(1)
      .max(50)
      .default(20)
      .describe("Number of categories to return"),
  }),
  execute: async (input) => {
    try {
      const data = await fetchCoinGecko<
        Array<{
          id: string;
          name: string;
          market_cap: number;
          market_cap_change_24h: number;
          volume_24h: number;
          top_3_coins: string[];
          updated_at: string;
        }>
      >("/coins/categories?order=market_cap_desc", CRYPTO_STATIC_CACHE_TTL);

      return {
        categories: data.slice(0, input.limit).map((c) => ({
          id: c.id,
          name: c.name,
          market_cap: c.market_cap ? Math.round(c.market_cap) : null,
          market_cap_change_24h: c.market_cap_change_24h
            ? Number(c.market_cap_change_24h.toFixed(2))
            : null,
          volume_24h: c.volume_24h ? Math.round(c.volume_24h) : null,
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// ============================================================================
// EXCHANGE TOOLS
// ============================================================================

/**
 * Get top exchanges by trading volume
 */
export const getExchanges = tool({
  description:
    "Get top cryptocurrency exchanges ranked by trading volume with trust score, country, and year established.",
  inputSchema: z.object({
    limit: z
      .number()
      .min(1)
      .max(50)
      .default(20)
      .describe("Number of exchanges to return"),
  }),
  execute: async (input) => {
    try {
      const data = await fetchCoinGecko<
        Array<{
          id: string;
          name: string;
          year_established: number | null;
          country: string | null;
          trust_score: number;
          trust_score_rank: number;
          trade_volume_24h_btc: number;
          trade_volume_24h_btc_normalized: number;
          url: string;
        }>
      >(
        `/exchanges?${new URLSearchParams({ per_page: String(input.limit) })}`,
        CRYPTO_STATIC_CACHE_TTL,
      );

      return {
        exchanges: data.map((e) => ({
          rank: e.trust_score_rank,
          id: e.id,
          name: e.name,
          trust_score: e.trust_score,
          volume_24h_btc: Math.round(e.trade_volume_24h_btc),
          country: e.country,
          year_established: e.year_established,
          url: e.url,
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch exchanges: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

/**
 * Get BTC exchange rates to other currencies
 */
export const getExchangeRates = tool({
  description:
    "Get Bitcoin exchange rates to 60+ fiat and crypto currencies. Useful for currency conversions.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const data = await fetchCoinGecko<{
        rates: Record<
          string,
          {
            name: string;
            unit: string;
            value: number;
            type: string;
          }
        >;
      }>("/exchange_rates", CRYPTO_STATIC_CACHE_TTL);

      // Return most common currencies
      const commonCurrencies = [
        "usd",
        "eur",
        "gbp",
        "jpy",
        "cny",
        "aud",
        "cad",
        "chf",
        "eth",
        "ltc",
        "xrp",
        "sol",
      ];
      const rates: Record<
        string,
        { name: string; rate: number; type: string }
      > = {};

      for (const [key, value] of Object.entries(data.rates)) {
        if (commonCurrencies.includes(key)) {
          rates[key.toUpperCase()] = {
            name: value.name,
            rate: value.value,
            type: value.type,
          };
        }
      }

      return {
        base: "BTC",
        rates,
        total_currencies: Object.keys(data.rates).length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch exchange rates: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

// ============================================================================
// ONCHAIN DEX TOOLS (GeckoTerminal)
// ============================================================================

/**
 * Get trending pools across all networks
 */
export const getTrendingPools = tool({
  description:
    "Get trending liquidity pools across all blockchain networks. Shows hot trading pairs with volume and price changes.",
  inputSchema: z.object({
    network: z
      .string()
      .optional()
      .describe(
        "Optional: specific network (solana, eth, base, arbitrum, polygon, bsc)",
      ),
  }),
  execute: async (input) => {
    try {
      const endpoint = input.network
        ? `/networks/${encodeURIComponent(resolveNetwork(input.network))}/trending_pools`
        : "/networks/trending_pools";

      const data = await fetchGeckoTerminal<{
        data: Array<{
          id: string;
          attributes: {
            name: string;
            address: string;
            base_token_price_usd: string;
            quote_token_price_usd: string;
            fdv_usd: string;
            market_cap_usd: string | null;
            price_change_percentage: {
              h1: string;
              h24: string;
            };
            transactions: {
              h24: { buys: number; sells: number };
            };
            volume_usd: {
              h24: string;
            };
            reserve_in_usd: string;
          };
          relationships: {
            base_token: { data: { id: string } };
            quote_token: { data: { id: string } };
            dex: { data: { id: string } };
          };
        }>;
      }>(endpoint);

      return {
        network: input.network || "all",
        pools: data.data.slice(0, 15).map((p) => ({
          name: p.attributes.name,
          address: p.attributes.address,
          dex: p.relationships.dex.data.id.split("_").pop(),
          price_usd: parseFloat(p.attributes.base_token_price_usd),
          fdv_usd: p.attributes.fdv_usd
            ? Math.round(parseFloat(p.attributes.fdv_usd))
            : null,
          change_1h: p.attributes.price_change_percentage.h1
            ? Number(
                parseFloat(p.attributes.price_change_percentage.h1).toFixed(2),
              )
            : null,
          change_24h: p.attributes.price_change_percentage.h24
            ? Number(
                parseFloat(p.attributes.price_change_percentage.h24).toFixed(2),
              )
            : null,
          volume_24h: Math.round(parseFloat(p.attributes.volume_usd.h24)),
          liquidity_usd: Math.round(parseFloat(p.attributes.reserve_in_usd)),
          trades_24h:
            p.attributes.transactions.h24.buys +
            p.attributes.transactions.h24.sells,
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch trending pools: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

/**
 * Get newly created pools
 */
export const getNewPools = tool({
  description:
    "Get the most recently created liquidity pools across all networks or on a specific network. Great for finding new token launches.",
  inputSchema: z.object({
    network: z
      .string()
      .optional()
      .describe("Optional: specific network (solana, eth, base, etc.)"),
  }),
  execute: async (input) => {
    try {
      const endpoint = input.network
        ? `/networks/${encodeURIComponent(resolveNetwork(input.network))}/new_pools`
        : "/networks/new_pools";

      const data = await fetchGeckoTerminal<{
        data: Array<{
          id: string;
          attributes: {
            name: string;
            address: string;
            pool_created_at: string;
            base_token_price_usd: string;
            fdv_usd: string;
            price_change_percentage: {
              h1: string;
              h24: string;
            };
            volume_usd: {
              h24: string;
            };
            reserve_in_usd: string;
          };
          relationships: {
            dex: { data: { id: string } };
          };
        }>;
      }>(endpoint);

      return {
        network: input.network || "all",
        pools: data.data.slice(0, 15).map((p) => ({
          name: p.attributes.name,
          address: p.attributes.address,
          created_at: p.attributes.pool_created_at,
          dex: p.relationships.dex.data.id.split("_").pop(),
          price_usd: p.attributes.base_token_price_usd
            ? parseFloat(p.attributes.base_token_price_usd)
            : null,
          fdv_usd: p.attributes.fdv_usd
            ? Math.round(parseFloat(p.attributes.fdv_usd))
            : null,
          change_1h: p.attributes.price_change_percentage?.h1
            ? Number(
                parseFloat(p.attributes.price_change_percentage.h1).toFixed(2),
              )
            : null,
          change_24h: p.attributes.price_change_percentage?.h24
            ? Number(
                parseFloat(p.attributes.price_change_percentage.h24).toFixed(2),
              )
            : null,
          volume_24h: p.attributes.volume_usd?.h24
            ? Math.round(parseFloat(p.attributes.volume_usd.h24))
            : null,
          liquidity_usd: Math.round(parseFloat(p.attributes.reserve_in_usd)),
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch new pools: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});

const getTokenByContractSchema = z.object({
  network: z
    .string()
    .describe("Network (solana, eth, base, arbitrum, polygon, bsc, avax)"),
  address: z.string().describe("Token contract address"),
});

/**
 * Get token info by contract address
 */
export const getTokenByContract = tool({
  description:
    "Look up a token by its contract address on a specific network. Returns price, volume, liquidity, and trading data.",
  inputSchema: getTokenByContractSchema,
  execute: async (input: z.infer<typeof getTokenByContractSchema>) => {
    const network = resolveNetwork(input.network);
    try {
      const data = await fetchGeckoTerminal<{
        data: {
          id: string;
          attributes: {
            name: string;
            symbol: string;
            address: string;
            decimals: number;
            coingecko_coin_id: string | null;
            price_usd: string;
            fdv_usd: string;
            total_reserve_in_usd: string;
            volume_usd: {
              h24: string;
            };
            market_cap_usd: string | null;
          };
        };
      }>(
        `/networks/${encodeURIComponent(network)}/tokens/${encodeURIComponent(input.address)}`,
      );

      const t = data.data.attributes;
      return {
        name: t.name,
        symbol: t.symbol,
        address: t.address,
        network: network,
        decimals: t.decimals,
        coingecko_id: t.coingecko_coin_id,
        price_usd: t.price_usd ? parseFloat(t.price_usd) : null,
        fdv_usd: t.fdv_usd ? Math.round(parseFloat(t.fdv_usd)) : null,
        market_cap_usd: t.market_cap_usd
          ? Math.round(parseFloat(t.market_cap_usd))
          : null,
        volume_24h_usd: t.volume_usd?.h24
          ? Math.round(parseFloat(t.volume_usd.h24))
          : null,
        total_liquidity_usd: t.total_reserve_in_usd
          ? Math.round(parseFloat(t.total_reserve_in_usd))
          : null,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch token: ${error instanceof Error ? error.message : "Unknown error"}`,
        address: input.address,
        network: input.network,
      };
    }
  },
});

const searchPoolsSchema = z.object({
  query: z.string().describe("Search query (token name, symbol, or address)"),
  network: z
    .string()
    .optional()
    .describe("Optional: filter by network (solana, eth, base, etc.)"),
});

/**
 * Search for liquidity pools
 */
export const searchPools = tool({
  description:
    "Search for liquidity pools by token name, symbol, or address. Returns matching pools with price and volume data.",
  inputSchema: searchPoolsSchema,
  execute: async (input: z.infer<typeof searchPoolsSchema>) => {
    try {
      let endpoint = `/search/pools?query=${encodeURIComponent(input.query)}`;
      if (input.network) {
        endpoint += `&network=${encodeURIComponent(resolveNetwork(input.network))}`;
      }

      const data = await fetchGeckoTerminal<{
        data: Array<{
          id: string;
          attributes: {
            name: string;
            address: string;
            base_token_price_usd: string;
            fdv_usd: string;
            price_change_percentage: {
              h24: string;
            };
            volume_usd: {
              h24: string;
            };
            reserve_in_usd: string;
          };
          relationships: {
            dex: { data: { id: string } };
            network: { data: { id: string } };
          };
        }>;
      }>(endpoint);

      return {
        query: input.query,
        network: input.network || "all",
        pools: data.data.slice(0, 15).map((p) => ({
          name: p.attributes.name,
          address: p.attributes.address,
          network: p.relationships.network.data.id,
          dex: p.relationships.dex.data.id.split("_").pop(),
          price_usd: p.attributes.base_token_price_usd
            ? parseFloat(p.attributes.base_token_price_usd)
            : null,
          fdv_usd: p.attributes.fdv_usd
            ? Math.round(parseFloat(p.attributes.fdv_usd))
            : null,
          change_24h: p.attributes.price_change_percentage?.h24
            ? Number(
                parseFloat(p.attributes.price_change_percentage.h24).toFixed(2),
              )
            : null,
          volume_24h: p.attributes.volume_usd?.h24
            ? Math.round(parseFloat(p.attributes.volume_usd.h24))
            : null,
          liquidity_usd: Math.round(parseFloat(p.attributes.reserve_in_usd)),
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        query: input.query,
      };
    }
  },
});

const getPoolTradesSchema = z.object({
  network: z.string().describe("Network (solana, eth, base, etc.)"),
  poolAddress: z.string().describe("Pool contract address"),
});

/**
 * Get recent trades for a pool
 */
export const getPoolTrades = tool({
  description:
    "Get the most recent trades (last 300 in 24h) for a specific liquidity pool. Shows buy/sell activity with amounts and prices.",
  inputSchema: getPoolTradesSchema,
  execute: async (input: z.infer<typeof getPoolTradesSchema>) => {
    const network = resolveNetwork(input.network);
    try {
      const data = await fetchGeckoTerminal<{
        data: Array<{
          id: string;
          attributes: {
            block_number: number;
            block_timestamp: string;
            tx_hash: string;
            kind: string;
            volume_in_usd: string;
            from_token_amount: string;
            to_token_amount: string;
            price_from_in_usd: string;
            price_to_in_usd: string;
          };
        }>;
      }>(
        `/networks/${encodeURIComponent(network)}/pools/${encodeURIComponent(input.poolAddress)}/trades`,
      );

      return {
        network: network,
        pool: input.poolAddress,
        trades: data.data.slice(0, 20).map((t) => ({
          type: t.attributes.kind,
          timestamp: t.attributes.block_timestamp,
          volume_usd: parseFloat(t.attributes.volume_in_usd),
          from_amount: parseFloat(t.attributes.from_token_amount),
          to_amount: parseFloat(t.attributes.to_token_amount),
          tx_hash: t.attributes.tx_hash,
        })),
        total_trades: data.data.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: `Failed to fetch trades: ${error instanceof Error ? error.message : "Unknown error"}`,
        pool: input.poolAddress,
      };
    }
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * All crypto tools bundled together
 */
export const cryptoTools = {
  // Price tools
  getCryptoPrice,
  getMultipleCryptoPrices,
  // Trending & search
  getTrendingCoins,
  searchCrypto,
  // Global market data
  getGlobalMarketData,
  getDeFiGlobalData,
  // Coin details & history
  getTopCoins,
  getCoinDetails,
  getCoinHistory,
  getCoinOHLC,
  // Categories
  getCategories,
  // Exchanges
  getExchanges,
  getExchangeRates,
  // Onchain DEX (GeckoTerminal)
  getTrendingPools,
  getNewPools,
  getTokenByContract,
  searchPools,
  getPoolTrades,
};
