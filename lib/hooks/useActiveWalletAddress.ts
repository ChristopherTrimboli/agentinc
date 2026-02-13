import { usePrivy } from "@privy-io/react-auth";
import { useUserWallets } from "./useUserWallets";

/**
 * Hook to get the user's active wallet address.
 * Reads from the shared UserWalletsProvider context, so it updates
 * immediately when any component calls setActiveWallet().
 * Falls back to Privy linkedAccounts for backward compatibility.
 */
export function useActiveWalletAddress(): string | null {
  const { user } = usePrivy();
  const { activeWallet } = useUserWallets();

  // Use active wallet from the shared context if available
  if (activeWallet?.address) {
    return activeWallet.address;
  }

  // Fallback to linkedAccounts (backward compatibility)
  const solanaWallet = user?.linkedAccounts?.find(
    (account) => account.type === "wallet" && account.chainType === "solana",
  );
  return solanaWallet && "address" in solanaWallet
    ? solanaWallet.address
    : null;
}
