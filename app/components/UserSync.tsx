"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useEffect, useRef } from "react";

export default function UserSync() {
  const { ready, authenticated } = usePrivy();
  const { authFetch, identityToken } = useAuth();
  const hasSynced = useRef(false);

  useEffect(() => {
    async function syncUser() {
      if (!ready || !authenticated || !identityToken || hasSynced.current) {
        return;
      }

      try {
        const response = await authFetch("/api/users/sync", {
          method: "POST",
        });

        if (response.ok) {
          hasSynced.current = true;
        }
      } catch {
        // Sync failed silently - user can still use the app
      }
    }

    syncUser();
  }, [ready, authenticated, identityToken, authFetch]);

  return null;
}
