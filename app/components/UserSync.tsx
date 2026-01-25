"use client";

import { usePrivy, useIdentityToken } from "@privy-io/react-auth";
import { useEffect, useRef } from "react";

export default function UserSync() {
  const { ready, authenticated } = usePrivy();
  const { identityToken } = useIdentityToken();
  const hasSynced = useRef(false);

  useEffect(() => {
    async function syncUser() {
      if (!ready || !authenticated || !identityToken || hasSynced.current) {
        return;
      }

      try {
        const response = await fetch("/api/users/sync", {
          method: "POST",
          headers: {
            "privy-id-token": identityToken,
          },
        });

        if (response.ok) {
          hasSynced.current = true;
        }
      } catch {
        // Sync failed silently - user can still use the app
      }
    }

    syncUser();
  }, [ready, authenticated, identityToken]);

  return null;
}
