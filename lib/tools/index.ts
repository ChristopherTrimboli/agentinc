/**
 * Agent Tools
 *
 * Simple utility tools that work with any AI model.
 * For complex integrations requiring API keys, use skills instead (lib/skills/).
 *
 * Usage:
 * ```typescript
 * import { weatherTools, cryptoTools, getAllTools } from "@/lib/tools";
 * import { streamText } from "ai";
 *
 * // Use specific tools (string format uses AI Gateway with AI_GATEWAY_API_KEY)
 * const result = streamText({
 *   model: "anthropic/claude-3-5-haiku",
 *   tools: { ...weatherTools, ...cryptoTools },
 *   messages,
 * });
 *
 * // Or get all available tools
 * const result = streamText({
 *   model: "anthropic/claude-3-5-haiku",
 *   tools: getAllTools(),
 *   messages,
 * });
 * ```
 */

import type { Tool } from "ai";

// Export types
export * from "./types";

// Export individual tool modules
export { getWeather, getForecast, weatherTools } from "./weather";
export {
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
  // All tools
  cryptoTools,
} from "./crypto";
export {
  geolocateIP,
  batchGeolocateIPs,
  geolocationTools,
} from "./geolocation";
export { getWikiSummary, searchWikipedia, wikipediaTools } from "./wikipedia";
export {
  getCurrentTime,
  convertTimezone,
  dateDiff,
  addToDate,
  formatDate,
  datetimeTools,
} from "./datetime";
export { generateImageTool, imageGenerationTools } from "./imageGeneration";

/**
 * Tool function metadata
 */
export interface ToolFunction {
  id: string;
  name: string;
  description: string;
}

/**
 * Tool group - a collection of related tool functions
 */
export interface ToolGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
  logoUrl?: string; // URL to actual logo image from the web
  source?: string; // e.g., "CoinGecko", "Wikipedia", etc.
  functions: ToolFunction[];
}

/**
 * Tool groups for organized UI display
 */
export const TOOL_GROUPS: ToolGroup[] = [
  // AI Tools
  {
    id: "imageGeneration",
    name: "Image Gen",
    description: "Generate images from text descriptions",
    icon: "🎨",
    source: "AI",
    functions: [
      {
        id: "generateImage",
        name: "Generate Image",
        description: "Create an image from a text prompt",
      },
    ],
  },
  // Crypto Price Tools
  {
    id: "crypto",
    name: "Crypto Prices",
    description: "Real-time cryptocurrency prices and market data",
    icon: "💰",
    logoUrl:
      "https://static.coingecko.com/s/thumbnail-007177f3eca19695592f0b8b0eabbdae282b54154e1be912285c9034ea6cbaf2.png",
    source: "CoinGecko",
    functions: [
      {
        id: "getCryptoPrice",
        name: "Get Price",
        description: "Get price and 24h change for a coin",
      },
      {
        id: "getMultipleCryptoPrices",
        name: "Multiple Prices",
        description: "Get prices for multiple coins at once",
      },
      {
        id: "getTopCoins",
        name: "Top Coins",
        description: "Top coins ranked by market cap",
      },
      {
        id: "getCoinDetails",
        name: "Coin Details",
        description: "Full details, links, and socials for a coin",
      },
      {
        id: "getCoinHistory",
        name: "Price History",
        description: "Historical price data for charting",
      },
      {
        id: "getCoinOHLC",
        name: "OHLC Data",
        description: "Candlestick data for technical analysis",
      },
    ],
  },
  // Trending & Search
  {
    id: "cryptoTrending",
    name: "Trending & Search",
    description: "Discover trending coins and search crypto",
    icon: "🔥",
    logoUrl:
      "https://static.coingecko.com/s/thumbnail-007177f3eca19695592f0b8b0eabbdae282b54154e1be912285c9034ea6cbaf2.png",
    source: "CoinGecko",
    functions: [
      {
        id: "getTrendingCoins",
        name: "Trending Coins",
        description: "What's hot in the last 24 hours",
      },
      {
        id: "searchCrypto",
        name: "Search",
        description: "Search coins, exchanges, categories",
      },
      {
        id: "getCategories",
        name: "Categories",
        description: "DeFi, Gaming, Layer 1, Meme coins, etc.",
      },
    ],
  },
  // Global Market Data
  {
    id: "cryptoGlobal",
    name: "Market Overview",
    description: "Global crypto market statistics",
    icon: "🌍",
    logoUrl:
      "https://static.coingecko.com/s/thumbnail-007177f3eca19695592f0b8b0eabbdae282b54154e1be912285c9034ea6cbaf2.png",
    source: "CoinGecko",
    functions: [
      {
        id: "getGlobalMarketData",
        name: "Global Data",
        description: "Total market cap, BTC dominance, etc.",
      },
      {
        id: "getDeFiGlobalData",
        name: "DeFi Data",
        description: "DeFi market cap and volume",
      },
      {
        id: "getExchanges",
        name: "Exchanges",
        description: "Top exchanges by volume",
      },
      {
        id: "getExchangeRates",
        name: "Exchange Rates",
        description: "BTC rates to 60+ currencies",
      },
    ],
  },
  // Onchain DEX Tools
  {
    id: "onchainDEX",
    name: "Onchain DEX",
    description: "DEX pools, trades, and token data",
    icon: "⛓️",
    logoUrl: "https://www.geckoterminal.com/favicon.ico",
    source: "GeckoTerminal",
    functions: [
      {
        id: "getTrendingPools",
        name: "Trending Pools",
        description: "Hot liquidity pools across chains",
      },
      {
        id: "getNewPools",
        name: "New Pools",
        description: "Recently created pools & launches",
      },
      {
        id: "getTokenByContract",
        name: "Token Lookup",
        description: "Look up token by contract address",
      },
      {
        id: "searchPools",
        name: "Search Pools",
        description: "Find pools by token name or address",
      },
      {
        id: "getPoolTrades",
        name: "Pool Trades",
        description: "Recent trades for a pool",
      },
    ],
  },
  // Utility Tools
  {
    id: "weather",
    name: "Weather",
    description: "Current conditions and forecasts",
    icon: "🌤️",
    functions: [
      {
        id: "getWeather",
        name: "Current Weather",
        description: "Get current weather for a location",
      },
      {
        id: "getForecast",
        name: "Forecast",
        description: "Get weather forecast for upcoming days",
      },
    ],
  },
  {
    id: "geolocation",
    name: "IP Geolocation",
    description: "Geographic location from IP addresses",
    icon: "📍",
    logoUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
    functions: [
      {
        id: "geolocateIP",
        name: "Locate IP",
        description: "Get location for an IP address",
      },
      {
        id: "batchGeolocateIPs",
        name: "Batch Locate",
        description: "Geolocate multiple IPs at once",
      },
    ],
  },
  {
    id: "wikipedia",
    name: "Wikipedia",
    description: "Encyclopedia articles and search",
    icon: "📚",
    logoUrl: "https://en.wikipedia.org/static/apple-touch/wikipedia.png",
    functions: [
      {
        id: "getWikiSummary",
        name: "Get Summary",
        description: "Get a summary of an article",
      },
      {
        id: "searchWikipedia",
        name: "Search",
        description: "Search for articles",
      },
    ],
  },
  {
    id: "datetime",
    name: "Date & Time",
    description: "Timezones, calculations, formatting",
    icon: "🕐",
    functions: [
      {
        id: "getCurrentTime",
        name: "Current Time",
        description: "Get time in any timezone",
      },
      {
        id: "convertTimezone",
        name: "Convert Timezone",
        description: "Convert between timezones",
      },
      {
        id: "dateDiff",
        name: "Date Difference",
        description: "Calculate difference between dates",
      },
      {
        id: "addToDate",
        name: "Add/Subtract",
        description: "Add or subtract time from a date",
      },
      {
        id: "formatDate",
        name: "Format",
        description: "Format dates for different locales",
      },
    ],
  },
];

/**
 * Get all available tools as a single object
 * Tools are simple utilities that work with any model
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAllTools(): Record<string, Tool<any, any>> {
  // Import tools dynamically to avoid circular deps
  const { weatherTools } = require("./weather");
  const { cryptoTools } = require("./crypto");
  const { geolocationTools } = require("./geolocation");
  const { wikipediaTools } = require("./wikipedia");
  const { datetimeTools } = require("./datetime");
  const { imageGenerationTools } = require("./imageGeneration");

  return {
    ...weatherTools,
    ...cryptoTools,
    ...geolocationTools,
    ...wikipediaTools,
    ...datetimeTools,
    ...imageGenerationTools,
  };
}

/**
 * Get tools for specific groups
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getToolsForGroups(
  groupIds: string[],
): Record<string, Tool<any, any>> {
  const toolModules: Record<
    string,
    () => Record<string, Tool<unknown, unknown>>
  > = {
    weather: () => require("./weather").weatherTools,
    // All crypto-related groups use the same cryptoTools (they're all in one file)
    crypto: () => require("./crypto").cryptoTools,
    cryptoTrending: () => require("./crypto").cryptoTools,
    cryptoGlobal: () => require("./crypto").cryptoTools,
    onchainDEX: () => require("./crypto").cryptoTools,
    geolocation: () => require("./geolocation").geolocationTools,
    wikipedia: () => require("./wikipedia").wikipediaTools,
    datetime: () => require("./datetime").datetimeTools,
    imageGeneration: () => require("./imageGeneration").imageGenerationTools,
  };

  const result: Record<string, Tool<unknown, unknown>> = {};
  for (const groupId of groupIds) {
    const getTools = toolModules[groupId];
    if (getTools) {
      Object.assign(result, getTools());
    }
  }
  return result;
}

/**
 * List of all available tool function IDs (flat list for backend use)
 */
export const AVAILABLE_TOOLS = TOOL_GROUPS.flatMap((g) =>
  g.functions.map((f) => f.id),
);

export type AvailableTool = string;
