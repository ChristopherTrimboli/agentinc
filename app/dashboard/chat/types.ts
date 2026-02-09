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

import {
  formatPrice as formatPriceUtil,
  formatMarketCap as formatMarketCapUtil,
} from "@/lib/utils/formatting";

// Use centralized formatting utilities
export const formatPrice = formatPriceUtil;
export const formatMarketCap = formatMarketCapUtil;

export interface GeneratedImageResult {
  success: boolean;
  image: { url: string; mediaType: string };
  prompt: string;
  enhancedPrompt?: string;
}
