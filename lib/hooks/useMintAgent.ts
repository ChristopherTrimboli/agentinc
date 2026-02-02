"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import { useWallets, useSignTransaction } from "@privy-io/react-auth/solana";
import { nanoid } from "nanoid";
import {
  generateRandomAgent,
  generateAgentName,
  AgentTraitData,
} from "@/lib/agentTraits";
import {
  APP_BASE_URL,
  MINT_TX_FEE_ESTIMATE,
  DEFAULT_LAUNCH_STEPS,
} from "@/lib/constants/mint";

export interface LaunchStep {
  id: string;
  label: string;
  status: "pending" | "loading" | "complete" | "error";
  error?: string;
}

export interface LaunchResult {
  tokenMint: string;
  signature: string;
  agentId: string;
}

export interface UseMintAgentOptions {
  user: {
    linkedAccounts?: Array<{
      type: string;
      chainType?: string;
      address?: string;
    }>;
  } | null;
}

export function useMintAgent({ user }: UseMintAgentOptions) {
  const { identityToken } = useIdentityToken();
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);

  // Agent configuration
  const [agentName, setAgentName] = useState("");
  const [agentTraits, setAgentTraits] = useState<AgentTraitData | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [lockedTraits, setLockedTraits] = useState<Set<string>>(new Set());

  // Token configuration
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [initialBuyAmount, setInitialBuyAmount] = useState("0.01");
  const [twitterHandle, setTwitterHandle] = useState("");

  // Pre-generated agent ID for consistent website URL in token metadata
  const [agentId] = useState(() => nanoid(21));

  // Loading states
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  // Results and errors
  const [launchError, setLaunchError] = useState("");
  const [launchSteps, setLaunchSteps] = useState<LaunchStep[]>([]);
  const [launchResult, setLaunchResult] = useState<LaunchResult | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Refs for cleanup
  const randomizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (randomizeTimeoutRef.current) {
        clearTimeout(randomizeTimeoutRef.current);
      }
    };
  }, []);

  // Get the embedded Privy wallet for signing
  const embeddedWallet = useMemo(
    () => wallets.find((w) => w.standardWallet?.name === "Privy"),
    [wallets],
  );

  const walletAddress = useMemo(() => {
    const solanaWallet = user?.linkedAccounts?.find(
      (account) => account.type === "wallet" && account.chainType === "solana",
    );
    return solanaWallet && "address" in solanaWallet
      ? solanaWallet.address
      : null;
  }, [user?.linkedAccounts]);

  // Fetch wallet balance
  const fetchBalance = useCallback(async () => {
    if (!walletAddress || !identityToken) return;
    setIsLoadingBalance(true);
    try {
      const response = await fetch("/api/agents/mint/balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
        body: JSON.stringify({ wallet: walletAddress }),
      });
      const data = await response.json();
      if (data.balanceSol !== undefined) {
        setWalletBalance(data.balanceSol);
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [walletAddress, identityToken]);

  // Initialize with random agent
  useEffect(() => {
    if (!agentTraits) {
      setAgentName(generateAgentName());
      setAgentTraits(generateRandomAgent());
    }
  }, [agentTraits]);

  // Fetch balance when wallet address changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Generate token symbol from name
  useEffect(() => {
    if (agentName && !tokenSymbol) {
      const symbol = agentName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 5);
      setTokenSymbol(symbol);
    }
  }, [agentName, tokenSymbol]);

  // Randomize agent traits
  const randomizeAgent = useCallback(() => {
    // Clear any existing timeout
    if (randomizeTimeoutRef.current) {
      clearTimeout(randomizeTimeoutRef.current);
    }

    setIsRandomizing(true);
    randomizeTimeoutRef.current = setTimeout(() => {
      // Check if still mounted before updating state
      if (!isMountedRef.current) return;

      const newTraits = generateRandomAgent();
      if (agentTraits) {
        if (lockedTraits.has("personality"))
          newTraits.personality = agentTraits.personality;
        if (lockedTraits.has("specialAbility"))
          newTraits.specialAbility = agentTraits.specialAbility;
        if (lockedTraits.has("traits")) newTraits.traits = agentTraits.traits;
        if (lockedTraits.has("skills")) newTraits.skills = agentTraits.skills;
        if (lockedTraits.has("tools")) newTraits.tools = agentTraits.tools;
      }
      if (!lockedTraits.has("name")) {
        setAgentName(generateAgentName());
        setTokenSymbol("");
      }
      setAgentTraits(newTraits);
      setIsRandomizing(false);
      randomizeTimeoutRef.current = null;
    }, 800);
  }, [agentTraits, lockedTraits]);

  // Toggle lock on a trait category
  const toggleLock = useCallback((category: string) => {
    setLockedTraits((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  // Generate AI image
  const generateImage = useCallback(async () => {
    if (!identityToken || !agentTraits) return;
    setIsGeneratingImage(true);
    try {
      const response = await fetch("/api/agents/mint/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
        body: JSON.stringify({ name: agentName, traits: agentTraits }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to generate image");
      setImageUrl(data.imageUrl);
    } catch (error) {
      setLaunchError(
        error instanceof Error ? error.message : "Failed to generate image",
      );
    } finally {
      setIsGeneratingImage(false);
    }
  }, [identityToken, agentTraits, agentName]);

  // Update a specific launch step
  const updateStep = useCallback(
    (stepId: string, status: LaunchStep["status"], error?: string) => {
      setLaunchSteps((prev) =>
        prev.map((step) =>
          step.id === stepId ? { ...step, status, error } : step,
        ),
      );
    },
    [],
  );

  // Main launch function
  const handleLaunch = useCallback(async () => {
    setLaunchError("");
    setLaunchResult(null);

    if (
      !identityToken ||
      !embeddedWallet ||
      !walletAddress ||
      !agentTraits ||
      !imageUrl
    ) {
      setLaunchError("Please complete all steps before launching");
      return;
    }

    const initialBuy = parseFloat(initialBuyAmount);
    if (isNaN(initialBuy) || initialBuy < 0) {
      setLaunchError("Invalid initial buy amount");
      return;
    }

    // Check wallet balance
    const requiredBalance = initialBuy + MINT_TX_FEE_ESTIMATE;
    if (walletBalance !== null && walletBalance < requiredBalance) {
      setLaunchError(
        `Insufficient balance. You need at least ${requiredBalance.toFixed(4)} SOL (${initialBuy} SOL initial buy + ~${MINT_TX_FEE_ESTIMATE} SOL for fees). Current balance: ${walletBalance.toFixed(4)} SOL`,
      );
      return;
    }

    // Initialize steps
    setLaunchSteps(
      DEFAULT_LAUNCH_STEPS.map((step) => ({
        ...step,
        status: "pending" as const,
      })),
    );
    setIsLaunching(true);

    try {
      // Step 1: Create metadata
      updateStep("metadata", "loading");

      const websiteUrl = `${APP_BASE_URL}/agent/${agentId}`;
      const formattedTwitter =
        twitterHandle.trim().replace(/^@/, "") || undefined;

      const metadataResponse = await fetch("/api/agents/mint/metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
        body: JSON.stringify({
          name: agentName.trim(),
          symbol: tokenSymbol.trim().toUpperCase(),
          description:
            description.trim() ||
            `${agentName} - A ${agentTraits.rarity} AI Agent`,
          imageUrl: imageUrl,
          website: websiteUrl,
          twitter: formattedTwitter,
        }),
      });

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create metadata");
      }
      const metadataData = await metadataResponse.json();
      updateStep("metadata", "complete");

      // Step 2: Fee share config
      updateStep("feeShare", "loading");

      const feeShareResponse = await fetch("/api/agents/mint/fee-share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
        body: JSON.stringify({
          wallet: walletAddress,
          tokenMint: metadataData.tokenMint,
        }),
      });

      if (!feeShareResponse.ok) {
        const errorData = await feeShareResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create fee config");
      }
      const feeShareData = await feeShareResponse.json();

      // Sign and send any fee share transactions
      if (feeShareData.transactions?.length > 0) {
        for (let i = 0; i < feeShareData.transactions.length; i++) {
          try {
            const txData = feeShareData.transactions[i];
            let txBytes: Uint8Array;
            try {
              txBytes = Uint8Array.from(atob(txData.transaction), (c) =>
                c.charCodeAt(0),
              );
            } catch {
              throw new Error(
                `Invalid transaction data for fee config ${i + 1}`,
              );
            }
            const signResult = await signTransaction({
              transaction: txBytes,
              wallet: embeddedWallet,
            });
            const signedTxBase64 = btoa(
              String.fromCharCode(
                ...new Uint8Array(signResult.signedTransaction),
              ),
            );

            const sendResponse = await fetch(
              "/api/agents/mint/send-transaction",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "privy-id-token": identityToken,
                },
                body: JSON.stringify({ signedTransaction: signedTxBase64 }),
              },
            );

            if (!sendResponse.ok) {
              const errorData = await sendResponse.json().catch(() => ({}));
              throw new Error(
                errorData.error ||
                  `Failed to send fee config transaction ${i + 1}`,
              );
            }
          } catch (error) {
            throw new Error(
              `Fee config transaction ${i + 1} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }
      }
      updateStep("feeShare", "complete");

      // Step 3: Create and sign launch transaction
      updateStep("sign", "loading");

      const launchTxResponse = await fetch("/api/agents/mint/launch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
        body: JSON.stringify({
          tokenMint: metadataData.tokenMint,
          metadataUrl: metadataData.tokenMetadata,
          wallet: walletAddress,
          initialBuyLamports: Math.floor(initialBuy * 1e9),
          configKey: feeShareData.meteoraConfigKey,
        }),
      });

      if (!launchTxResponse.ok) {
        const errorData = await launchTxResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to create launch transaction",
        );
      }
      const launchTxData = await launchTxResponse.json();

      let launchTxBytes: Uint8Array;
      try {
        launchTxBytes = Uint8Array.from(atob(launchTxData.transaction), (c) =>
          c.charCodeAt(0),
        );
      } catch {
        throw new Error("Invalid launch transaction data");
      }
      const signResult = await signTransaction({
        transaction: launchTxBytes,
        wallet: embeddedWallet,
      });
      const signedLaunchTxBase64 = btoa(
        String.fromCharCode(...new Uint8Array(signResult.signedTransaction)),
      );
      updateStep("sign", "complete");

      // Step 4: Broadcast
      updateStep("broadcast", "loading");

      const broadcastResponse = await fetch(
        "/api/agents/mint/send-transaction",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "privy-id-token": identityToken,
          },
          body: JSON.stringify({ signedTransaction: signedLaunchTxBase64 }),
        },
      );

      if (!broadcastResponse.ok) {
        const errorData = await broadcastResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to broadcast transaction");
      }
      const broadcastData = await broadcastResponse.json();
      updateStep("broadcast", "complete");

      // Step 5: Save to database
      updateStep("save", "loading");

      const saveResponse = await fetch("/api/agents/mint/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
        body: JSON.stringify({
          agentId: agentId,
          name: agentName.trim(),
          description: description.trim() || null,
          imageUrl: imageUrl,
          traits: agentTraits,
          tokenMint: metadataData.tokenMint,
          tokenSymbol: tokenSymbol.trim().toUpperCase(),
          tokenMetadata: metadataData.tokenMetadata,
          launchWallet: walletAddress,
          launchSignature: broadcastData.signature,
        }),
      });

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save agent");
      }
      const saveData = await saveResponse.json();
      updateStep("save", "complete");

      setLaunchResult({
        tokenMint: metadataData.tokenMint,
        signature: broadcastData.signature,
        agentId: saveData.agent.id,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Launch failed";
      setLaunchError(errorMessage);
      setLaunchSteps((prev) =>
        prev.map((step) =>
          step.status === "loading"
            ? { ...step, status: "error", error: errorMessage }
            : step,
        ),
      );
    } finally {
      setIsLaunching(false);
    }
  }, [
    identityToken,
    embeddedWallet,
    walletAddress,
    agentTraits,
    imageUrl,
    initialBuyAmount,
    walletBalance,
    agentId,
    twitterHandle,
    agentName,
    tokenSymbol,
    description,
    signTransaction,
    updateStep,
  ]);

  // Reset for minting another agent
  const resetMint = useCallback(() => {
    setLaunchResult(null);
    setCurrentStep(0);
    setAgentName(generateAgentName());
    setAgentTraits(generateRandomAgent());
    setImageUrl("");
    setTokenSymbol("");
    setDescription("");
    setTwitterHandle("");
    setLaunchError("");
    setLaunchSteps([]);
  }, []);

  // Validation helpers
  const initialBuy = parseFloat(initialBuyAmount) || 0;
  const requiredBalance = initialBuy + MINT_TX_FEE_ESTIMATE;
  const hasEnoughBalance =
    walletBalance === null || walletBalance >= requiredBalance;

  const canProceedToStep1 = agentTraits !== null && agentName.trim().length > 0;
  const canProceedToStep2 = canProceedToStep1 && imageUrl.length > 0;
  const canLaunch =
    canProceedToStep2 &&
    tokenSymbol.trim().length > 0 &&
    walletAddress &&
    hasEnoughBalance;

  return {
    // State
    currentStep,
    agentName,
    agentTraits,
    imageUrl,
    lockedTraits,
    tokenSymbol,
    description,
    initialBuyAmount,
    twitterHandle,
    agentId,
    isRandomizing,
    isGeneratingImage,
    isLaunching,
    isLoadingBalance,
    launchError,
    launchSteps,
    launchResult,
    walletBalance,
    walletAddress,

    // Computed
    requiredBalance,
    hasEnoughBalance,
    canProceedToStep1,
    canProceedToStep2,
    canLaunch,

    // Setters
    setCurrentStep,
    setAgentName,
    setTokenSymbol,
    setDescription,
    setInitialBuyAmount,
    setTwitterHandle,
    setLaunchError,

    // Actions
    randomizeAgent,
    toggleLock,
    generateImage,
    handleLaunch,
    resetMint,
    fetchBalance,
  };
}

export type UseMintAgentReturn = ReturnType<typeof useMintAgent>;
