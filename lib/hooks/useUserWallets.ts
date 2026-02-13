"use client";

import {
  createElement,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/lib/auth/AuthProvider";

export interface UserWallet {
  id: string;
  privyWalletId: string;
  address: string;
  signerAdded: boolean;
  label: string | null;
  importedFrom: string | null;
  createdAt: string;
}

interface UserWalletsContextValue {
  wallets: UserWallet[];
  activeWalletId: string | null;
  activeWallet: UserWallet | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setActiveWallet: (walletId: string) => Promise<boolean>;
  addWallet: (params: {
    address: string;
    label?: string;
    importedFrom?: string;
  }) => Promise<boolean>;
}

const UserWalletsContext = createContext<UserWalletsContextValue | null>(null);

/**
 * Provider that holds shared wallet state for the entire app.
 * Wrap this around your app (inside AuthProvider) so every component
 * that calls useUserWallets() reads from the same state.
 */
export function UserWalletsProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const { authFetch, identityToken } = useAuth();
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [activeWalletId, setActiveWalletId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch wallets from API ───────────────────────────────────────
  const fetchWallets = useCallback(async () => {
    if (!ready || !authenticated || !identityToken) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await authFetch("/api/users/wallets");

      if (!response.ok) {
        throw new Error("Failed to fetch wallets");
      }

      const data = await response.json();
      setWallets(data.wallets || []);
      setActiveWalletId(data.activeWalletId);
    } catch (err) {
      console.error("[useUserWallets] Error fetching wallets:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch wallets");
    } finally {
      setIsLoading(false);
    }
  }, [ready, authenticated, identityToken, authFetch]);

  // Initial fetch
  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  // ── Set active wallet ────────────────────────────────────────────
  const setActiveWallet = useCallback(
    async (walletId: string): Promise<boolean> => {
      if (!authenticated || !identityToken) return false;

      try {
        const response = await authFetch("/api/users/wallets", {
          method: "POST",
          body: JSON.stringify({ action: "setActive", walletId }),
        });

        if (!response.ok) {
          throw new Error("Failed to set active wallet");
        }

        const data = await response.json();
        setActiveWalletId(data.activeWalletId);
        return true;
      } catch (err) {
        console.error("[useUserWallets] Error setting active wallet:", err);
        return false;
      }
    },
    [authenticated, identityToken, authFetch],
  );

  // ── Add new wallet ───────────────────────────────────────────────
  const addWallet = useCallback(
    async (params: {
      address: string;
      label?: string;
      importedFrom?: string;
    }): Promise<boolean> => {
      if (!authenticated || !identityToken) return false;

      try {
        const response = await authFetch("/api/users/wallets", {
          method: "POST",
          body: JSON.stringify({
            action: "add",
            address: params.address,
            label: params.label,
            importedFrom: params.importedFrom,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to add wallet");
        }

        // Refetch wallets after adding
        await fetchWallets();
        return true;
      } catch (err) {
        console.error("[useUserWallets] Error adding wallet:", err);
        return false;
      }
    },
    [authenticated, identityToken, authFetch, fetchWallets],
  );

  // ── Derived: active wallet object ────────────────────────────────
  const activeWallet =
    wallets.find((w) => w.id === activeWalletId) || wallets[0] || null;

  const value: UserWalletsContextValue = {
    wallets,
    activeWalletId,
    activeWallet,
    isLoading,
    error,
    refetch: fetchWallets,
    setActiveWallet,
    addWallet,
  };

  return createElement(UserWalletsContext.Provider, { value }, children);
}

/**
 * Hook to access the shared user wallets state.
 * Must be used inside a <UserWalletsProvider>.
 */
export function useUserWallets(): UserWalletsContextValue {
  const ctx = useContext(UserWalletsContext);
  if (!ctx) {
    throw new Error("useUserWallets must be used within a UserWalletsProvider");
  }
  return ctx;
}
