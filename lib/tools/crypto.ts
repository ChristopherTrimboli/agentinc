import { tool } from "ai";
import { z } from "zod";

/**
 * Crypto price tools using CoinGecko's free API (no API key required)
 * Rate limit: ~10-30 calls/minute on free tier
 */

const COINGECKO_API = "https://api.coingecko.com/api/v3";

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

function resolveCoinId(input: string): string {
  const normalized = input.toLowerCase().trim();
  return COIN_ALIASES[normalized] || normalized;
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
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        if (response.status === 429) {
          return {
            error: "Rate limit exceeded. Please try again in a minute.",
            coin: input.coin,
          };
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

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
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=${coinIds}&vs_currencies=${currency}&include_24hr_change=true`,
        {
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        if (response.status === 429) {
          return {
            error: "Rate limit exceeded. Please try again in a minute.",
          };
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

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

/**
 * All crypto tools bundled together
 */
export const cryptoTools = {
  getCryptoPrice,
  getMultipleCryptoPrices,
};
