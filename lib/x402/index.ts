/**
 * X402 Payment Integration
 *
 * Native SOL payment middleware for API routes.
 * Uses our custom SOL facilitator for payment verification and settlement.
 */

// Re-export canonical config (single source of truth)
export {
  SOL_NETWORK,
  TREASURY_ADDRESS,
  PRICING,
  ROUTE_DESCRIPTIONS,
  getCurrentNetwork,
  isValidSolanaAddress,
  validateX402Config,
  MAX_USD_PRICE,
  MIN_USD_PRICE,
} from "./config";

export type { SolNetwork, PricingKey, ValidationResult } from "./config";

// Re-export from SOL middleware (client-side signed transactions)
export {
  withSolPayment as withX402Payment,
  isSolPaymentEnabled as isX402Enabled,
  SOL_PRICING,
  SOL_ROUTE_DESCRIPTIONS,
  SOL_TREASURY_ADDRESS,
  getPricingWithSol,
} from "./sol-middleware";

// Re-export from server middleware (automatic server-side payments)
export {
  withServerSolPayment,
  isServerSolPaymentEnabled,
  getServerPricingWithSol,
  // Usage-based billing (post-payment from AI SDK costs)
  withUsageBasedPayment,
  chargeForUsage,
  isUsageBasedBillingEnabled,
  // Failed payment queue management
  queueFailedPayment,
  getFailedPayments,
  processFailedPaymentQueue,
  // Refund management
  issueRefund,
  isAutoRefundEnabled,
  getPendingRefunds,
  getUserRefunds,
} from "./sol-server-middleware";

export type {
  BillingContext,
  RequestWithBilling,
  UsageBillingResult,
} from "./sol-server-middleware";

// Re-export AI Gateway pricing utilities
export {
  calculateCost,
  getModelPricing,
  refreshPricingCache,
  isAIGatewayBillingEnabled,
} from "./ai-gateway-cost";

export type {
  ModelPricing,
  TokenUsage,
  CalculatedCost,
} from "./ai-gateway-cost";

// Re-export facilitator utilities
export { getSolPrice, usdToLamports, lamportsToUsd } from "./sol-facilitator";
