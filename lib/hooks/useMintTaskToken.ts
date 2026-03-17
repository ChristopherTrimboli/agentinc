"use client";

import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useActiveWalletAddress } from "@/lib/hooks/useActiveWalletAddress";
import {
  DEFAULT_TASK_TOKEN_LAUNCH_STEPS,
  type TaskTokenLaunchStep,
  type TaskTokenLaunchResult,
} from "@/lib/marketplace/types";

export function useMintTaskToken() {
  const { authFetch } = useAuth();
  const walletAddress = useActiveWalletAddress();

  const [isLaunching, setIsLaunching] = useState(false);
  const isLaunchingRef = useRef(false);
  const [launchError, setLaunchError] = useState("");
  const [launchSteps, setLaunchSteps] = useState<TaskTokenLaunchStep[]>([]);
  const [launchResult, setLaunchResult] =
    useState<TaskTokenLaunchResult | null>(null);

  const updateStep = useCallback(
    (stepId: string, status: TaskTokenLaunchStep["status"], error?: string) => {
      setLaunchSteps((prev) =>
        prev.map((step) =>
          step.id === stepId ? { ...step, status, error } : step,
        ),
      );
    },
    [],
  );

  const launchTaskToken = useCallback(
    async (params: {
      name: string;
      symbol: string;
      description: string;
      initialBuyLamports?: number;
    }) => {
      if (isLaunchingRef.current) return null;

      setLaunchError("");
      setLaunchResult(null);

      if (!walletAddress) {
        setLaunchError("No wallet connected");
        return null;
      }

      setLaunchSteps(
        DEFAULT_TASK_TOKEN_LAUNCH_STEPS.map((step) => ({
          ...step,
          status: "pending" as const,
        })),
      );
      isLaunchingRef.current = true;
      setIsLaunching(true);

      try {
        // Step 1: Create metadata
        updateStep("metadata", "loading");

        const metadataResponse = await authFetch(
          "/api/marketplace/tasks/mint/metadata",
          {
            method: "POST",
            body: JSON.stringify({
              name: params.name.slice(0, 32),
              symbol: params.symbol.slice(0, 10),
              description: params.description,
            }),
          },
        );

        if (!metadataResponse.ok) {
          const errorData = await metadataResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create token metadata");
        }
        const metadataData = await metadataResponse.json();
        updateStep("metadata", "complete");

        // Step 2: Fee share config (treasury gets 100%)
        updateStep("feeShare", "loading");

        const feeShareResponse = await authFetch(
          "/api/marketplace/tasks/mint/fee-share",
          {
            method: "POST",
            body: JSON.stringify({ tokenMint: metadataData.tokenMint }),
          },
        );

        if (!feeShareResponse.ok) {
          const errorData = await feeShareResponse.json().catch(() => ({}));
          throw new Error(
            errorData.error || "Failed to create fee share config",
          );
        }
        const feeShareData = await feeShareResponse.json();

        // Send fee share transactions
        if (feeShareData.transactions?.length > 0) {
          for (let i = 0; i < feeShareData.transactions.length; i++) {
            const txData = feeShareData.transactions[i];
            const sendResponse = await authFetch(
              "/api/agents/mint/send-transaction",
              {
                method: "POST",
                body: JSON.stringify({
                  transaction: txData.transaction,
                  useJito: false,
                  waitForConfirmation: true,
                }),
              },
            );
            if (!sendResponse.ok) {
              const errorData = await sendResponse.json().catch(() => ({}));
              throw new Error(
                errorData.error || `Fee config tx ${i + 1} failed`,
              );
            }
          }
        }

        // Send fee share bundles
        if (feeShareData.bundles?.length > 0) {
          for (let b = 0; b < feeShareData.bundles.length; b++) {
            const bundle = feeShareData.bundles[b] as Array<{
              transaction: string;
            }>;
            const unsignedTxs = bundle.map((txData) => txData.transaction);
            const bundleResponse = await authFetch(
              "/api/agents/mint/send-bundle",
              {
                method: "POST",
                body: JSON.stringify({ unsignedTransactions: unsignedTxs }),
              },
            );
            if (!bundleResponse.ok) {
              const errorData = await bundleResponse.json().catch(() => ({}));
              throw new Error(
                errorData.error || `Fee config bundle ${b + 1} failed`,
              );
            }
          }
        }

        updateStep("feeShare", "complete");

        // Step 3: Get launch transaction
        updateStep("sign", "loading");

        const launchTxResponse = await authFetch(
          "/api/marketplace/tasks/mint/launch",
          {
            method: "POST",
            body: JSON.stringify({
              tokenMint: metadataData.tokenMint,
              metadataUrl: metadataData.tokenMetadata,
              initialBuyLamports: params.initialBuyLamports || 0,
              configKey: feeShareData.meteoraConfigKey,
            }),
          },
        );

        if (!launchTxResponse.ok) {
          const errorData = await launchTxResponse.json().catch(() => ({}));
          throw new Error(
            errorData.error || "Failed to create launch transaction",
          );
        }
        const launchTxData = await launchTxResponse.json();
        updateStep("sign", "complete");

        // Step 4: Broadcast
        updateStep("broadcast", "loading");

        const broadcastResponse = await authFetch(
          "/api/agents/mint/send-transaction",
          {
            method: "POST",
            body: JSON.stringify({ transaction: launchTxData.transaction }),
          },
        );

        if (!broadcastResponse.ok) {
          const errorData = await broadcastResponse.json().catch(() => ({}));
          throw new Error(
            errorData.error || "Failed to broadcast launch transaction",
          );
        }
        const broadcastData = await broadcastResponse.json();
        updateStep("broadcast", "complete");

        const result: TaskTokenLaunchResult = {
          tokenMint: metadataData.tokenMint,
          tokenSymbol: params.symbol.toUpperCase(),
          tokenMetadata: metadataData.tokenMetadata,
          launchSignature: broadcastData.signature,
          configKey: feeShareData.meteoraConfigKey,
        };

        setLaunchResult(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Token launch failed";
        setLaunchError(errorMessage);
        setLaunchSteps((prev) =>
          prev.map((step) =>
            step.status === "loading"
              ? { ...step, status: "error", error: errorMessage }
              : step,
          ),
        );
        return null;
      } finally {
        isLaunchingRef.current = false;
        setIsLaunching(false);
      }
    },
    [walletAddress, authFetch, updateStep],
  );

  const reset = useCallback(() => {
    isLaunchingRef.current = false;
    setIsLaunching(false);
    setLaunchError("");
    setLaunchSteps([]);
    setLaunchResult(null);
  }, []);

  return {
    isLaunching,
    launchError,
    launchSteps,
    launchResult,
    walletAddress,
    launchTaskToken,
    reset,
    setLaunchError,
  };
}
