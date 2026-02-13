/**
 * Billing Utilities
 *
 * Helper functions for formatting and displaying costs.
 *
 * For actual cost calculation, use:
 * - @/lib/x402/ai-gateway-cost for AI model pricing
 * - @/lib/x402/sol-facilitator for USD to SOL conversion
 */

import { lamportsToSol } from "@/lib/utils/solana";

/**
 * Format a USD cost for display.
 * Handles micro-amounts (cents), small amounts, and normal amounts.
 *
 * @param usd - Cost in USD
 * @returns Formatted string (e.g., "0.50¢", "$0.0123", "$1.50")
 */
export function formatCost(usd: number): string {
  if (usd < 0) {
    return `-${formatCost(Math.abs(usd))}`;
  }
  if (usd === 0) {
    return "$0.00";
  }
  if (usd < 0.01) {
    // Show in cents for very small amounts
    const cents = usd * 100;
    return `${cents.toFixed(2)}¢`;
  }
  if (usd < 1) {
    // Show 4 decimal places for amounts under $1
    return `$${usd.toFixed(4)}`;
  }
  // Show 2 decimal places for larger amounts
  return `$${usd.toFixed(2)}`;
}

/**
 * Format lamports for display with " SOL" suffix.
 *
 * @param lamports - Amount in lamports
 * @returns Formatted SOL string (e.g., "0.001234 SOL")
 */
export function formatLamports(lamports: bigint | number): string {
  return `${lamportsToSol(BigInt(lamports))} SOL`;
}
