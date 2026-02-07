/**
 * Twitter/X Tools
 *
 * Comprehensive X API integration using @xdevplatform/xdk (official SDK)
 * Supports OAuth 2.0 with PKCE flow for user authentication
 *
 * Features:
 * - Post management (create, read, delete, repost, quote)
 * - Replies and threading
 * - Likes and bookmarks
 * - Timeline and search (recent + full archive)
 * - User profiles, followers, and following
 * - Direct messages
 * - Lists
 * - Media uploads
 * - Post analytics & insights (NEW - XDK only)
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
import { Client } from "@xdevplatform/xdk";
import { billedTool } from "./billedTool";
import { X_API_PRICING } from "@/lib/x402/config";
import type { BillingContext } from "@/lib/x402";

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
 * Create Twitter API tools using the official @xdevplatform/xdk SDK
 *
 * Each tool is wrapped with billedTool() which auto-charges the user
 * the real X API pay-per-use cost via x402 when the tool succeeds.
 * Costs are sourced from X_API_PRICING (lib/x402/config.ts).
 *
 * @param accessToken - The user's OAuth 2.0 access token
 * @param billingContext - Optional x402 billing context for usage charging
 */
export function createTwitterTools(
  accessToken: string,
  billingContext?: BillingContext,
) {
  const client = new Client({ accessToken });

  // Cache the authenticated user's ID and username to avoid redundant
  // client.users.getMe() API calls. Each call consumes a rate limit token,
  // so calling it in every tool wastes 2x the rate budget.
  let cachedMe: { id: string; username: string } | null = null;

  async function getMe(): Promise<{ id: string; username: string }> {
    if (!cachedMe) {
      const response = await client.users.getMe({
        userFields: ["id", "username"],
      });
      cachedMe = {
        id: response.data!.id!,
        username: response.data!.username!,
      };
    }
    return cachedMe;
  }

  return {
    postTweet: billedTool(
      "postTweet",
      {
        description:
          "Post a new tweet to Twitter/X. Can include media attachments, replies, and quote tweets.",
        inputSchema: postTweetSchema,
        category: "X API",
        cost: X_API_PRICING.postTweet,
        execute: async (input: z.infer<typeof postTweetSchema>) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tweetBody: any = { text: input.text };

            if (input.mediaIds && input.mediaIds.length > 0) {
              tweetBody.media = { mediaIds: input.mediaIds };
            }

            if (input.replyToTweetId) {
              tweetBody.reply = { inReplyToTweetId: input.replyToTweetId };
            }

            if (input.quoteTweetId) {
              tweetBody.quoteTweetId = input.quoteTweetId;
            }

            const result = await client.posts.create(tweetBody);

            // Get the username for the tweet URL (cached)
            const me = await getMe();
            return {
              success: true,
              tweet: {
                id: result.data?.id,
                text: result.data?.text,
                url: `https://x.com/${me.username}/status/${result.data?.id}`,
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
      },
      billingContext,
    ),

    deleteTweet: billedTool(
      "deleteTweet",
      {
        description: "Delete one of your tweets",
        inputSchema: tweetIdSchema,
        category: "X API",
        cost: X_API_PRICING.deleteTweet,
        execute: async (input: z.infer<typeof tweetIdSchema>) => {
          try {
            await client.posts.delete(input.tweetId);
            return { success: true, message: "Tweet deleted successfully" };
          } catch (error: unknown) {
            const err = error as Error;
            return { error: `Failed to delete tweet: ${err.message}` };
          }
        },
      },
      billingContext,
    ),

    getTweet: billedTool(
      "getTweet",
      {
        description: "Get details about a specific tweet",
        inputSchema: getTweetSchema,
        category: "X API",
        cost: X_API_PRICING.getTweet,
        execute: async (input: z.infer<typeof getTweetSchema>) => {
          try {
            const tweet = await client.posts.getById(input.tweetId, {
              expansions: ["author_id", "attachments.media_keys"],
              tweetFields: input.includeMetrics
                ? ["created_at", "public_metrics", "conversation_id"]
                : ["created_at", "conversation_id"],
              userFields: ["username", "name", "profile_image_url"],
            });

            return { success: true, tweet: tweet.data };
          } catch (error: unknown) {
            const err = error as Error;
            return { error: `Failed to get tweet: ${err.message}` };
          }
        },
      },
      billingContext,
    ),

    likeTweet: billedTool(
      "likeTweet",
      {
        description: "Like a tweet",
        inputSchema: tweetIdSchema,
        category: "X API",
        cost: X_API_PRICING.likeTweet,
        execute: async (input: z.infer<typeof tweetIdSchema>) => {
          try {
            const me = await getMe();
            await client.users.likePost(me.id, {
              body: { tweetId: input.tweetId },
            });
            return { success: true, message: "Tweet liked successfully" };
          } catch (error: unknown) {
            const err = error as Error;
            return { error: `Failed to like tweet: ${err.message}` };
          }
        },
      },
      billingContext,
    ),

    unlikeTweet: billedTool(
      "unlikeTweet",
      {
        description: "Unlike a tweet",
        inputSchema: tweetIdSchema,
        category: "X API",
        cost: X_API_PRICING.unlikeTweet,
        execute: async (input: z.infer<typeof tweetIdSchema>) => {
          try {
            const me = await getMe();
            await client.users.unlikePost(me.id, input.tweetId);
            return { success: true, message: "Tweet unliked successfully" };
          } catch (error: unknown) {
            const err = error as Error;
            return { error: `Failed to unlike tweet: ${err.message}` };
          }
        },
      },
      billingContext,
    ),

    retweet: billedTool(
      "retweet",
      {
        description: "Repost/retweet a tweet",
        inputSchema: tweetIdSchema,
        category: "X API",
        cost: X_API_PRICING.retweet,
        execute: async (input: z.infer<typeof tweetIdSchema>) => {
          try {
            const me = await getMe();
            await client.users.repostPost(me.id, {
              body: { tweetId: input.tweetId },
            });
            return { success: true, message: "Reposted successfully" };
          } catch (error: unknown) {
            const err = error as Error;
            return { error: `Failed to repost: ${err.message}` };
          }
        },
      },
      billingContext,
    ),

    unretweet: billedTool(
      "unretweet",
      {
        description: "Remove a repost/retweet",
        inputSchema: tweetIdSchema,
        category: "X API",
        cost: X_API_PRICING.unretweet,
        execute: async (input: z.infer<typeof tweetIdSchema>) => {
          try {
            const me = await getMe();
            await client.users.unrepostPost(me.id, input.tweetId);
            return { success: true, message: "Unrepost successful" };
          } catch (error: unknown) {
            const err = error as Error;
            return { error: `Failed to unrepost: ${err.message}` };
          }
        },
      },
      billingContext,
    ),

    bookmarkTweet: billedTool(
      "bookmarkTweet",
      {
        description: "Bookmark a tweet for later",
        inputSchema: tweetIdSchema,
        category: "X API",
        cost: X_API_PRICING.bookmarkTweet,
        execute: async (input: z.infer<typeof tweetIdSchema>) => {
          try {
            const me = await getMe();
            await client.users.createBookmark(me.id, {
              tweetId: input.tweetId,
            });
            return { success: true, message: "Tweet bookmarked successfully" };
          } catch (error: unknown) {
            const err = error as Error;
            return { error: `Failed to bookmark tweet: ${err.message}` };
          }
        },
      },
      billingContext,
    ),

    removeBookmark: billedTool(
      "removeBookmark",
      {
        description: "Remove a bookmark from a tweet",
        inputSchema: tweetIdSchema,
        category: "X API",
        cost: X_API_PRICING.removeBookmark,
        execute: async (input: z.infer<typeof tweetIdSchema>) => {
          try {
            const me = await getMe();
            await client.users.deleteBookmark(me.id, input.tweetId);
            return { success: true, message: "Bookmark removed successfully" };
          } catch (error: unknown) {
            const err = error as Error;
            return { error: `Failed to remove bookmark: ${err.message}` };
          }
        },
      },
      billingContext,
    ),

    getHomeTimeline: billedTool(
      "getHomeTimeline",
      {
        description:
          "Get tweets from the authenticated user's reverse-chronological home timeline",
        inputSchema: timelineSchema,
        category: "X API",
        cost: X_API_PRICING.getHomeTimeline,
        execute: async (input: z.infer<typeof timelineSchema>) => {
          try {
            const me = await getMe();
            const timeline = await client.users.getTimeline(me.id, {
              maxResults: input.maxResults,
              tweetFields: ["created_at", "public_metrics", "conversation_id"],
              expansions: ["author_id"],
              userFields: ["username", "name", "profile_image_url"],
            });

            return {
              success: true,
              tweets: timeline.data || [],
              users: timeline.includes?.users || [],
            };
          } catch (error: unknown) {
            const err = error as Error;
            return { error: `Failed to get timeline: ${err.message}` };
          }
        },
      },
      billingContext,
    ),

    searchTweets: billedTool(
      "searchTweets",
      {
        description:
          "Search for recent tweets using X's search API (last 7 days)",
        inputSchema: searchTweetsSchema,
        category: "X API",
        cost: X_API_PRICING.searchTweets,
        execute: async (input: z.infer<typeof searchTweetsSchema>) => {
          try {
            const search = await client.posts.searchRecent(input.query, {
              maxResults: input.maxResults,
              startTime: input.startTime,
              tweetFields: ["created_at", "public_metrics", "author_id"],
              expansions: ["author_id"],
              userFields: ["username", "name", "profile_image_url"],
            });

            return {
              success: true,
              tweets: search.data || [],
              users: search.includes?.users || [],
              meta: search.meta,
            };
          } catch (error: unknown) {
            const err = error as Error;
            return { error: `Failed to search tweets: ${err.message}` };
          }
        },
      },
      billingContext,
    ),

    getUserProfile: billedTool(
      "getUserProfile",
      {
        description: "Get a Twitter user's profile information",
        inputSchema: usernameSchema,
        category: "X API",
        cost: X_API_PRICING.getUserProfile,
        execute: async (input: z.infer<typeof usernameSchema>) => {
          try {
            const user = await client.users.getByUsername(input.username, {
              userFields: [
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
      },
      billingContext,
    ),

    getMyProfile: billedTool(
      "getMyProfile",
      {
        description: "Get the authenticated user's own profile",
        inputSchema: z.object({}),
        category: "X API",
        cost: X_API_PRICING.getMyProfile,
        execute: async () => {
          try {
            const me = await client.users.getMe({
              userFields: [
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
      },
      billingContext,
    ),

    followUser: billedTool(
      "followUser",
      {
        description: "Follow a Twitter user",
        inputSchema: usernameSchema,
        category: "X API",
        cost: X_API_PRICING.followUser,
        execute: async (input: z.infer<typeof usernameSchema>) => {
          try {
            const me = await getMe();
            const targetUser = await client.users.getByUsername(input.username);
            await client.users.followUser(me.id, {
              body: { targetUserId: targetUser.data!.id! },
            });
            return {
              success: true,
              message: `Now following @${input.username}`,
            };
          } catch (error: unknown) {
            const err = error as Error;
            return { error: `Failed to follow user: ${err.message}` };
          }
        },
      },
      billingContext,
    ),

    unfollowUser: billedTool(
      "unfollowUser",
      {
        description: "Unfollow a Twitter user",
        inputSchema: usernameSchema,
        category: "X API",
        cost: X_API_PRICING.unfollowUser,
        execute: async (input: z.infer<typeof usernameSchema>) => {
          try {
            const me = await getMe();
            const targetUser = await client.users.getByUsername(input.username);
            await client.users.unfollowUser(me.id, targetUser.data!.id!);
            return { success: true, message: `Unfollowed @${input.username}` };
          } catch (error: unknown) {
            const err = error as Error;
            return { error: `Failed to unfollow user: ${err.message}` };
          }
        },
      },
      billingContext,
    ),

    getFollowers: billedTool(
      "getFollowers",
      {
        description: "Get a list of followers for a user",
        inputSchema: followersSchema,
        category: "X API",
        cost: X_API_PRICING.getFollowers,
        execute: async (input: z.infer<typeof followersSchema>) => {
          try {
            let userId: string;

            if (input.username) {
              const user = await client.users.getByUsername(input.username);
              userId = user.data!.id!;
            } else {
              const me = await getMe();
              userId = me.id;
            }

            const followers = await client.users.getFollowers(userId, {
              maxResults: input.maxResults,
              userFields: [
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
      },
      billingContext,
    ),

    getFollowing: billedTool(
      "getFollowing",
      {
        description: "Get a list of users that someone is following",
        inputSchema: followersSchema,
        category: "X API",
        cost: X_API_PRICING.getFollowing,
        execute: async (input: z.infer<typeof followersSchema>) => {
          try {
            let userId: string;

            if (input.username) {
              const user = await client.users.getByUsername(input.username);
              userId = user.data!.id!;
            } else {
              const me = await getMe();
              userId = me.id;
            }

            const following = await client.users.getFollowing(userId, {
              maxResults: input.maxResults,
              userFields: [
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
      },
      billingContext,
    ),

    uploadMedia: billedTool(
      "uploadMedia",
      {
        description:
          "Upload media (image, video, or GIF) to Twitter for use in tweets",
        inputSchema: uploadMediaSchema,
        category: "X API",
        cost: X_API_PRICING.uploadMedia,
        execute: async (input: z.infer<typeof uploadMediaSchema>) => {
          try {
            // Fetch the media from the URL
            const response = await fetch(input.mediaUrl);
            if (!response.ok) {
              return { error: "Failed to fetch media from URL" };
            }

            const buffer = Buffer.from(await response.arrayBuffer());

            // Upload to Twitter using v1.1 media upload endpoint
            // This works with OAuth 2.0 access tokens
            const formData = new FormData();
            formData.append("media_data", buffer.toString("base64"));

            const uploadResponse = await fetch(
              "https://upload.twitter.com/1.1/media/upload.json",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
                body: formData,
              },
            );

            if (!uploadResponse.ok) {
              const errorText = await uploadResponse.text();
              return {
                error: `Media upload failed: ${uploadResponse.status} ${errorText}`,
              };
            }

            const uploadResult = await uploadResponse.json();
            const mediaId = uploadResult.media_id_string;

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
      },
      billingContext,
    ),

    sendDirectMessage: billedTool(
      "sendDirectMessage",
      {
        description: "Send a direct message to a Twitter user",
        inputSchema: sendDMSchema,
        category: "X API",
        cost: X_API_PRICING.sendDirectMessage,
        execute: async (input: z.infer<typeof sendDMSchema>) => {
          try {
            const targetUser = await client.users.getByUsername(input.username);
            const dm = await client.directMessages.createByParticipantId(
              targetUser.data!.id!,
              {
                body: { text: input.text },
              },
            );

            return {
              success: true,
              messageId: dm.data?.dmEventId ?? dm.data?.dm_event_id,
              message: "Direct message sent successfully",
            };
          } catch (error: unknown) {
            const err = error as Error;
            return { error: `Failed to send DM: ${err.message}` };
          }
        },
      },
      billingContext,
    ),

    createList: billedTool(
      "createList",
      {
        description: "Create a new Twitter list",
        inputSchema: createListSchema,
        category: "X API",
        cost: X_API_PRICING.createList,
        execute: async (input: z.infer<typeof createListSchema>) => {
          try {
            const list = await client.lists.create({
              body: {
                name: input.name,
                description: input.description,
                private: input.private,
              },
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
      },
      billingContext,
    ),

    addToList: billedTool(
      "addToList",
      {
        description: "Add a user to a Twitter list",
        inputSchema: addToListSchema,
        category: "X API",
        cost: X_API_PRICING.addToList,
        execute: async (input: z.infer<typeof addToListSchema>) => {
          try {
            const user = await client.users.getByUsername(input.username);
            await client.lists.addMember(input.listId, {
              body: { userId: user.data!.id! },
            });

            return {
              success: true,
              message: `@${input.username} added to list successfully`,
            };
          } catch (error: unknown) {
            const err = error as Error;
            return { error: `Failed to add to list: ${err.message}` };
          }
        },
      },
      billingContext,
    ),
  };
}

/**
 * Helper function to refresh an expired Twitter access token
 * Uses direct OAuth 2.0 token endpoint (no library dependency)
 * Returns the new access token and expiration, or null if refresh fails
 */
export async function refreshTwitterToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  try {
    const clientId = process.env.TWITTER_CLIENT_ID!;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET!;

    const response = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        `Twitter token refresh failed: ${response.status} ${errorData}`,
      );
      return null;
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error("Failed to refresh Twitter token:", error);
    return null;
  }
}
