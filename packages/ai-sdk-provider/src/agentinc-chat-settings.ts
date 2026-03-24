export type AgentIncChatModelId =
  // Anthropic
  | "anthropic/claude-haiku-4.6"
  | "anthropic/claude-sonnet-4.6"
  | "anthropic/claude-opus-4.6"
  | "anthropic/claude-sonnet-4.5"
  | "anthropic/claude-sonnet-4"
  | "anthropic/claude-opus-4.5"
  // OpenAI
  | "openai/gpt-5.4-mini"
  | "openai/gpt-5.4"
  | "openai/gpt-5.3-codex"
  | "openai/gpt-5.2"
  | "openai/gpt-5.1-instant"
  | "openai/gpt-5.1-thinking"
  | "openai/gpt-5"
  | "openai/gpt-5-mini"
  | "openai/gpt-5-nano"
  | "openai/gpt-4.1-mini"
  | "openai/gpt-4o-mini"
  | "openai/gpt-oss-120b"
  | "openai/gpt-oss-20b"
  // Google
  | "google/gemini-3.1-flash-lite-preview"
  | "google/gemini-3.1-pro-preview"
  | "google/gemini-3-pro-preview"
  | "google/gemini-2.5-pro"
  | "google/gemini-2.5-flash"
  | "google/gemini-2.0-flash"
  // xAI
  | "xai/grok-4-fast-reasoning"
  | "xai/grok-code-fast-1"
  // DeepSeek
  | "deepseek/deepseek-v3.2"
  // Minimax
  | "minimax/minimax-m2.5"
  | "minimax/minimax-m2.7"
  // Moonshot
  | "moonshotai/kimi-k2.5"
  // ZAI
  | "zai/glm-5"
  // Voyage (embeddings via chatModel won't work, but keeps the ID known)
  // Any gateway model ID is accepted
  | (string & {});

export interface AgentIncChatSettings {
  /**
   * A unique identifier representing the end-user for rate-limiting
   * and abuse monitoring.
   */
  user?: string;
}
