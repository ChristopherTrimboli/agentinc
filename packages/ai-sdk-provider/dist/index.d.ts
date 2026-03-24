import { LanguageModelV3, EmbeddingModelV3 } from '@ai-sdk/provider';

type AgentIncChatModelId = "anthropic/claude-haiku-4.6" | "anthropic/claude-sonnet-4.6" | "anthropic/claude-opus-4.6" | "anthropic/claude-sonnet-4.5" | "anthropic/claude-sonnet-4" | "anthropic/claude-opus-4.5" | "openai/gpt-5.4-mini" | "openai/gpt-5.4" | "openai/gpt-5.3-codex" | "openai/gpt-5.2" | "openai/gpt-5.1-instant" | "openai/gpt-5.1-thinking" | "openai/gpt-5" | "openai/gpt-5-mini" | "openai/gpt-5-nano" | "openai/gpt-4.1-mini" | "openai/gpt-4o-mini" | "openai/gpt-oss-120b" | "openai/gpt-oss-20b" | "google/gemini-3.1-flash-lite-preview" | "google/gemini-3.1-pro-preview" | "google/gemini-3-pro-preview" | "google/gemini-2.5-pro" | "google/gemini-2.5-flash" | "google/gemini-2.0-flash" | "xai/grok-4-fast-reasoning" | "xai/grok-code-fast-1" | "deepseek/deepseek-v3.2" | "minimax/minimax-m2.5" | "minimax/minimax-m2.7" | "moonshotai/kimi-k2.5" | "zai/glm-5" | (string & {});
interface AgentIncChatSettings {
    /**
     * A unique identifier representing the end-user for rate-limiting
     * and abuse monitoring.
     */
    user?: string;
}

type AgentIncEmbeddingModelId = "openai/text-embedding-3-large" | "openai/text-embedding-3-small" | (string & {});
interface AgentIncEmbeddingSettings {
    /**
     * The number of dimensions the resulting output embeddings should have.
     * Only supported by certain models.
     */
    dimensions?: number;
    /**
     * A unique identifier representing the end-user for rate-limiting
     * and abuse monitoring.
     */
    user?: string;
}

/**
 * AgentInc AI SDK Provider
 *
 * A Vercel AI SDK provider that interfaces with the AgentInc x402 AI Gateway.
 * Supports two authentication modes:
 *
 * - API key: traditional bearer token auth
 * - x402: trustless per-request SOL micropayments on Solana
 */

interface AgentIncProviderSettings {
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
interface AgentIncProvider {
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
declare function createAgentInc(options?: AgentIncProviderSettings): AgentIncProvider;
/**
 * Default AgentInc provider instance.
 * Reads `AGENTINC_API_KEY` environment variable at request time (not import time).
 */
declare const agentinc: AgentIncProvider;

export { type AgentIncChatModelId, type AgentIncChatSettings, type AgentIncEmbeddingModelId, type AgentIncEmbeddingSettings, type AgentIncProvider, type AgentIncProviderSettings, agentinc, createAgentInc };
