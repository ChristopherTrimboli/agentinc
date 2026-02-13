"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createSolanaRpcSubscriptions, address } from "@solana/kit";
import { useAuth } from "@/lib/auth/AuthProvider";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

const LAMPORTS_PER_SOL = 1_000_000_000;

function formatBalance(bal: number): string {
  if (bal === 0) return "0";
  if (bal < 0.0001) return "<0.0001";
  if (bal < 1) return bal.toFixed(4);
  if (bal < 100) return bal.toFixed(3);
  return bal.toFixed(2);
}

interface UseWalletBalanceOptions {
  /** Show toast notifications on balance changes. Default: false */
  showToasts?: boolean;
}

/**
 * Realtime wallet balance hook using Solana WebSocket subscriptions.
 *
 * Fetches the initial balance via API, then subscribes to Solana
 * accountNotifications for instant balance updates on any on-chain change
 * (deposits, withdrawals, billing charges).
 *
 * When walletAddress changes (e.g. wallet switch), the balance is
 * immediately reset to null and re-fetched for the new address.
 */
export function useWalletBalance(
  walletAddress: string | null,
  options: UseWalletBalanceOptions = {},
) {
  const { showToasts = false } = options;
  const { authFetch, identityToken } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const prevBalanceRef = useRef<number | null>(null);

  // Reset balance immediately when wallet address changes
  useEffect(() => {
    setBalance(null);
    prevBalanceRef.current = null;
  }, [walletAddress]);

  // Fetch balance via backend API (for initial load and manual refresh)
  const refresh = useCallback(async () => {
    if (!walletAddress || !identityToken) return;

    setIsLoading(true);
    try {
      const response = await authFetch("/api/agents/mint/balance", {
        method: "POST",
        body: JSON.stringify({ wallet: walletAddress }),
      });
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balanceSol ?? null);
      } else {
        setBalance(null);
      }
    } catch {
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, identityToken, authFetch]);

  // Fetch balance when wallet address or auth changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to Solana WebSocket account notifications for realtime updates
  useEffect(() => {
    if (!walletAddress) return;

    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
    if (!rpcUrl) {
      console.warn(
        "[useWalletBalance] NEXT_PUBLIC_SOLANA_RPC_URL not set, realtime updates disabled",
      );
      return;
    }

    const wssUrl = rpcUrl.startsWith("wss://")
      ? rpcUrl
      : rpcUrl.replace("https://", "wss://");
    const abortController = new AbortController();

    async function subscribeWithReconnect() {
      let retryDelay = 1000;
      const maxRetryDelay = 30000;

      while (!abortController.signal.aborted) {
        try {
          const rpcSubscriptions = createSolanaRpcSubscriptions(wssUrl);
          const notifications = await rpcSubscriptions
            .accountNotifications(address(walletAddress!), {
              commitment: "confirmed",
            })
            .subscribe({ abortSignal: abortController.signal });

          // Reset retry delay on successful connection
          retryDelay = 1000;

          for await (const notification of notifications) {
            if (abortController.signal.aborted) return;
            const lamports = Number(notification.value.lamports);
            const balanceSol = lamports / LAMPORTS_PER_SOL;
            setBalance(balanceSol);
          }
        } catch (error) {
          if (abortController.signal.aborted) return;

          console.warn(
            `[useWalletBalance] Subscription error, reconnecting in ${retryDelay}ms:`,
            error,
          );

          await new Promise((resolve) => setTimeout(resolve, retryDelay));
          if (abortController.signal.aborted) return;

          retryDelay = Math.min(retryDelay * 2, maxRetryDelay);
        }
      }
    }

    subscribeWithReconnect();

    return () => {
      abortController.abort();
    };
  }, [walletAddress]);

  // Toast notifications on balance changes
  useEffect(() => {
    if (!showToasts || balance === null) return;

    const prev = prevBalanceRef.current;
    prevBalanceRef.current = balance;

    // Skip the initial load
    if (prev === null) return;

    const diff = balance - prev;
    // Only notify for meaningful changes (> 0.00001 SOL to avoid rounding noise)
    if (Math.abs(diff) < 0.00001) return;

    const absDiff = Math.abs(diff).toFixed(6);

    if (diff > 0) {
      toast.success(`+${absDiff} SOL received`, {
        description: `Balance: ${formatBalance(balance)} SOL`,
        icon: <ArrowDownLeft className="w-4 h-4 text-[#6FEC06]" />,
        duration: 5000,
      });
    } else {
      toast(`-${absDiff} SOL spent`, {
        description: `Balance: ${formatBalance(balance)} SOL`,
        icon: <ArrowUpRight className="w-4 h-4 text-amber-400" />,
        duration: 4000,
      });
    }
  }, [balance, showToasts]);

  return { balance, isLoading, refresh };
}
