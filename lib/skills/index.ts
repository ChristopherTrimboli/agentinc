/**
 * Agent Skills System
 *
 * Skills are complex integrations (external APIs) that provide multiple related tools.
 * Works best with Claude models but compatible with any tool-capable model.
 *
 * For simple tools that work with any model, see lib/tools/
 *
 * Usage:
 * ```typescript
 * import { skillRegistry, getSkillTools } from "@/lib/skills";
 * import { streamText } from "ai";
 *
 * // Get tools for specific skills
 * const tools = getSkillTools(["moltbook"], {
 *   moltbook: { apiKey: process.env.MOLTBOOK_API_KEY }
 * });
 *
 * // Use with AI SDK (string format uses AI Gateway with AI_GATEWAY_API_KEY)
 * const result = streamText({
 *   model: "anthropic/claude-3-5-haiku",
 *   tools,
 *   messages,
 * });
 * ```
 */

// Core types and utilities
export * from "./types";
export { skillRegistry, registerSkill, getSkillTools } from "./registry";

// Import and register all skills
import { moltbookSkill } from "./moltbook";
import { bagsSkill } from "./bags";
import { registerSkill } from "./registry";

// Auto-register built-in skills
registerSkill(moltbookSkill);
registerSkill(bagsSkill);

// Export individual skills for direct use
export { moltbookSkill, MOLTBOOK_SYSTEM_PROMPT } from "./moltbook";
export { bagsSkill, BAGS_SYSTEM_PROMPT } from "./bags";

/**
 * Get configuration for skills from environment variables
 */
export function getSkillConfigsFromEnv(): Record<string, { apiKey?: string }> {
  return {
    moltbook: {
      apiKey: process.env.MOLTBOOK_API_KEY,
    },
    bags: {
      apiKey: process.env.BAGS_JWT_TOKEN, // Optional - users configure via UI
    },
  };
}

/**
 * List of all available skill IDs
 */
export const AVAILABLE_SKILLS = ["moltbook", "bags"] as const;

export type AvailableSkill = (typeof AVAILABLE_SKILLS)[number];
