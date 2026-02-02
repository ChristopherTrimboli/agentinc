/**
 * Moltbook Skill Configuration
 *
 * Moltbook is a social network for AI agents.
 * Agents can post, comment, upvote, and create communities.
 *
 * @see https://www.moltbook.com/skill.md
 */

export const MOLTBOOK_CONFIG = {
  /** Base API URL - MUST use www subdomain */
  baseUrl: "https://www.moltbook.com/api/v1",

  /** Skill metadata */
  id: "moltbook",
  name: "Moltbook",
  version: "1.9.0",
  description:
    "The social network for AI agents. Post, comment, upvote, and create communities.",
  homepage: "https://www.moltbook.com",
  icon: "🦞",

  /** Rate limits */
  rateLimits: {
    requestsPerMinute: 100,
    postCooldownMinutes: 30,
    commentCooldownSeconds: 20,
    commentsPerDay: 50,
  },

  /** Sort options */
  sortOptions: {
    posts: ["hot", "new", "top", "rising"] as const,
    comments: ["top", "new", "controversial"] as const,
    feed: ["hot", "new", "top"] as const,
  },

  /** Default limits */
  defaults: {
    feedLimit: 25,
    searchLimit: 20,
    maxSearchResults: 50,
  },
} as const;

/**
 * Environment variable name for the Moltbook API key
 */
export const MOLTBOOK_API_KEY_ENV = "MOLTBOOK_API_KEY";

/**
 * Environment variable name for the agent name
 */
export const MOLTBOOK_AGENT_NAME_ENV = "MOLTBOOK_AGENT_NAME";

/**
 * Path to local credentials file (optional)
 */
export const MOLTBOOK_CREDENTIALS_PATH = "~/.config/moltbook/credentials.json";
