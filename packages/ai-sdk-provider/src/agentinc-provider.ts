/**
 * AgentInc AI SDK Provider
 *
 * A Vercel AI SDK provider that interfaces with the AgentInc x402 AI Gateway.
 * Supports two authentication modes:
 *
 * - API key: traditional bearer token auth
 * - x402: trustless per-request SOL micropayments on Solana
 */

import {
  createOpenAICompatible,
  type OpenAICompatibleProvider,
} from "@ai-sdk/openai-compatible";
import type { LanguageModelV3, EmbeddingModelV3 } from "@ai-sdk/provider";
import { withoutTrailingSlash } from "@ai-sdk/provider-utils";
import type { AgentIncChatModelId } from "./agentinc-chat-settings";
import type { AgentIncEmbeddingModelId } from "./agentinc-embedding-settings";
import { createX402Fetch } from "./agentinc-x402-fetch";

// ── Public types ────────────────────────────────────────────────────────

export interface AgentIncProviderSettings {
  /**
   * Base URL for the AgentInc API.
   * @default "https://agentinc.fun/api/v1"
   */
  baseURL?: string;

  /**
   * API key for bearer-token authentication.
   * Falls back to the `AGENTINC_API_KEY` environment variable.
   * Mutually exclusive with `solanaSecretKey` (if both are provided,
   * API key takes precedence).
   */
  apiKey?: string;

  /** Extra headers to include in every request. */
  headers?: Record<string, string>;

  /**
   * 64-byte Solana keypair for x402 SOL micropayments.
   * When provided (and no `apiKey`), the provider automatically handles
   * the x402 payment protocol on each request.
   * Requires `@solana/kit` as a peer dependency.
   */
  solanaSecretKey?: Uint8Array;

  /**
   * Solana network for x402 payments.
   * @default "solana" (mainnet)
   */
  solanaNetwork?: "solana" | "solana-devnet";

  /**
   * Custom Solana RPC URL for x402 transaction building.
   * Falls back to the public endpoint for the configured network.
   */
  solanaRpcUrl?: string;

  /** Override the default fetch implementation. */
  fetch?: typeof fetch;
}

export interface AgentIncProvider {
  /**
   * Create a chat language model.
   *
   * @example
   * ```ts
   * const model = agentinc("anthropic/claude-sonnet-4");
   * const { text } = await generateText({ model, prompt: "Hello!" });
   * ```
   */
  (modelId: AgentIncChatModelId): LanguageModelV3;

  /** Create a chat language model (explicit method). */
  chatModel(modelId: AgentIncChatModelId): LanguageModelV3;

  /** Create a text embedding model. */
  embeddingModel(modelId: AgentIncEmbeddingModelId): EmbeddingModelV3;
}

// ── Factory ─────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = "https://agentinc.fun/api/v1";

/**
 * Create an AgentInc AI SDK provider instance.
 *
 * @example API key mode
 * ```ts
 * const agentinc = createAgentInc({ apiKey: "sk-..." });
 * ```
 *
 * @example x402 SOL payment mode
 * ```ts
 * const agentinc = createAgentInc({
 *   solanaSecretKey: myKeypairBytes,
 *   solanaNetwork: "solana-devnet",
 * });
 * ```
 */
export function createAgentInc(
  options: AgentIncProviderSettings = {},
): AgentIncProvider {
  const baseURL = withoutTrailingSlash(options.baseURL) ?? DEFAULT_BASE_URL;

  const isX402Mode = !!options.solanaSecretKey && !options.apiKey;

  // In x402 mode, wrap fetch to handle 402 payment flow automatically
  const fetchFn: typeof fetch | undefined = isX402Mode
    ? createX402Fetch({
        secretKey: options.solanaSecretKey!,
        network: options.solanaNetwork ?? "solana",
        rpcUrl: options.solanaRpcUrl,
        baseFetch: options.fetch,
      })
    : options.fetch;

  // Resolve API key lazily — only read env var when the first request is made,
  // not at module load time. This prevents crashes for x402-only consumers.
  const apiKey = isX402Mode ? undefined : (options.apiKey ?? undefined);

  const inner: OpenAICompatibleProvider<
    AgentIncChatModelId,
    string,
    AgentIncEmbeddingModelId
  > = createOpenAICompatible({
    name: "agentinc",
    baseURL,
    apiKey: apiKey ?? process.env.AGENTINC_API_KEY,
    headers: options.headers,
    fetch: fetchFn,
  });

  // Wrap to expose a cleaner public surface
  const provider = function agentinc(
    modelId: AgentIncChatModelId,
  ): LanguageModelV3 {
    return inner.chatModel(modelId);
  };

  provider.chatModel = (modelId: AgentIncChatModelId): LanguageModelV3 =>
    inner.chatModel(modelId);

  provider.embeddingModel = (
    modelId: AgentIncEmbeddingModelId,
  ): EmbeddingModelV3 => inner.embeddingModel(modelId);

  return provider as AgentIncProvider;
}

/**
 * Default AgentInc provider instance.
 * Reads `AGENTINC_API_KEY` environment variable at request time (not import time).
 */
export const agentinc = createAgentInc();
