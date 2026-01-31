/**
 * Agent Tools
 * 
 * Simple utility tools that work with any AI model.
 * For complex integrations requiring API keys, use skills instead (lib/skills/).
 * 
 * Usage:
 * ```typescript
 * import { weatherTools, getAllTools } from "@/lib/tools";
 * import { streamText } from "ai";
 * 
 * // Use specific tools
 * const result = streamText({
 *   model: "anthropic/claude-haiku-4-5",
 *   tools: weatherTools,
 *   messages,
 * });
 * 
 * // Or get all available tools
 * const result = streamText({
 *   model: "anthropic/claude-haiku-4-5", 
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

/**
 * Get all available tools as a single object
 * Tools are simple utilities that work with any model
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAllTools(): Record<string, Tool<any, any>> {
  // Import tools dynamically to avoid circular deps
  const { weatherTools } = require("./weather");
  
  return {
    ...weatherTools,
    // Add more tool modules here as they're created
  };
}

/**
 * List of all available tool names
 */
export const AVAILABLE_TOOLS = ["getWeather", "getForecast"] as const;

export type AvailableTool = (typeof AVAILABLE_TOOLS)[number];
