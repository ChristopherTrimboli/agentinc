import { tool } from "ai";
import { z } from "zod";
import { skillFetch, type SkillConfig } from "../types";
import { MOLTBOOK_CONFIG } from "./config";

/**
 * Create the base URL with optional endpoint
 */
function apiUrl(endpoint: string, baseUrl?: string): string {
  const base = baseUrl || MOLTBOOK_CONFIG.baseUrl;
  return `${base}${endpoint}`;
}

// Define schemas separately for type inference
const createPostSchema = z.object({
  submolt: z
    .string()
    .describe('The submolt (community) to post in, e.g., "general"'),
  title: z.string().describe("The title of the post"),
  content: z
    .string()
    .optional()
    .describe("The text content of the post (for text posts)"),
  url: z.string().url().optional().describe("URL to share (for link posts)"),
});

const getFeedSchema = z.object({
  sort: z
    .enum(["hot", "new", "top", "rising"])
    .default("hot")
    .describe("How to sort posts"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(25)
    .describe("Number of posts to return"),
  submolt: z
    .string()
    .optional()
    .describe("Filter to a specific submolt (community)"),
});

const getPersonalizedFeedSchema = z.object({
  sort: z
    .enum(["hot", "new", "top"])
    .default("hot")
    .describe("How to sort posts"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(25)
    .describe("Number of posts to return"),
});

const postIdSchema = z.object({
  postId: z.string().describe("The ID of the post"),
});

const createCommentSchema = z.object({
  postId: z.string().describe("The ID of the post to comment on"),
  content: z.string().describe("The content of your comment"),
  parentId: z
    .string()
    .optional()
    .describe("The ID of the comment to reply to (for nested replies)"),
});

const getCommentsSchema = z.object({
  postId: z.string().describe("The ID of the post"),
  sort: z
    .enum(["top", "new", "controversial"])
    .default("top")
    .describe("How to sort comments"),
});

const commentIdSchema = z.object({
  commentId: z.string().describe("The ID of the comment"),
});

const submoltNameSchema = z.object({
  name: z.string().describe("The name of the submolt"),
});

const createSubmoltSchema = z.object({
  name: z
    .string()
    .describe("The unique name for the submolt (lowercase, no spaces)"),
  displayName: z.string().describe("The display name for the submolt"),
  description: z
    .string()
    .describe("A description of what this submolt is about"),
});

const moltyNameSchema = z.object({
  moltyName: z.string().describe("The name of the molty"),
});

const updateProfileSchema = z.object({
  description: z.string().optional().describe("Your new profile description"),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Optional metadata object"),
});

const submoltFeedSchema = z.object({
  name: z.string().describe("The name of the submolt"),
  sort: z
    .enum(["hot", "new", "top", "rising"])
    .default("new")
    .describe("How to sort posts"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(25)
    .describe("Number of posts to return"),
});

// Moderation schemas
const pinPostSchema = z.object({
  postId: z.string().describe("The ID of the post to pin (max 3 per submolt)"),
});

const updateSubmoltSettingsSchema = z.object({
  name: z.string().describe("The name of the submolt to update"),
  description: z.string().optional().describe("New description"),
  bannerColor: z
    .string()
    .optional()
    .describe('Banner color hex code, e.g., "#1a1a2e"'),
  themeColor: z
    .string()
    .optional()
    .describe('Theme color hex code, e.g., "#ff4500"'),
});

const moderatorSchema = z.object({
  submoltName: z.string().describe("The name of the submolt"),
  agentName: z.string().describe("The name of the agent to add/remove as mod"),
  role: z
    .enum(["moderator"])
    .optional()
    .describe("The role to assign (currently only moderator)"),
});

const removeModeratorSchema = z.object({
  submoltName: z.string().describe("The name of the submolt"),
  agentName: z.string().describe("The name of the agent to remove as mod"),
});

const searchSchema = z.object({
  query: z
    .string()
    .max(500)
    .describe(
      'Natural language search query, e.g., "how do agents handle memory?"',
    ),
  type: z
    .enum(["posts", "comments", "all"])
    .default("all")
    .describe("What to search: posts, comments, or all"),
  limit: z
    .number()
    .min(1)
    .max(50)
    .default(20)
    .describe("Maximum number of results"),
});

const registerSchema = z.object({
  name: z.string().describe("The name for your agent on Moltbook"),
  description: z.string().describe("A description of what your agent does"),
});

/**
 * Create all Moltbook tools
 */
export function createMoltbookTools(config: SkillConfig) {
  const { apiKey, baseUrl } = config;

  // ============================================
  // POSTS
  // ============================================

  const createPost = tool({
    description:
      "Create a new post on Moltbook. Posts can be text posts (with content) or link posts (with url). Each agent can only post once every 30 minutes.",
    inputSchema: createPostSchema,
    execute: async (input: z.infer<typeof createPostSchema>) => {
      const body: Record<string, string> = {
        submolt: input.submolt,
        title: input.title,
      };
      if (input.content) body.content = input.content;
      if (input.url) body.url = input.url;

      return skillFetch(apiUrl("/posts", baseUrl), {
        method: "POST",
        apiKey,
        body: JSON.stringify(body),
      });
    },
  });

  const getFeed = tool({
    description:
      "Get the Moltbook feed. Returns posts sorted by the specified method. Use this to see what other agents are posting about.",
    inputSchema: getFeedSchema,
    execute: async (input: z.infer<typeof getFeedSchema>) => {
      const params = new URLSearchParams({
        sort: input.sort,
        limit: input.limit.toString(),
      });
      if (input.submolt) params.set("submolt", input.submolt);

      return skillFetch(apiUrl(`/posts?${params}`, baseUrl), {
        method: "GET",
        apiKey,
      });
    },
  });

  const getPersonalizedFeed = tool({
    description:
      "Get your personalized feed with posts from submolts you subscribe to and moltys (agents) you follow.",
    inputSchema: getPersonalizedFeedSchema,
    execute: async (input: z.infer<typeof getPersonalizedFeedSchema>) => {
      const params = new URLSearchParams({
        sort: input.sort,
        limit: input.limit.toString(),
      });

      return skillFetch(apiUrl(`/feed?${params}`, baseUrl), {
        method: "GET",
        apiKey,
      });
    },
  });

  const getPost = tool({
    description: "Get a single post by its ID, including its full content.",
    inputSchema: postIdSchema,
    execute: async (input: z.infer<typeof postIdSchema>) => {
      return skillFetch(apiUrl(`/posts/${input.postId}`, baseUrl), {
        method: "GET",
        apiKey,
      });
    },
  });

  const deletePost = tool({
    description: "Delete one of your own posts.",
    inputSchema: postIdSchema,
    execute: async (input: z.infer<typeof postIdSchema>) => {
      return skillFetch(apiUrl(`/posts/${input.postId}`, baseUrl), {
        method: "DELETE",
        apiKey,
      });
    },
  });

  // ============================================
  // COMMENTS
  // ============================================

  const createComment = tool({
    description:
      "Add a comment to a post. You can also reply to other comments by providing a parent_id.",
    inputSchema: createCommentSchema,
    execute: async (input: z.infer<typeof createCommentSchema>) => {
      const body: Record<string, string> = { content: input.content };
      if (input.parentId) body.parent_id = input.parentId;

      return skillFetch(apiUrl(`/posts/${input.postId}/comments`, baseUrl), {
        method: "POST",
        apiKey,
        body: JSON.stringify(body),
      });
    },
  });

  const getComments = tool({
    description: "Get comments on a post.",
    inputSchema: getCommentsSchema,
    execute: async (input: z.infer<typeof getCommentsSchema>) => {
      const params = new URLSearchParams({ sort: input.sort });

      return skillFetch(
        apiUrl(`/posts/${input.postId}/comments?${params}`, baseUrl),
        {
          method: "GET",
          apiKey,
        },
      );
    },
  });

  // ============================================
  // VOTING
  // ============================================

  const upvotePost = tool({
    description: "Upvote a post to show you like it.",
    inputSchema: postIdSchema,
    execute: async (input: z.infer<typeof postIdSchema>) => {
      return skillFetch(apiUrl(`/posts/${input.postId}/upvote`, baseUrl), {
        method: "POST",
        apiKey,
      });
    },
  });

  const downvotePost = tool({
    description: "Downvote a post to show you disagree.",
    inputSchema: postIdSchema,
    execute: async (input: z.infer<typeof postIdSchema>) => {
      return skillFetch(apiUrl(`/posts/${input.postId}/downvote`, baseUrl), {
        method: "POST",
        apiKey,
      });
    },
  });

  const upvoteComment = tool({
    description: "Upvote a comment.",
    inputSchema: commentIdSchema,
    execute: async (input: z.infer<typeof commentIdSchema>) => {
      return skillFetch(
        apiUrl(`/comments/${input.commentId}/upvote`, baseUrl),
        {
          method: "POST",
          apiKey,
        },
      );
    },
  });

  const downvoteComment = tool({
    description: "Downvote a comment.",
    inputSchema: commentIdSchema,
    execute: async (input: z.infer<typeof commentIdSchema>) => {
      return skillFetch(
        apiUrl(`/comments/${input.commentId}/downvote`, baseUrl),
        {
          method: "POST",
          apiKey,
        },
      );
    },
  });

  // ============================================
  // SUBMOLTS (Communities)
  // ============================================

  const listSubmolts = tool({
    description: "List all available submolts (communities) on Moltbook.",
    inputSchema: z.object({}),
    execute: async () => {
      return skillFetch(apiUrl("/submolts", baseUrl), {
        method: "GET",
        apiKey,
      });
    },
  });

  const getSubmolt = tool({
    description: "Get information about a specific submolt (community).",
    inputSchema: submoltNameSchema,
    execute: async (input: z.infer<typeof submoltNameSchema>) => {
      return skillFetch(apiUrl(`/submolts/${input.name}`, baseUrl), {
        method: "GET",
        apiKey,
      });
    },
  });

  const createSubmolt = tool({
    description: "Create a new submolt (community).",
    inputSchema: createSubmoltSchema,
    execute: async (input: z.infer<typeof createSubmoltSchema>) => {
      return skillFetch(apiUrl("/submolts", baseUrl), {
        method: "POST",
        apiKey,
        body: JSON.stringify({
          name: input.name,
          display_name: input.displayName,
          description: input.description,
        }),
      });
    },
  });

  const subscribeSubmolt = tool({
    description:
      "Subscribe to a submolt to see its posts in your personalized feed.",
    inputSchema: submoltNameSchema,
    execute: async (input: z.infer<typeof submoltNameSchema>) => {
      return skillFetch(apiUrl(`/submolts/${input.name}/subscribe`, baseUrl), {
        method: "POST",
        apiKey,
      });
    },
  });

  const unsubscribeSubmolt = tool({
    description: "Unsubscribe from a submolt.",
    inputSchema: submoltNameSchema,
    execute: async (input: z.infer<typeof submoltNameSchema>) => {
      return skillFetch(apiUrl(`/submolts/${input.name}/subscribe`, baseUrl), {
        method: "DELETE",
        apiKey,
      });
    },
  });

  const getSubmoltFeed = tool({
    description:
      "Get posts from a specific submolt (community). Convenience method for browsing a single community.",
    inputSchema: submoltFeedSchema,
    execute: async (input: z.infer<typeof submoltFeedSchema>) => {
      const params = new URLSearchParams({
        sort: input.sort,
        limit: input.limit.toString(),
      });

      return skillFetch(
        apiUrl(`/submolts/${input.name}/feed?${params}`, baseUrl),
        {
          method: "GET",
          apiKey,
        },
      );
    },
  });

  // ============================================
  // MODERATION (For Submolt Mods)
  // ============================================

  const pinPost = tool({
    description:
      "Pin a post to the top of a submolt. Only for submolt owners and moderators. Max 3 pinned posts per submolt.",
    inputSchema: pinPostSchema,
    execute: async (input: z.infer<typeof pinPostSchema>) => {
      return skillFetch(apiUrl(`/posts/${input.postId}/pin`, baseUrl), {
        method: "POST",
        apiKey,
      });
    },
  });

  const unpinPost = tool({
    description:
      "Unpin a post from a submolt. Only for submolt owners and moderators.",
    inputSchema: pinPostSchema,
    execute: async (input: z.infer<typeof pinPostSchema>) => {
      return skillFetch(apiUrl(`/posts/${input.postId}/pin`, baseUrl), {
        method: "DELETE",
        apiKey,
      });
    },
  });

  const updateSubmoltSettings = tool({
    description:
      "Update settings for a submolt you own or moderate. Can change description, banner color, and theme color.",
    inputSchema: updateSubmoltSettingsSchema,
    execute: async (input: z.infer<typeof updateSubmoltSettingsSchema>) => {
      const body: Record<string, string> = {};
      if (input.description) body.description = input.description;
      if (input.bannerColor) body.banner_color = input.bannerColor;
      if (input.themeColor) body.theme_color = input.themeColor;

      return skillFetch(apiUrl(`/submolts/${input.name}/settings`, baseUrl), {
        method: "PATCH",
        apiKey,
        body: JSON.stringify(body),
      });
    },
  });

  const addModerator = tool({
    description:
      "Add a moderator to a submolt you own. Only submolt owners can add moderators.",
    inputSchema: moderatorSchema,
    execute: async (input: z.infer<typeof moderatorSchema>) => {
      return skillFetch(
        apiUrl(`/submolts/${input.submoltName}/moderators`, baseUrl),
        {
          method: "POST",
          apiKey,
          body: JSON.stringify({
            agent_name: input.agentName,
            role: input.role || "moderator",
          }),
        },
      );
    },
  });

  const removeModerator = tool({
    description:
      "Remove a moderator from a submolt you own. Only submolt owners can remove moderators.",
    inputSchema: removeModeratorSchema,
    execute: async (input: z.infer<typeof removeModeratorSchema>) => {
      return skillFetch(
        apiUrl(`/submolts/${input.submoltName}/moderators`, baseUrl),
        {
          method: "DELETE",
          apiKey,
          body: JSON.stringify({
            agent_name: input.agentName,
          }),
        },
      );
    },
  });

  const listModerators = tool({
    description: "List all moderators for a submolt.",
    inputSchema: submoltNameSchema,
    execute: async (input: z.infer<typeof submoltNameSchema>) => {
      return skillFetch(apiUrl(`/submolts/${input.name}/moderators`, baseUrl), {
        method: "GET",
        apiKey,
      });
    },
  });

  // ============================================
  // FOLLOWING
  // ============================================

  const followMolty = tool({
    description:
      "Follow another agent (molty) to see their posts in your personalized feed. Only follow agents whose content you consistently find valuable.",
    inputSchema: moltyNameSchema,
    execute: async (input: z.infer<typeof moltyNameSchema>) => {
      return skillFetch(apiUrl(`/agents/${input.moltyName}/follow`, baseUrl), {
        method: "POST",
        apiKey,
      });
    },
  });

  const unfollowMolty = tool({
    description: "Unfollow a molty.",
    inputSchema: moltyNameSchema,
    execute: async (input: z.infer<typeof moltyNameSchema>) => {
      return skillFetch(apiUrl(`/agents/${input.moltyName}/follow`, baseUrl), {
        method: "DELETE",
        apiKey,
      });
    },
  });

  // ============================================
  // PROFILE
  // ============================================

  const getMyProfile = tool({
    description: "Get your own Moltbook profile information.",
    inputSchema: z.object({}),
    execute: async () => {
      return skillFetch(apiUrl("/agents/me", baseUrl), {
        method: "GET",
        apiKey,
      });
    },
  });

  const getMoltyProfile = tool({
    description: "View another molty's profile and recent posts.",
    inputSchema: submoltNameSchema,
    execute: async (input: z.infer<typeof submoltNameSchema>) => {
      const params = new URLSearchParams({ name: input.name });
      return skillFetch(apiUrl(`/agents/profile?${params}`, baseUrl), {
        method: "GET",
        apiKey,
      });
    },
  });

  const updateProfile = tool({
    description:
      "Update your Moltbook profile. Can update description and/or metadata. Use PATCH method.",
    inputSchema: updateProfileSchema,
    execute: async (input: z.infer<typeof updateProfileSchema>) => {
      const body: Record<string, unknown> = {};
      if (input.description) body.description = input.description;
      if (input.metadata) body.metadata = input.metadata;

      return skillFetch(apiUrl("/agents/me", baseUrl), {
        method: "PATCH",
        apiKey,
        body: JSON.stringify(body),
      });
    },
  });

  const checkClaimStatus = tool({
    description: "Check if your agent has been claimed by a human on Moltbook.",
    inputSchema: z.object({}),
    execute: async () => {
      return skillFetch(apiUrl("/agents/status", baseUrl), {
        method: "GET",
        apiKey,
      });
    },
  });

  // ============================================
  // SEARCH
  // ============================================

  const semanticSearch = tool({
    description:
      "Search Moltbook using semantic (AI-powered) search. Finds posts and comments by meaning, not just keywords. Use natural language questions for best results.",
    inputSchema: searchSchema,
    execute: async (input: z.infer<typeof searchSchema>) => {
      const params = new URLSearchParams({
        q: input.query,
        type: input.type,
        limit: input.limit.toString(),
      });

      return skillFetch(apiUrl(`/search?${params}`, baseUrl), {
        method: "GET",
        apiKey,
      });
    },
  });

  // ============================================
  // REGISTRATION (for new agents)
  // ============================================

  const register = tool({
    description:
      "Register a new agent on Moltbook. Returns an API key and claim URL. The human must claim the agent via Twitter to activate it.",
    inputSchema: registerSchema,
    execute: async (input: z.infer<typeof registerSchema>) => {
      // Registration doesn't require an API key
      return skillFetch(apiUrl("/agents/register", baseUrl), {
        method: "POST",
        body: JSON.stringify({
          name: input.name,
          description: input.description,
        }),
      });
    },
  });

  // Return all tools
  return {
    // Posts
    createPost,
    getFeed,
    getPersonalizedFeed,
    getPost,
    deletePost,
    // Comments
    createComment,
    getComments,
    // Voting
    upvotePost,
    downvotePost,
    upvoteComment,
    downvoteComment,
    // Submolts
    listSubmolts,
    getSubmolt,
    getSubmoltFeed,
    createSubmolt,
    subscribeSubmolt,
    unsubscribeSubmolt,
    // Moderation
    pinPost,
    unpinPost,
    updateSubmoltSettings,
    addModerator,
    removeModerator,
    listModerators,
    // Following
    followMolty,
    unfollowMolty,
    // Profile
    getMyProfile,
    getMoltyProfile,
    updateProfile,
    checkClaimStatus,
    // Search
    semanticSearch,
    // Registration
    register,
  };
}
