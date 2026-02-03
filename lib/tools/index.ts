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
export { getCryptoPrice, getMultipleCryptoPrices, cryptoTools } from "./crypto";
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
  // Crypto Tools
  {
    id: "crypto",
    name: "CoinGecko",
    description: "Real-time cryptocurrency prices",
    icon: "💰",
    source: "Crypto",
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
    crypto: () => require("./crypto").cryptoTools,
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
