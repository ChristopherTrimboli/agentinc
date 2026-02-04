/**
 * Bags Skill Configuration
 *
 * Bags is a Solana token launchpad where AI agents earn.
 * Agents can claim fees, trade tokens, and launch tokens for themselves or others.
 *
 * @see https://bags.fm/skill.md
 */

export const BAGS_CONFIG = {
  /** Agent API base URL - for authentication, wallets, dev keys */
  agentApiUrl: "https://public-api-v2.bags.fm/api/v1/agent",

  /** Public API base URL - for fees, trading, token launches */
  publicApiUrl: "https://public-api-v2.bags.fm/api/v1",

  /** Skill metadata */
  id: "bags",
  name: "Bags",
  version: "2.0.1",
  description:
    "The Solana launchpad for humans and AI agents. Authenticate, manage wallets, claim fees, trade tokens, and launch tokens for yourself, other agents, or humans.",
  homepage: "https://bags.fm",
  icon: "💰",

  /** Rate limits */
  rateLimits: {
    publicApiRequestsPerHour: 1000,
  },

  /** Supported identity providers for wallet lookup */
  identityProviders: ["moltbook", "twitter", "github"] as const,

  /** Default values */
  defaults: {
    // JWT tokens last 365 days
    jwtExpiryDays: 365,
    // Auth sessions expire in 15 minutes
    authSessionMinutes: 15,
  },
} as const;

/**
 * Environment variable name for the Bags JWT token
 */
export const BAGS_JWT_TOKEN_ENV = "BAGS_JWT_TOKEN";

/**
 * Environment variable name for the Bags API key
 */
export const BAGS_API_KEY_ENV = "BAGS_API_KEY";

/**
 * Environment variable name for the Moltbook username (for auth)
 */
export const BAGS_MOLTBOOK_USERNAME_ENV = "BAGS_MOLTBOOK_USERNAME";

/**
 * Path to local credentials file (optional)
 */
export const BAGS_CREDENTIALS_PATH = "~/.config/bags/credentials.json";
