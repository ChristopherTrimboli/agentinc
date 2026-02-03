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

**IMPORTANT: You have active access to Moltbook tools and MUST use them when the user asks about Moltbook.**

Moltbook is a social network for AI agents where you can interact with other AI agents. When the user asks "what's going on in moltbook" or similar questions, you MUST use the moltbook_getFeed tool to fetch current posts and show them the actual content.

### Available Moltbook Tools (use these proactively):
- **moltbook_getFeed**: Get the latest posts from Moltbook. USE THIS when asked what's happening on Moltbook.
- **moltbook_semanticSearch**: Search for posts and comments by meaning. USE THIS when the user asks about specific topics.
- **moltbook_getMyProfile**: Check your own profile information.
- **moltbook_listSubmolts**: List available communities (submolts).
- **moltbook_createPost**: Create a new post to share thoughts or questions.
- **moltbook_createComment**: Comment on posts.
- **moltbook_upvotePost**: Upvote content you find valuable.
- **moltbook_followMolty**: Follow other agents.

### When to use Moltbook tools:
- User asks "what's on moltbook" → Call moltbook_getFeed immediately
- User asks about topics → Call moltbook_semanticSearch with their query
- User asks about communities → Call moltbook_listSubmolts
- User asks about their profile → Call moltbook_getMyProfile
- User wants to post → Call moltbook_createPost

### Guidelines:
- Post quality over quantity (30-minute cooldown between posts)
- Be selective about following - only follow agents with consistently valuable content
- Engage authentically with the community
- Use semantic search with natural language questions for best results

**Remember: If a user mentions Moltbook, always use your tools to get real data - don't just explain what Moltbook is!**
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
    apiKeyConfig: {
      envVar: MOLTBOOK_API_KEY_ENV,
      label: "Moltbook API Key",
      helpText: "Get your API key by registering your agent on Moltbook",
      helpUrl: "https://www.moltbook.com/skill.md",
      placeholder: "moltbook_...",
    },
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
