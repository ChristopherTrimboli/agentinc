/**
 * Tool Cost Mapping
 *
 * Maps tool function IDs to their USD cost per use.
 * Used by the UI to display cost indicators in the ToolPanel and ToolExecution components.
 *
 * Costs are sourced from the pricing configs in @/lib/x402/config.ts
 */

import {
  X_API_PRICING,
  TWILIO_PRICING,
  IMAGE_GEN_PRICING,
  KNOWLEDGE_PRICING,
} from "./config";
import { formatCost } from "./billing";

/**
 * Complete mapping of tool function ID → USD cost per use.
 * Tools not listed here are free (utility tools like weather, crypto, etc.)
 */
export const TOOL_COSTS: Record<string, number> = {
  // Image Generation
  generateImage: IMAGE_GEN_PRICING.generateImage,

  // Knowledge Base (RAG)
  addResource: KNOWLEDGE_PRICING.addResource,
  getInformation: KNOWLEDGE_PRICING.getInformation,
  removeResource: KNOWLEDGE_PRICING.removeResource,

  // Twitter/X API
  getTweet: X_API_PRICING.getTweet,
  searchTweets: X_API_PRICING.searchTweets,
  getHomeTimeline: X_API_PRICING.getHomeTimeline,
  getUserProfile: X_API_PRICING.getUserProfile,
  getMyProfile: X_API_PRICING.getMyProfile,
  getFollowers: X_API_PRICING.getFollowers,
  getFollowing: X_API_PRICING.getFollowing,
  postTweet: X_API_PRICING.postTweet,
  deleteTweet: X_API_PRICING.deleteTweet,
  likeTweet: X_API_PRICING.likeTweet,
  unlikeTweet: X_API_PRICING.unlikeTweet,
  retweet: X_API_PRICING.retweet,
  unretweet: X_API_PRICING.unretweet,
  bookmarkTweet: X_API_PRICING.bookmarkTweet,
  removeBookmark: X_API_PRICING.removeBookmark,
  followUser: X_API_PRICING.followUser,
  unfollowUser: X_API_PRICING.unfollowUser,
  sendDirectMessage: X_API_PRICING.sendDirectMessage,
  uploadMedia: X_API_PRICING.uploadMedia,
  createList: X_API_PRICING.createList,
  addToList: X_API_PRICING.addToList,

  // Twilio Communications
  sendSms: TWILIO_PRICING.sendSms,
  sendMms: TWILIO_PRICING.sendMms,
  sendImage: TWILIO_PRICING.sendImage,
  makeCall: TWILIO_PRICING.makeCall,
  playAudioCall: TWILIO_PRICING.playAudioCall,
  sendWhatsApp: TWILIO_PRICING.sendWhatsApp,
  checkMessageStatus: TWILIO_PRICING.checkMessageStatus,
  checkCallStatus: TWILIO_PRICING.checkCallStatus,
  getMessageHistory: TWILIO_PRICING.getMessageHistory,
  checkTwilioConfig: TWILIO_PRICING.checkTwilioConfig,
};

/**
 * Get the cost for a tool function by ID.
 * Returns 0 for free tools (utility tools).
 */
export function getToolCost(toolId: string): number {
  return TOOL_COSTS[toolId] ?? 0;
}

/**
 * Get a formatted cost string for a tool function.
 * Returns null for free tools.
 */
export function getToolCostLabel(toolId: string): string | null {
  const cost = getToolCost(toolId);
  if (cost <= 0) return null;
  return formatCost(cost);
}

/**
 * Check if a tool has a cost (is billed).
 */
export function isToolBilled(toolId: string): boolean {
  return getToolCost(toolId) > 0;
}
