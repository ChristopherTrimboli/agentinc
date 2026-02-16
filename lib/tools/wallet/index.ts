/**
 * Wallet Tools
 *
 * AI agent tools for managing the user's active Privy wallet:
 * - Read: SOL balance, token holdings, transaction history
 * - Analyze: Token holder lookups (top N holders of any mint)
 * - Write: SOL transfers, SPL token transfers, batch airdrops
 *
 * Write operations use AI SDK `requireApproval: true` for human-in-the-loop
 * confirmation — every transfer must be explicitly approved by the user.
 *
 * Usage:
 * ```typescript
 * import { createWalletTools } from "@/lib/tools/wallet";
 *
 * const walletTools = createWalletTools({
 *   userId: "did:privy:xxx",
 *   walletId: "wallet_xxx",
 *   walletAddress: "ABC123...",
 * });
 *
 * // Pass to streamText
 * streamText({ tools: { ...walletTools, ...otherTools }, ... });
 * ```
 */

import type { ToolMap } from "../types";
import type { WalletToolContext } from "./types";
import { createWalletReadTools } from "./read";
import { createTokenHolderTools } from "./holders";
import { createWalletWriteTools } from "./write";

// Re-export types
export type { WalletToolContext } from "./types";
export {
  MAX_BATCH_RECIPIENTS,
  MAX_TOTAL_BATCH_RECIPIENTS,
  WALLET_TRANSFER_RATE_LIMIT,
} from "./types";

/**
 * Create all wallet tools for a given user context.
 *
 * @param ctx - User wallet context (userId, walletId, walletAddress, etc.)
 * @returns ToolMap containing all wallet tools
 */
export function createWalletTools(ctx: WalletToolContext): ToolMap {
  return {
    ...createWalletReadTools(ctx),
    ...createTokenHolderTools(),
    ...createWalletWriteTools(ctx),
  };
}
