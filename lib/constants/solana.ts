import { Connection } from "@solana/web3.js";

/**
 * Solana RPC URL - uses environment variable with Helius as fallback.
 */
export const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://mainnet.helius-rpc.com";

/**
 * Jito block engine endpoints for priority transaction landing.
 */
export const JITO_ENDPOINTS = [
  "https://mainnet.block-engine.jito.wtf/api/v1/transactions",
  "https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/transactions",
  "https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/transactions",
  "https://ny.mainnet.block-engine.jito.wtf/api/v1/transactions",
  "https://tokyo.mainnet.block-engine.jito.wtf/api/v1/transactions",
] as const;

/**
 * Fallback RPC endpoints for transaction submission.
 */
export const FALLBACK_RPC_URLS = [
  SOLANA_RPC_URL,
  "https://rpc.ankr.com/solana",
] as const;

/**
 * Default connection commitment level.
 */
export const DEFAULT_COMMITMENT = "confirmed" as const;

/**
 * Get a Solana connection with the default RPC URL.
 */
export function getConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, DEFAULT_COMMITMENT);
}
