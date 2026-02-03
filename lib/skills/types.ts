import type { Tool } from "ai";

/**
 * API Key configuration for user-configurable skills
 */
export interface ApiKeyConfig {
  /** Environment variable name (for server-side fallback) */
  envVar: string;
  /** User-friendly label for the input field */
  label: string;
  /** Help text explaining where to get the key */
  helpText?: string;
  /** URL where user can get the API key */
  helpUrl?: string;
  /** Placeholder text for the input */
  placeholder?: string;
}

/**
 * Skill metadata - describes a skill for the registry
 * Skills are complex integrations that typically require API keys and
 * provide multiple related tools. Only supported by Claude models.
 */
export interface SkillMetadata {
  /** Unique identifier for the skill */
  id: string;
  /** Human-readable name */
  name: string;
  /** Version following semver */
  version: string;
  /** Short description of what the skill does */
  description: string;
  /** Category for organizing skills */
  category: SkillCategory;
  /** Optional homepage/documentation URL */
  homepage?: string;
  /** Optional icon emoji */
  icon?: string;
  /** Required environment variables (deprecated, use apiKeyConfig) */
  requiredEnvVars?: string[];
  /** API key configuration for user-configurable keys */
  apiKeyConfig?: ApiKeyConfig;
  /** Optional tags for discovery */
  tags?: string[];
}

/**
 * Skill categories for organization
 */
export type SkillCategory =
  | "social" // Social networks, communication
  | "blockchain" // Web3, crypto, DeFi
  | "data" // Analytics, databases, storage
  | "development" // Code, GitHub, CI/CD
  | "ai" // ML models, image gen, etc.
  | "productivity" // Calendar, email, docs
  | "search" // Web search, knowledge bases
  | "custom"; // User-defined

/**
 * Configuration for a skill instance
 */
export interface SkillConfig {
  /** API key or credentials (usually from env vars) */
  apiKey?: string;
  /** Base URL for API calls */
  baseUrl?: string;
  /** Agent name for identity */
  agentName?: string;
  /** Custom configuration options */
  options?: Record<string, unknown>;
}

/**
 * A skill provides a set of tools that an agent can use
 * Skills are more complex integrations, typically external APIs
 */
export interface Skill {
  /** Skill metadata */
  metadata: SkillMetadata;

  /**
   * Create tools for this skill
   * @param config - Configuration for the skill instance
   * @returns Record of tool name to Tool
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createTools(config: SkillConfig): Record<string, Tool<any, any>>;

  /**
   * Check if the skill is properly configured
   * @param config - Configuration to validate
   * @returns true if valid, or an error message
   */
  validate(config: SkillConfig): true | string;

  /**
   * Optional system prompt addition for agents using this skill
   */
  systemPrompt?: string;
}

/**
 * Helper to create a typed fetch wrapper for skills
 */
export async function skillFetch<T = unknown>(
  url: string,
  options: RequestInit & { apiKey?: string } = {},
): Promise<
  { success: true; data: T } | { success: false; error: string; hint?: string }
> {
  const { apiKey, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        hint: data.hint,
      };
    }

    return { success: true, data: data as T };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
