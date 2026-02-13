"use client";

import { usePrivy, useSigners, useWallets } from "@privy-io/react-auth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useUserWallets } from "@/lib/hooks/useUserWallets";
import { useEffect, useRef, useState } from "react";

// Key quorum ID for server-side signing - must match PRIVY_SIGNER_KEY_QUORUM_ID on server
const SERVER_SIGNER_KEY_QUORUM_ID =
  process.env.NEXT_PUBLIC_SERVER_SIGNER_KEY_QUORUM_ID;

export default function UserSync() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { addSigners } = useSigners();
  const { authFetch, identityToken } = useAuth();
  const { refetch: refetchUserWallets } = useUserWallets();
  const [hasSynced, setHasSynced] = useState(false);
  const [signerAdded, setSignerAdded] = useState(false);
  const addSignerAttempted = useRef(false);

  // Sync user data with backend (must happen first to create user record)
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
          const data = await response.json();
          setHasSynced(true);
          // If server says signer is already added, skip client-side addition
          if (data.user?.walletSignerAdded) {
            setSignerAdded(true);
          }
        }
      } catch {
        // Sync failed silently - user can still use the app
      }
    }

    syncUser();
  }, [ready, authenticated, identityToken, authFetch, hasSynced]);

  // Add new wallets detected from Privy
  useEffect(() => {
    async function syncNewWallets() {
      if (!ready || !authenticated || !user || !identityToken || !hasSynced) {
        return;
      }

      // Get all Solana wallets from Privy
      const solanaWallets = user.linkedAccounts?.filter((account) => {
        if (account.type !== "wallet") return false;
        return account.chainType === "solana";
      });

      if (!solanaWallets || solanaWallets.length === 0) return;

      // Fetch existing wallets from backend
      try {
        const response = await authFetch("/api/users/wallets");
        if (!response.ok) return;

        const data = await response.json();
        const existingAddresses = new Set(
          data.wallets.map((w: { address: string }) => w.address),
        );

        // Add any new wallets that don't exist in the database
        let addedAny = false;
        for (const wallet of solanaWallets) {
          if ("address" in wallet && !existingAddresses.has(wallet.address)) {
            await authFetch("/api/users/wallets", {
              method: "POST",
              body: JSON.stringify({
                action: "add",
                address: wallet.address,
              }),
            });
            addedAny = true;
          }
        }

        // Refresh the shared wallet context so all components see new wallets
        if (addedAny) {
          await refetchUserWallets();
        }
      } catch (error) {
        console.error("[UserSync] Failed to sync new wallets:", error);
      }
    }

    syncNewWallets();
  }, [
    ready,
    authenticated,
    user,
    identityToken,
    hasSynced,
    authFetch,
    refetchUserWallets,
  ]);

  // Add server signer to wallet (client-side operation)
  // Must run after sync to ensure user exists in database
  useEffect(() => {
    async function addServerSigner() {
      // Find the embedded Solana wallet (Privy-created wallet with Solana chain)
      const embeddedWallet = wallets.find(
        (w) =>
          w.walletClientType === "privy" && w.chainId?.startsWith("solana"),
      );

      // Wait for sync and wallet to be ready
      if (
        !ready ||
        !authenticated ||
        !embeddedWallet ||
        !SERVER_SIGNER_KEY_QUORUM_ID ||
        !hasSynced ||
        signerAdded ||
        addSignerAttempted.current
      ) {
        return;
      }

      addSignerAttempted.current = true;

      try {
        // Add server's key quorum as a signer on the user's wallet
        // This allows the server to sign transactions from this wallet
        await addSigners({
          address: embeddedWallet.address,
          signers: [
            {
              signerId: SERVER_SIGNER_KEY_QUORUM_ID,
              // Empty policyIds = full access (consider adding policies for production)
              policyIds: [],
            },
          ],
        });
        setSignerAdded(true);

        // Notify server that signer was added
        try {
          await authFetch("/api/users/signer-status", {
            method: "POST",
          });
        } catch {
          // Non-critical - server will still try to sign transactions
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // "Duplicate signer" means it was already added - treat as success
        if (errorMessage.includes("Duplicate signer")) {
          setSignerAdded(true);

          // Update server status
          try {
            await authFetch("/api/users/signer-status", {
              method: "POST",
            });
          } catch {
            // Non-critical
          }
        } else if (errorMessage.includes("not initialized")) {
          // Wallet not ready yet - allow retry on next render
          addSignerAttempted.current = false;
        } else {
          console.error("[UserSync] Could not add server signer:", error);
        }
      }
    }

    addServerSigner();
  }, [
    ready,
    authenticated,
    wallets,
    addSigners,
    hasSynced,
    signerAdded,
    authFetch,
  ]);

  return null;
}
