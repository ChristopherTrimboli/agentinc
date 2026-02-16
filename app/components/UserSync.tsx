"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useUserWallets } from "@/lib/hooks/useUserWallets";
import { useEffect, useState } from "react";

/**
 * UserSync — Syncs user data with the backend on login.
 *
 * Responsibilities:
 * 1. Sync user record (email, etc.) with backend on first auth
 * 2. Server creates a server-owned wallet for the user if needed
 * 3. Refresh shared wallet context so all components see the new wallet
 *
 * NOTE: Server-owned wallets are created server-side during sync.
 * No client-side signer ceremony is needed — the server owns the
 * wallets and can sign transactions directly.
 */
export default function UserSync() {
  const { ready, authenticated } = usePrivy();
  const { authFetch, identityToken } = useAuth();
  const { refetch: refetchUserWallets } = useUserWallets();
  const [hasSynced, setHasSynced] = useState(false);

  // Sync user data with backend (creates user record + server-owned wallet)
  useEffect(() => {
    async function syncUser() {
      if (!ready || !authenticated || !identityToken || hasSynced) {
        return;
      }

      try {
        const response = await authFetch("/api/users/sync", {
          method: "POST",
        });

        if (response.ok) {
          setHasSynced(true);
          // Refresh wallets so the UI picks up the server-created wallet
          await refetchUserWallets();
        }
      } catch {
        // Sync failed silently — user can still use the app
      }
    }

    syncUser();
  }, [
    ready,
    authenticated,
    identityToken,
    authFetch,
    hasSynced,
    refetchUserWallets,
  ]);

  return null;
}
