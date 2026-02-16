/**
 * Wallet Tool Types
 *
 * Shared interfaces for the wallet tool group.
 * These tools give AI agents custodial access to the user's active Privy wallet
 * for reading balances, looking up token holders, and executing transfers.
 */

import type { BillingContext } from "@/lib/x402";

/** Context required to create wallet tools — injected from the chat API route */
export interface WalletToolContext {
  userId: string;
  walletId: string; // Privy wallet ID for server-side signing
  walletAddress: string; // Solana public key
  agentId?: string;
  chatId?: string;
  billingContext?: BillingContext;
}

/** Token balance entry returned by getTokenBalances */
export interface TokenBalance {
  mint: string;
  symbol?: string;
  name?: string;
  amount: string; // Raw amount (base units)
  uiAmount: number; // Human-readable amount
  decimals: number;
  imageUrl?: string;
}

/** Token holder entry returned by getTokenHolders */
export interface TokenHolder {
  address: string;
  amount: string; // Raw amount (base units)
  uiAmount: number; // Human-readable amount
  percentage: number; // Percentage of total supply
}

/** Transaction history entry */
export interface TransactionEntry {
  signature: string;
  timestamp: number | null;
  type: string; // "transfer", "token_transfer", "swap", "unknown"
  status: "success" | "failed";
  fee: number; // In lamports
  description?: string;
}

/** Result of a single transfer operation */
export interface TransferResult {
  signature: string;
  success: boolean;
  error?: string;
}

/** Result of a batch transfer operation */
export interface BatchTransferResult {
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  transactions: Array<{
    signature?: string;
    success: boolean;
    recipientCount: number;
    error?: string;
  }>;
}

/** Max recipients per batch transfer (Solana tx size constraint) */
export const MAX_BATCH_RECIPIENTS = 20;

/** Max recipients allowed in a single batchTransferTokens call */
export const MAX_TOTAL_BATCH_RECIPIENTS = 100;

/** Rate limit: transfers per minute per user */
export const WALLET_TRANSFER_RATE_LIMIT = 5;
