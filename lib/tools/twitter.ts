/**
 * Twitter Tools
 *
 * Comprehensive Twitter API integration using twitter-api-v2
 * Supports OAuth 2.0 with PKCE flow for user authentication
 *
 * Features:
 * - Tweet management (post, read, delete, retweet, quote)
 * - Replies and threading
 * - Likes and bookmarks
 * - Timeline and search
 * - User profiles and followers
 * - Direct messages
 * - Lists
 * - Media uploads
 *
 * Note: These tools require user authentication via OAuth 2.0.
 * Users must connect their Twitter account before using these tools.
 *
 * For onboarding, use createTwitterOnboardingTools() which provides
 * checkTwitterConnection and getTwitterAuthUrl tools that work without
 * an access token and help users connect their account.
 */

import { tool } from "ai";
import { z } from "zod";
import { TwitterApi } from "twitter-api-v2";

// ============================================================================
// Twitter Onboarding Tools
// These tools help users connect their Twitter account via OAuth
// They work WITHOUT an access token and should always be available
// ============================================================================

/**
 * Get the base URL for the app (for constructing OAuth URLs)
 */
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * Context for Twitter onboarding tools
 */
export interface TwitterOnboardingContext {
  userId: string;
  isConnected: boolean;
  username?: string;
  connectedAt?: Date;
  tokenExpiresAt?: Date;
}

/**
 * Create a tool that reports Twitter connection issues
 * Used when a previously connected account has expired/broken tokens
 *
 * @param userId - The user's ID for generating reconnection URL
 * @param reason - The reason the connection is broken
 */
export function createTwitterConnectionBrokenTool(
  userId: string,
  reason: "expired" | "refresh_failed" | "no_refresh_token",
) {
  const reasonMessages = {
    expired: "Your Twitter session has expired.",
    refresh_failed: "We couldn't refresh your Twitter connection.",
    no_refresh_token: "Your Twitter connection needs to be re-established.",
  };

  return {
    twitterConnectionExpired: tool({
      description:
        "Reports that the Twitter/X connection has expired and needs to be reconnected. Call this when a user tries to use Twitter features but their connection is broken.",
      inputSchema: z.object({}),
      execute: async () => {
        const authUrl = `${getBaseUrl()}/api/twitter/oauth/authorize?userId=${encodeURIComponent(userId)}`;

        return {
          connectionBroken: true,
          reason: reasonMessages[reason],
          authUrl,
          message: [
            `⚠️ ${reasonMessages[reason]}`,
            "",
            "Your Twitter/X account was previously connected, but the connection has expired.",
            "",
            "**Please reconnect to continue using Twitter features:**",
            "",
            `[Reconnect Twitter/X](${authUrl})`,
            "",
            "This only takes a moment and your preferences will be preserved.",
          ].join("\n"),
        };
      },
    }),
  };
}

/**
 * Create Twitter onboarding tools for checking connection and getting OAuth URL
 *
 * These tools should ALWAYS be included when the Twitter tool group is enabled,
 * regardless of whether the user is connected. They allow the AI to:
 * 1. Check if the user has connected their Twitter account
 * 2. Provide an OAuth authorization URL for the user to click
 *
 * @param context - User's Twitter connection status
 */
export function createTwitterOnboardingTools(
  context: TwitterOnboardingContext,
) {
  return {
    checkTwitterConnection: tool({
      description:
        "Check if the user has connected their Twitter/X account. Always call this first before attempting any Twitter action to determine if Twitter tools are available.",
      inputSchema: z.object({}),
      execute: async () => {
        if (context.isConnected && context.username) {
          return {
            connected: true,
            username: context.username,
            connectedAt: context.connectedAt?.toISOString(),
            tokenExpiresAt: context.tokenExpiresAt?.toISOString(),
            message: `Twitter is connected as @${context.username}. You can now use Twitter tools like postTweet, searchTweets, etc.`,
          };
        }

        return {
          connected: false,
          message:
            "Twitter is not connected. Use getTwitterAuthUrl to get a link for the user to authorize their Twitter account.",
        };
      },
    }),

    getTwitterAuthUrl: tool({
      description:
        "Get the Twitter/X OAuth authorization URL. Returns a clickable link that the user must click to connect their Twitter account. Use this when Twitter is not connected and the user wants to use Twitter features.",
      inputSchema: z.object({}),
      execute: async () => {
        if (context.isConnected && context.username) {
          return {
            alreadyConnected: true,
            username: context.username,
            message: `Twitter is already connected as @${context.username}. All Twitter tools are available.`,
          };
        }

        const authUrl = `${getBaseUrl()}/api/twitter/oauth/authorize?userId=${encodeURIComponent(context.userId)}`;

        return {
          authUrl,
          message: [
            "To use Twitter features, you need to connect your account.",
            "",
            "**Click here to connect your Twitter/X account:**",
            "",
            `[Connect Twitter/X](${authUrl})`,
            "",
            "After authorizing, you'll be redirected back and your Twitter tools will be activated.",
            "",
            "This grants the following permissions:",
            "• Read and write tweets",
            "• Read and manage followers",
            "• Read and write likes & bookmarks",
            "• Read and send direct messages",
            "• Manage lists",
          ].join("\n"),
        };
      },
    }),
  };
}

// ============================================================================
// Twitter API Tools
// These tools require a valid access token from OAuth
// ============================================================================

// Schema definitions
const postTweetSchema = z.object({
  text: z
    .string()
    .max(280)
    .describe("The text content of the tweet (max 280 characters)"),
  mediaIds: z
    .array(z.string())
    .optional()
    .describe("Array of media IDs to attach to the tweet"),
  replyToTweetId: z.string().optional().describe("Tweet ID to reply to"),
  quoteTweetId: z.string().optional().describe("Tweet ID to quote"),
});

const tweetIdSchema = z.object({
  tweetId: z.string().describe("The ID of the tweet"),
});

const getTweetSchema = z.object({
  tweetId: z.string().describe("The ID of the tweet to retrieve"),
  includeMetrics: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include engagement metrics"),
});

const timelineSchema = z.object({
  maxResults: z
    .number()
    .min(5)
    .max(100)
    .default(20)
    .describe("Number of tweets to retrieve"),
});

const searchTweetsSchema = z.object({
  query: z
    .string()
    .describe("Search query (supports Twitter search operators)"),
  maxResults: z
    .number()
    .min(10)
    .max(100)
    .default(20)
    .describe("Number of results to return"),
  startTime: z
    .string()
    .optional()
    .describe("ISO 8601 datetime to start search from"),
});

const usernameSchema = z.object({
  username: z.string().describe("Twitter username (without @)"),
});

const followersSchema = z.object({
  username: z
    .string()
    .optional()
    .describe("Username to get followers for (defaults to authenticated user)"),
  maxResults: z
    .number()
    .min(1)
    .max(100)
    .default(20)
    .describe("Number of followers to retrieve"),
});

const uploadMediaSchema = z.object({
  mediaUrl: z.string().url().describe("URL of the media to upload"),
  mediaType: z
    .enum(["image/jpeg", "image/png", "image/gif", "video/mp4"])
    .describe("MIME type of the media"),
});

const sendDMSchema = z.object({
  username: z.string().describe("Username to send message to (without @)"),
  text: z.string().max(10000).describe("Message text"),
});

const createListSchema = z.object({
  name: z.string().max(25).describe("Name of the list"),
  description: z
    .string()
    .max(100)
    .optional()
    .describe("Description of the list"),
  private: z
    .boolean()
    .default(false)
    .describe("Whether the list should be private"),
});

const addToListSchema = z.object({
  listId: z.string().describe("ID of the list"),
  username: z.string().describe("Username to add to the list (without @)"),
});

/**
 * Helper to get Twitter client with user's stored credentials
 * This should be called from the chat API route which has access to the user context
 */
export function createTwitterTools(accessToken: string) {
  const client = new TwitterApi(accessToken);

  return {
    postTweet: tool({
      description:
        "Post a new tweet to Twitter. Can include media attachments.",
      inputSchema: postTweetSchema,
      execute: async (input: z.infer<typeof postTweetSchema>) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const tweetData: any = { text: input.text };

          if (input.mediaIds && input.mediaIds.length > 0) {
            tweetData.media = { media_ids: input.mediaIds };
          }

          if (input.replyToTweetId) {
            tweetData.reply = { in_reply_to_tweet_id: input.replyToTweetId };
          }

          if (input.quoteTweetId) {
            tweetData.quote_tweet_id = input.quoteTweetId;
          }

          const tweet = await client.v2.tweet(tweetData);

          // Get the username for the tweet URL
          const me = await client.v2.me();
          return {
            success: true,
            tweet: {
              id: tweet.data.id,
              text: tweet.data.text,
              url: `https://twitter.com/${me.data.username}/status/${tweet.data.id}`,
            },
          };
        } catch (error: unknown) {
          const err = error as Error & { data?: unknown };
          return {
            error: `Failed to post tweet: ${err.message}`,
            details: err.data || err,
          };
        }
      },
    }),

    deleteTweet: tool({
      description: "Delete one of your tweets",
      inputSchema: tweetIdSchema,
      execute: async (input: z.infer<typeof tweetIdSchema>) => {
        try {
          await client.v2.deleteTweet(input.tweetId);
          return { success: true, message: "Tweet deleted successfully" };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to delete tweet: ${err.message}` };
        }
      },
    }),

    getTweet: tool({
      description: "Get details about a specific tweet",
      inputSchema: getTweetSchema,
      execute: async (input: z.infer<typeof getTweetSchema>) => {
        try {
          const tweet = await client.v2.singleTweet(input.tweetId, {
            expansions: ["author_id", "attachments.media_keys"],
            "tweet.fields": input.includeMetrics
              ? ["created_at", "public_metrics", "conversation_id"]
              : ["created_at", "conversation_id"],
            "user.fields": ["username", "name", "profile_image_url"],
          });

          return { success: true, tweet: tweet.data };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to get tweet: ${err.message}` };
        }
      },
    }),

    likeTweet: tool({
      description: "Like a tweet",
      inputSchema: tweetIdSchema,
      execute: async (input: z.infer<typeof tweetIdSchema>) => {
        try {
          const me = await client.v2.me();
          await client.v2.like(me.data.id, input.tweetId);
          return { success: true, message: "Tweet liked successfully" };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to like tweet: ${err.message}` };
        }
      },
    }),

    unlikeTweet: tool({
      description: "Unlike a tweet",
      inputSchema: tweetIdSchema,
      execute: async (input: z.infer<typeof tweetIdSchema>) => {
        try {
          const me = await client.v2.me();
          await client.v2.unlike(me.data.id, input.tweetId);
          return { success: true, message: "Tweet unliked successfully" };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to unlike tweet: ${err.message}` };
        }
      },
    }),

    retweet: tool({
      description: "Retweet a tweet",
      inputSchema: tweetIdSchema,
      execute: async (input: z.infer<typeof tweetIdSchema>) => {
        try {
          const me = await client.v2.me();
          await client.v2.retweet(me.data.id, input.tweetId);
          return { success: true, message: "Retweeted successfully" };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to retweet: ${err.message}` };
        }
      },
    }),

    unretweet: tool({
      description: "Remove a retweet",
      inputSchema: tweetIdSchema,
      execute: async (input: z.infer<typeof tweetIdSchema>) => {
        try {
          const me = await client.v2.me();
          await client.v2.unretweet(me.data.id, input.tweetId);
          return { success: true, message: "Unretweet successful" };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to unretweet: ${err.message}` };
        }
      },
    }),

    bookmarkTweet: tool({
      description: "Bookmark a tweet for later",
      inputSchema: tweetIdSchema,
      execute: async (input: z.infer<typeof tweetIdSchema>) => {
        try {
          await client.v2.bookmark(input.tweetId);
          return { success: true, message: "Tweet bookmarked successfully" };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to bookmark tweet: ${err.message}` };
        }
      },
    }),

    removeBookmark: tool({
      description: "Remove a bookmark from a tweet",
      inputSchema: tweetIdSchema,
      execute: async (input: z.infer<typeof tweetIdSchema>) => {
        try {
          await client.v2.deleteBookmark(input.tweetId);
          return { success: true, message: "Bookmark removed successfully" };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to remove bookmark: ${err.message}` };
        }
      },
    }),

    getHomeTimeline: tool({
      description: "Get tweets from the authenticated user's home timeline",
      inputSchema: timelineSchema,
      execute: async (input: z.infer<typeof timelineSchema>) => {
        try {
          const me = await client.v2.me();
          const timeline = await client.v2.userTimeline(me.data.id, {
            max_results: input.maxResults,
            "tweet.fields": ["created_at", "public_metrics", "conversation_id"],
            expansions: ["author_id"],
            "user.fields": ["username", "name", "profile_image_url"],
          });

          return {
            success: true,
            tweets: timeline.data.data,
            users: timeline.includes?.users || [],
          };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to get timeline: ${err.message}` };
        }
      },
    }),

    searchTweets: tool({
      description: "Search for tweets using Twitter's search API",
      inputSchema: searchTweetsSchema,
      execute: async (input: z.infer<typeof searchTweetsSchema>) => {
        try {
          const search = await client.v2.search(input.query, {
            max_results: input.maxResults,
            start_time: input.startTime,
            "tweet.fields": ["created_at", "public_metrics", "author_id"],
            expansions: ["author_id"],
            "user.fields": ["username", "name", "profile_image_url"],
          });

          return {
            success: true,
            tweets: search.data.data || [],
            users: search.includes?.users || [],
            meta: search.meta,
          };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to search tweets: ${err.message}` };
        }
      },
    }),

    getUserProfile: tool({
      description: "Get a Twitter user's profile information",
      inputSchema: usernameSchema,
      execute: async (input: z.infer<typeof usernameSchema>) => {
        try {
          const user = await client.v2.userByUsername(input.username, {
            "user.fields": [
              "created_at",
              "description",
              "location",
              "profile_image_url",
              "public_metrics",
              "url",
              "verified",
            ],
          });

          return { success: true, user: user.data };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to get user profile: ${err.message}` };
        }
      },
    }),

    getMyProfile: tool({
      description: "Get the authenticated user's own profile",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const me = await client.v2.me({
            "user.fields": [
              "created_at",
              "description",
              "location",
              "profile_image_url",
              "public_metrics",
              "url",
              "verified",
            ],
          });

          return { success: true, user: me.data };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to get profile: ${err.message}` };
        }
      },
    }),

    followUser: tool({
      description: "Follow a Twitter user",
      inputSchema: usernameSchema,
      execute: async (input: z.infer<typeof usernameSchema>) => {
        try {
          const me = await client.v2.me();
          const targetUser = await client.v2.userByUsername(input.username);
          await client.v2.follow(me.data.id, targetUser.data.id);
          return { success: true, message: `Now following @${input.username}` };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to follow user: ${err.message}` };
        }
      },
    }),

    unfollowUser: tool({
      description: "Unfollow a Twitter user",
      inputSchema: usernameSchema,
      execute: async (input: z.infer<typeof usernameSchema>) => {
        try {
          const me = await client.v2.me();
          const targetUser = await client.v2.userByUsername(input.username);
          await client.v2.unfollow(me.data.id, targetUser.data.id);
          return { success: true, message: `Unfollowed @${input.username}` };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to unfollow user: ${err.message}` };
        }
      },
    }),

    getFollowers: tool({
      description: "Get a list of followers for a user",
      inputSchema: followersSchema,
      execute: async (input: z.infer<typeof followersSchema>) => {
        try {
          let userId: string;

          if (input.username) {
            const user = await client.v2.userByUsername(input.username);
            userId = user.data.id;
          } else {
            const me = await client.v2.me();
            userId = me.data.id;
          }

          const followers = await client.v2.followers(userId, {
            max_results: input.maxResults,
            "user.fields": [
              "username",
              "name",
              "profile_image_url",
              "public_metrics",
            ],
          });

          return {
            success: true,
            followers: followers.data || [],
            meta: followers.meta,
          };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to get followers: ${err.message}` };
        }
      },
    }),

    getFollowing: tool({
      description: "Get a list of users that someone is following",
      inputSchema: followersSchema,
      execute: async (input: z.infer<typeof followersSchema>) => {
        try {
          let userId: string;

          if (input.username) {
            const user = await client.v2.userByUsername(input.username);
            userId = user.data.id;
          } else {
            const me = await client.v2.me();
            userId = me.data.id;
          }

          const following = await client.v2.following(userId, {
            max_results: input.maxResults,
            "user.fields": [
              "username",
              "name",
              "profile_image_url",
              "public_metrics",
            ],
          });

          return {
            success: true,
            following: following.data || [],
            meta: following.meta,
          };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to get following: ${err.message}` };
        }
      },
    }),

    uploadMedia: tool({
      description:
        "Upload media (image, video, or GIF) to Twitter for use in tweets",
      inputSchema: uploadMediaSchema,
      execute: async (input: z.infer<typeof uploadMediaSchema>) => {
        try {
          // Fetch the media
          const response = await fetch(input.mediaUrl);
          if (!response.ok) {
            return { error: "Failed to fetch media from URL" };
          }

          const buffer = Buffer.from(await response.arrayBuffer());

          // Upload to Twitter
          const mediaId = await client.v1.uploadMedia(buffer, {
            mimeType: input.mediaType,
          });

          return {
            success: true,
            mediaId,
            message:
              "Media uploaded successfully. Use this mediaId when posting a tweet.",
          };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to upload media: ${err.message}` };
        }
      },
    }),

    sendDirectMessage: tool({
      description: "Send a direct message to a Twitter user",
      inputSchema: sendDMSchema,
      execute: async (input: z.infer<typeof sendDMSchema>) => {
        try {
          const targetUser = await client.v2.userByUsername(input.username);
          const dm = await client.v2.sendDmToParticipant(targetUser.data.id, {
            text: input.text,
          });

          return {
            success: true,
            messageId: dm.dm_event_id,
            message: "Direct message sent successfully",
          };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to send DM: ${err.message}` };
        }
      },
    }),

    createList: tool({
      description: "Create a new Twitter list",
      inputSchema: createListSchema,
      execute: async (input: z.infer<typeof createListSchema>) => {
        try {
          const list = await client.v2.createList({
            name: input.name,
            description: input.description,
            private: input.private,
          });

          return {
            success: true,
            list: list.data,
            message: "List created successfully",
          };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to create list: ${err.message}` };
        }
      },
    }),

    addToList: tool({
      description: "Add a user to a Twitter list",
      inputSchema: addToListSchema,
      execute: async (input: z.infer<typeof addToListSchema>) => {
        try {
          const user = await client.v2.userByUsername(input.username);
          await client.v2.addListMember(input.listId, user.data.id);

          return {
            success: true,
            message: `@${input.username} added to list successfully`,
          };
        } catch (error: unknown) {
          const err = error as Error;
          return { error: `Failed to add to list: ${err.message}` };
        }
      },
    }),
  };
}

/**
 * Helper function to refresh an expired Twitter access token
 * Returns the new access token and expiration, or null if refresh fails
 */
export async function refreshTwitterToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  try {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    });

    const {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
    } = await client.refreshOAuth2Token(refreshToken);

    return {
      accessToken,
      refreshToken: newRefreshToken || refreshToken,
      expiresIn,
    };
  } catch (error) {
    console.error("Failed to refresh Twitter token:", error);
    return null;
  }
}
