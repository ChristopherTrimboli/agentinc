/**
 * AI Gateway Pricing Service
 *
 * Uses Vercel AI Gateway's model discovery to get pricing,
 * then calculates costs from token usage returned by AI SDK.
 *
 * Pricing data is cached in Redis (shared across instances, 1-hour TTL)
 * with an in-memory L1 cache for ultra-fast reads within the same process.
 */

import { gateway } from "@ai-sdk/gateway";
import { isRedisConfigured, getRedis } from "@/lib/redis";

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

// ── Cache layer ─────────────────────────────────────────────────────────

const REDIS_CACHE_KEY = "ai:model:pricing";
const REDIS_CACHE_TTL = 3600; // 1 hour
const MEMORY_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// In-memory L1 cache (fast reads within the same process)
let memoryPricingCache: Map<string, ModelPricing> = new Map();
let memoryCacheTimestamp = 0;

function isMemoryCacheValid(): boolean {
  return (
    memoryPricingCache.size > 0 &&
    Date.now() - memoryCacheTimestamp < MEMORY_CACHE_TTL
  );
}

/**
 * Load pricing from Redis into memory cache.
 */
async function loadFromRedis(): Promise<boolean> {
  if (!isRedisConfigured()) return false;

  try {
    const redis = getRedis();
    const cached =
      await redis.get<Record<string, ModelPricing>>(REDIS_CACHE_KEY);
    if (cached && Object.keys(cached).length > 0) {
      memoryPricingCache = new Map(Object.entries(cached));
      memoryCacheTimestamp = Date.now();
      return true;
    }
  } catch {
    // Fall through
  }
  return false;
}

/**
 * Save pricing to Redis for cross-instance sharing.
 */
async function saveToRedis(pricing: Map<string, ModelPricing>): Promise<void> {
  if (!isRedisConfigured()) return;

  try {
    const redis = getRedis();
    const obj = Object.fromEntries(pricing);
    await redis.set(REDIS_CACHE_KEY, obj, { ex: REDIS_CACHE_TTL });
  } catch {
    // Non-critical
  }
}

/**
 * Fetch and cache model pricing from AI Gateway.
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

    memoryPricingCache = newCache;
    memoryCacheTimestamp = Date.now();

    // Persist to Redis for other instances
    await saveToRedis(newCache);
  } catch {
    // Failed to fetch pricing - will use cached values or return null
  }
}

/**
 * Ensure pricing cache is populated (from memory, Redis, or fresh fetch).
 */
async function ensurePricingLoaded(): Promise<void> {
  if (isMemoryCacheValid()) return;

  // Try Redis first (another instance may have fetched recently)
  const loaded = await loadFromRedis();
  if (loaded) return;

  // No cache anywhere — fetch fresh
  await refreshPricingCache();
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
  await ensurePricingLoaded();

  // Try exact match first
  if (memoryPricingCache.has(modelId)) {
    return memoryPricingCache.get(modelId)!;
  }

  // Try with common prefixes (in case model ID doesn't include provider)
  const prefixes = ["anthropic/", "openai/", "google/", ""];
  for (const prefix of prefixes) {
    const fullId = prefix + modelId;
    if (memoryPricingCache.has(fullId)) {
      return memoryPricingCache.get(fullId)!;
    }
  }

  // Try normalized matching (handles version format differences)
  const normalizedInput = normalizeModelId(modelId);
  for (const [cachedId, pricing] of memoryPricingCache.entries()) {
    if (normalizeModelId(cachedId) === normalizedInput) {
      return pricing;
    }
  }

  // Try partial match on model name
  const inputModelName = modelId.split("/").pop() || modelId;
  const normalizedName = normalizeModelId(inputModelName);
  for (const [cachedId, pricing] of memoryPricingCache.entries()) {
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

  // Subtract cached tokens from input tokens to avoid double-counting.
  // Some providers include cached tokens in the inputTokens count,
  // so we bill non-cached input at full price and cached input at the
  // discounted rate (or full price if no cached pricing is available).
  const nonCachedInputTokens = Math.max(0, inputTokens - cachedTokens);
  const inputCost = nonCachedInputTokens * pricing.inputCostPerToken;
  const outputCost = outputTokens * pricing.outputCostPerToken;
  const cachedCost =
    cachedTokens *
    (pricing.cachedInputCostPerToken ?? pricing.inputCostPerToken);

  return {
    totalCost: inputCost + outputCost + cachedCost,
    inputCost,
    outputCost,
    cachedCost,
    modelId,
  };
}
