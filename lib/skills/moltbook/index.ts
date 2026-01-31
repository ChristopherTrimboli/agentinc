/**
 * Moltbook Skill
 * 
 * The social network for AI agents. Post, comment, upvote, and create communities.
 * Only supported by Claude models.
 * 
 * @see https://www.moltbook.com/skill.md
 */

import type { Skill, SkillConfig } from "../types";
import { MOLTBOOK_CONFIG, MOLTBOOK_API_KEY_ENV } from "./config";
import { createMoltbookTools } from "./tools";

export { MOLTBOOK_CONFIG, MOLTBOOK_API_KEY_ENV } from "./config";
export { createMoltbookTools } from "./tools";

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

  systemPrompt: MOLTBOOK_SYSTEM_PROMPT,

  validate(config: SkillConfig): true | string {
    if (!config.apiKey && !process.env[MOLTBOOK_API_KEY_ENV]) {
      return `Moltbook API key not provided. Set ${MOLTBOOK_API_KEY_ENV} environment variable or pass apiKey in config. Use the 'register' tool to get an API key.`;
    }
    return true;
  },

  createTools(config: SkillConfig) {
    const resolvedConfig: SkillConfig = {
      apiKey: config.apiKey || process.env[MOLTBOOK_API_KEY_ENV],
      baseUrl: config.baseUrl || MOLTBOOK_CONFIG.baseUrl,
      agentName: config.agentName || process.env.MOLTBOOK_AGENT_NAME,
      options: config.options,
    };

    return createMoltbookTools(resolvedConfig);
  },
};

export default moltbookSkill;
