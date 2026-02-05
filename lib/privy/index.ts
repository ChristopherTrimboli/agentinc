/**
 * Privy Server-Side Utilities
 *
 * Exports wallet service functions for server-side operations.
 */

export {
  isServerSignerConfigured,
  getCurrentNetwork,
  getCAIP2ChainId,
  getPrivyWalletClient,
  getWalletBalance,
  signSolTransferTransaction,
  sendSolFromWallet,
  hasEnoughBalance,
  lamportsToSol,
  acquireWalletLock,
  withWalletLock,
} from "./wallet-service";

export type { SolanaNetwork } from "./wallet-service";
