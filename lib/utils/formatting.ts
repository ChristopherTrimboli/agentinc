/**
 * Shared formatting utilities used across the app
 */

/**
 * Format a price in USD with appropriate precision
 */
export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return "$0.00";

  if (price < 0.0001) {
    return `$${price.toExponential(2)}`;
  } else if (price < 0.01) {
    return `$${price.toFixed(6)}`;
  } else if (price < 1) {
    return `$${price.toFixed(4)}`;
  } else if (price < 1000) {
    return `$${price.toFixed(2)}`;
  } else {
    return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
}

/**
 * Format a number with K/M/B suffixes
 */
export function formatCompactNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return "0";

  const absNum = Math.abs(num);

  if (absNum >= 1e9) {
    return `${(num / 1e9).toFixed(1)}B`;
  } else if (absNum >= 1e6) {
    return `${(num / 1e6).toFixed(1)}M`;
  } else if (absNum >= 1e3) {
    return `${(num / 1e3).toFixed(1)}K`;
  }

  return num.toFixed(0);
}

/**
 * Format SOL amount
 */
export function formatSol(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "0 SOL";

  if (amount < 0.0001) {
    return `${amount.toExponential(2)} SOL`;
  } else if (amount < 1) {
    return `${amount.toFixed(4)} SOL`;
  } else {
    return `${amount.toFixed(2)} SOL`;
  }
}

/**
 * Truncate a wallet address for display
 */
export function truncateAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Sanitize a user ID for logging (shows first 8 chars only)
 */
export function sanitizeUserId(userId: string): string {
  if (!userId || userId.length <= 8) return userId;
  return `${userId.slice(0, 8)}...`;
}

/**
 * Sanitize a wallet address for logging (shows first 4 and last 4 chars)
 */
export function sanitizeWalletAddress(address: string): string {
  return truncateAddress(address, 4);
}

/**
 * Sanitize a transaction signature for logging (shows first 8 and last 4 chars)
 */
export function sanitizeTxSignature(signature: string): string {
  if (!signature || signature.length <= 16) return signature;
  return `${signature.slice(0, 8)}...${signature.slice(-4)}`;
}

/**
 * Format a date relative to now
 */
export function formatRelativeTime(
  date: Date | string | null | undefined,
): string {
  if (!date) return "Unknown";

  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString();
}

/**
 * Format market cap
 */
export function formatMarketCap(marketCap: number | null | undefined): string {
  if (marketCap === null || marketCap === undefined) return "-";
  return `$${formatCompactNumber(marketCap)}`;
}

/**
 * Format percentage change with color class
 */
export function formatPercentageChange(change: number | null | undefined): {
  text: string;
  className: string;
} {
  if (change === null || change === undefined) {
    return { text: "-", className: "text-zinc-400" };
  }

  const sign = change >= 0 ? "+" : "";
  const text = `${sign}${change.toFixed(2)}%`;
  const className = change >= 0 ? "text-emerald-400" : "text-red-400";

  return { text, className };
}
