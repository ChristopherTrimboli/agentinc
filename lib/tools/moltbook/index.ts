/**
 * Moltbook Toolset
 *
 * The social network for AI agents. Post, comment, upvote, and create communities.
 *
 * @see https://www.moltbook.com/skill.md
 */

import type { Skill, SkillConfig } from "../../skills/types";
import {
  MOLTBOOK_CONFIG,
  MOLTBOOK_API_KEY_ENV,
} from "../../skills/moltbook/config";
import { createMoltbookTools } from "./tools";

export {
  MOLTBOOK_CONFIG,
  MOLTBOOK_API_KEY_ENV,
} from "../../skills/moltbook/config";
export { createMoltbookTools } from "./tools";

/**
 * Moltbook skill definition
 */
export const moltbookSkill: Skill = {
  metadata: {
    id: MOLTBOOK_CONFIG.id,
    name: MOLTBOOK_CONFIG.name,
    version: MOLTBOOK_CONFIG.version,
    description: MOLTBOOK_CONFIG.description,
    category: "social",
    homepage: MOLTBOOK_CONFIG.homepage,
    icon: MOLTBOOK_CONFIG.icon,
    requiredEnvVars: [MOLTBOOK_API_KEY_ENV],
    tags: ["social", "community", "posting", "ai-agents"],
  },

  validate(config: SkillConfig): true | string {
    // API key is required for most operations (except registration)
    // But we allow creating the toolset without it for registration flow
    if (!config.apiKey && !process.env[MOLTBOOK_API_KEY_ENV]) {
      return `Moltbook API key not provided. Set ${MOLTBOOK_API_KEY_ENV} environment variable or pass apiKey in config. Use the 'register' tool to get an API key.`;
    }
    return true;
  },

  createTools(config: SkillConfig) {
    // Use provided config or fall back to environment variables
    const resolvedConfig: SkillConfig = {
      apiKey: config.apiKey || process.env[MOLTBOOK_API_KEY_ENV],
      baseUrl: config.baseUrl || MOLTBOOK_CONFIG.baseUrl,
      agentName: config.agentName || process.env.MOLTBOOK_AGENT_NAME,
      options: config.options,
    };

    return createMoltbookTools(resolvedConfig);
  },
};

/**
 * System prompt addition for agents with Moltbook access
 */
export const MOLTBOOK_SYSTEM_PROMPT = `
## Moltbook Integration

You have access to Moltbook, a social network for AI agents. You can:
- Browse and read posts from other agents
- Create posts to share thoughts, discoveries, or questions
- Comment on and upvote interesting content
- Join communities (submolts) and follow other agents
- Use semantic search to find relevant discussions

Guidelines:
- Post quality over quantity (30-minute cooldown between posts)
- Be selective about following - only follow agents with consistently valuable content
- Engage authentically with the community
- Use semantic search with natural language questions for best results
`;

export default moltbookSkill;
