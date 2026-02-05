/**
 * Shared types and constants for the chat page components.
 */

export interface AgentInfo {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  personality: string | null;
  rarity: string | null;
  tokenSymbol: string | null;
  tokenMint: string | null;
}

export interface PriceData {
  price: number;
  priceChange24h?: number;
  marketCap?: number;
}

export interface ApiKeyConfigInfo {
  label: string;
  helpText?: string;
  helpUrl?: string;
  placeholder?: string;
}

export interface ToolGroupInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "AI" | "CRYPTO" | "UTILITIES" | "SOCIAL";
  logoUrl?: string;
  source?: string;
  requiresAuth?: boolean;
  functions: { id: string; name: string; description: string }[];
}

export interface SkillInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  isConfigured?: boolean;
  requiresApiKey?: boolean;
  apiKeyConfig?: ApiKeyConfigInfo;
}

// Storage key for user API keys
export const API_KEYS_STORAGE_KEY = "agentinc_skill_api_keys";

// Quick suggestions - defined outside component to prevent recreation
export const QUICK_SUGGESTIONS = [
  "Tell me about yourself",
  "What can you do?",
  "Hi!",
];

// Helper to get stored API keys
export function getStoredApiKeys(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(API_KEYS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Helper to save API key
export function saveApiKey(skillId: string, apiKey: string) {
  if (typeof window === "undefined") return;
  try {
    const keys = getStoredApiKeys();
    if (apiKey) {
      keys[skillId] = apiKey;
    } else {
      delete keys[skillId];
    }
    localStorage.setItem(API_KEYS_STORAGE_KEY, JSON.stringify(keys));
  } catch (e) {
    console.error("Failed to save API key:", e);
  }
}

// Format price for display - compact format for small prices
export function formatPrice(price: number): string {
  if (price >= 100) {
    return `$${price.toFixed(0)}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else if (price >= 0.01) {
    return `$${price.toFixed(3)}`;
  } else if (price >= 0.0001) {
    return `$${price.toFixed(5)}`;
  } else {
    // For very small prices, show significant digits with zero count
    // e.g., 0.00000274 -> "$0.0{5}27"
    const str = price.toFixed(12);
    const match = str.match(/^0\.(0*)([1-9]\d{0,1})/);
    if (match) {
      const zeroCount = match[1].length;
      const significantDigits = match[2];
      if (zeroCount > 2) {
        return `$0.0{${zeroCount}}${significantDigits}`;
      }
    }
    return `$${price.toFixed(6)}`;
  }
}

// Format market cap for display
export function formatMarketCap(mc: number): string {
  if (mc >= 1_000_000) {
    return `$${(mc / 1_000_000).toFixed(2)}M`;
  } else if (mc >= 1_000) {
    return `$${(mc / 1_000).toFixed(1)}K`;
  }
  return `$${mc.toFixed(0)}`;
}

export interface GeneratedImageResult {
  success: boolean;
  image: { url: string; mediaType: string };
  prompt: string;
  enhancedPrompt?: string;
}
