/**
 * AI Gateway Pricing Service
 *
 * Uses Vercel AI Gateway's model discovery to get pricing,
 * then calculates costs from token usage returned by AI SDK.
 *
 * This is simpler than calling a separate API - we just:
 * 1. Get model pricing via gateway.getAvailableModels()
 * 2. Calculate: (inputTokens * inputPrice) + (outputTokens * outputPrice)
 */

import { gateway } from "@ai-sdk/gateway";

/**
 * Model pricing information
 */
export interface ModelPricing {
  /** Model ID (e.g., "anthropic/claude-sonnet-4-20250514") */
  modelId: string;
  /** Cost per input token in USD */
  inputCostPerToken: number;
  /** Cost per output token in USD */
  outputCostPerToken: number;
  /** Cost per cached input token (if available) */
  cachedInputCostPerToken?: number;
}

/**
 * Token usage from AI SDK
 */
export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
}

/**
 * Calculated cost result
 */
export interface CalculatedCost {
  /** Total cost in USD */
  totalCost: number;
  /** Input token cost */
  inputCost: number;
  /** Output token cost */
  outputCost: number;
  /** Cached token cost (if applicable) */
  cachedCost: number;
  /** Model ID used */
  modelId: string;
}

// Cache for model pricing (refreshes every 1 hour)
let pricingCache: Map<string, ModelPricing> = new Map();
let pricingCacheTimestamp: number = 0;
const PRICING_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetch and cache model pricing from AI Gateway.
 * Uses gateway.getAvailableModels() which doesn't require an API key.
 */
export async function refreshPricingCache(): Promise<void> {
  try {
    const { models } = await gateway.getAvailableModels();

    const newCache = new Map<string, ModelPricing>();

    for (const model of models) {
      if (model.pricing) {
        newCache.set(model.id, {
          modelId: model.id,
          inputCostPerToken: Number(model.pricing.input) || 0,
          outputCostPerToken: Number(model.pricing.output) || 0,
          cachedInputCostPerToken: model.pricing.cachedInputTokens
            ? Number(model.pricing.cachedInputTokens)
            : undefined,
        });
      }
    }

    pricingCache = newCache;
    pricingCacheTimestamp = Date.now();
  } catch {
    // Failed to fetch pricing - will use cached values or return null
  }
}

/**
 * Normalize a model ID for matching.
 * Handles common variations like dashes vs dots in version numbers.
 */
function normalizeModelId(modelId: string): string {
  return (
    modelId
      .toLowerCase()
      // Convert version separators: 4-5 -> 4.5, 4_5 -> 4.5
      .replace(/(\d)[-_](\d)/g, "$1.$2")
      // Remove date suffixes like -20250514
      .replace(/-\d{8}$/, "")
  );
}

/**
 * Get pricing for a specific model.
 *
 * @param modelId - The model ID (e.g., "anthropic/claude-haiku-4.5")
 * @returns Model pricing or null if not found
 */
export async function getModelPricing(
  modelId: string,
): Promise<ModelPricing | null> {
  // Refresh cache if expired or empty
  if (
    pricingCache.size === 0 ||
    Date.now() - pricingCacheTimestamp > PRICING_CACHE_TTL
  ) {
    await refreshPricingCache();
  }

  // Try exact match first
  if (pricingCache.has(modelId)) {
    return pricingCache.get(modelId)!;
  }

  // Try with common prefixes (in case model ID doesn't include provider)
  const prefixes = ["anthropic/", "openai/", "google/", ""];
  for (const prefix of prefixes) {
    const fullId = prefix + modelId;
    if (pricingCache.has(fullId)) {
      return pricingCache.get(fullId)!;
    }
  }

  // Try normalized matching (handles version format differences)
  const normalizedInput = normalizeModelId(modelId);
  for (const [cachedId, pricing] of pricingCache.entries()) {
    if (normalizeModelId(cachedId) === normalizedInput) {
      return pricing;
    }
  }

  // Try partial match on model name (e.g., "claude-haiku-4.5" matches "anthropic/claude-haiku-4.5-...")
  const inputModelName = modelId.split("/").pop() || modelId;
  const normalizedName = normalizeModelId(inputModelName);
  for (const [cachedId, pricing] of pricingCache.entries()) {
    const cachedName = cachedId.split("/").pop() || cachedId;
    if (normalizeModelId(cachedName).startsWith(normalizedName)) {
      return pricing;
    }
  }

  return null;
}

/**
 * Calculate the cost of a generation from token usage.
 *
 * @param modelId - The model ID used for generation
 * @param usage - Token usage from AI SDK (inputTokens, outputTokens, etc.)
 * @returns Calculated cost or null if pricing not available
 */
export async function calculateCost(
  modelId: string,
  usage: TokenUsage,
): Promise<CalculatedCost | null> {
  const pricing = await getModelPricing(modelId);

  if (!pricing) {
    return null;
  }

  const inputTokens = usage.inputTokens || 0;
  const outputTokens = usage.outputTokens || 0;
  const cachedTokens = usage.cachedInputTokens || 0;

  const inputCost = inputTokens * pricing.inputCostPerToken;
  const outputCost = outputTokens * pricing.outputCostPerToken;
  const cachedCost = cachedTokens * (pricing.cachedInputCostPerToken || 0);

  return {
    totalCost: inputCost + outputCost + cachedCost,
    inputCost,
    outputCost,
    cachedCost,
    modelId,
  };
}

/**
 * Check if usage-based billing via AI Gateway is available.
 * This only requires the gateway SDK, no API key needed.
 */
export function isAIGatewayBillingEnabled(): boolean {
  // AI Gateway pricing is always available when using the gateway SDK
  return true;
}
