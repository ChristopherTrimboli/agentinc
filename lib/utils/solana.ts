/**
 * Solana Utility Functions
 *
 * Pure utility functions for working with Solana amounts.
 * Client-safe (no Node.js dependencies).
 */

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

/**
 * Format lamports to SOL string for display
 */
export function lamportsToSol(lamports: bigint): string {
  const sol = Number(lamports) / LAMPORTS_PER_SOL;
  if (sol < 0.000001) return "<0.000001";
  if (sol < 0.001) return sol.toFixed(8); // Show full precision for tiny amounts
  if (sol < 1) return sol.toFixed(6); // 6 decimals for amounts under 1 SOL
  return sol.toFixed(4); // 4 decimals for larger amounts
}
