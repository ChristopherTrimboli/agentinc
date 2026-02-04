/**
 * Web Search Tool
 * Uses Anthropic's provider-defined web search tool
 */

import { anthropic } from "@ai-sdk/anthropic";
import type { Tool } from "ai";

/**
 * Configuration for web search tool
 */
export interface WebSearchConfig {
  maxUses?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  userLocation?: {
    type: "approximate";
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
}

/**
 * Create a web search tool with configuration
 */
export function createWebSearchTool(
  config: WebSearchConfig = {},
): ReturnType<typeof anthropic.tools.webSearch_20250305> {
  const { maxUses = 5, allowedDomains, blockedDomains, userLocation } = config;

  return anthropic.tools.webSearch_20250305({
    maxUses,
    ...(allowedDomains && { allowedDomains }),
    ...(blockedDomains && { blockedDomains }),
    ...(userLocation && { userLocation }),
  });
}

/**
 * Export web search tools for use in AI SDK
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const webSearchTools: Record<string, Tool<any, any>> = {
  web_search: createWebSearchTool(),
};
