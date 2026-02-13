"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  useWallets as useSolanaWallets,
  useSignTransaction,
} from "@privy-io/react-auth/solana";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useActiveWalletAddress } from "@/lib/hooks/useActiveWalletAddress";
import {
  Lock,
  Unlock,
  TrendingUp,
  Clock,
  Coins,
  Loader2,
  ChevronDown,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Zap,
  Plus,
  CheckCircle2,
  Gift,
} from "lucide-react";

// ─── Types & Constants ─────────────────────────────────────────────

const LOCK_DURATIONS = [
  { label: "7 Days", days: 7, multiplier: 1.0 },
  { label: "30 Days", days: 30, multiplier: 1.5 },
  { label: "90 Days", days: 90, multiplier: 2.5 },
  { label: "180 Days", days: 180, multiplier: 4.0 },
] as const;

interface StakePosition {
  id: string;
  nonce: number;
  amount: number;
  stakedAt: string;
  unlockAt: string;
  multiplier: number;
  earned: number;
}

interface StakingStats {
  totalStaked: number;
  totalStakers: number;
  apy: number;
  rewardsPool: number;
}

interface StakingData {
  tokenMint: string;
  tokenSymbol: string;
  poolExists: boolean;
  hasRewardPool: boolean;
  stakePoolAddress: string | null;
  isCreator: boolean;
  rewardPoolNonce?: number;
  tokenBalance: number;
  positions: StakePosition[];
  stats: StakingStats;
}

interface StakingPanelProps {
  tokenMint: string;
  tokenSymbol: string;
  agentId: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  if (n < 1 && n > 0) return n.toFixed(4);
  return n.toFixed(2);
}

function getTimeRemaining(unlockAt: string): string {
  const diff = new Date(unlockAt).getTime() - Date.now();
  if (diff <= 0) return "Unlocked";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

function isUnlocked(unlockAt: string): boolean {
  return Date.now() >= new Date(unlockAt).getTime();
}

// ─── Skeleton Loader ───────────────────────────────────────────────

function StakingSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-3 rounded-xl border border-white/5"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="staking-skeleton h-2.5 w-16 mb-2 rounded" />
            <div className="staking-skeleton h-5 w-12 rounded" />
          </div>
        ))}
      </div>
      {/* Tab skeleton */}
      <div className="staking-skeleton h-11 rounded-xl" />
      {/* Input skeletons */}
      <div className="space-y-3">
        <div className="staking-skeleton h-12 rounded-xl" />
        <div className="staking-skeleton h-12 rounded-xl" />
        <div className="staking-skeleton h-12 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────

export default function StakingPanel({
  tokenMint,
  tokenSymbol,
  agentId,
}: StakingPanelProps) {
  const { user } = usePrivy();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { signTransaction } = useSignTransaction();
  const { authFetch } = useAuth();

  // ─── State ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"stake" | "unstake">("stake");
  const [amount, setAmount] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [isStaking, setIsStaking] = useState(false);
  const [loadingPosition, setLoadingPosition] = useState<string | null>(null); // position id being unstaked/claimed
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isCreatingPool, setIsCreatingPool] = useState(false);
  const [isCreatingRewardPool, setIsCreatingRewardPool] = useState(false);
  const [isFundingRewardPool, setIsFundingRewardPool] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [showFundPanel, setShowFundPanel] = useState(false);
  const [data, setData] = useState<StakingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const durationRef = useRef<HTMLDivElement>(null);

  // ─── Derived ────────────────────────────────────────────────────

  const walletAddress = useActiveWalletAddress();

  const isAuthenticated = !!user && !!walletAddress;
  const positions = data?.positions ?? [];
  const stats = data?.stats ?? {
    totalStaked: 0,
    totalStakers: 0,
    apy: 0,
    rewardsPool: 0,
  };
  const tokenBalance = data?.tokenBalance ?? 0;
  const poolExists = data?.poolExists ?? false;
  const userTotalStaked = positions.reduce((sum, p) => sum + p.amount, 0);
  const userTotalEarned = positions.reduce((sum, p) => sum + p.earned, 0);
  const duration = LOCK_DURATIONS[selectedDuration];

  // ─── Effects ────────────────────────────────────────────────────

  // Close duration picker on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        durationRef.current &&
        !durationRef.current.contains(event.target as Node)
      ) {
        setShowDurationPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch staking data. `silent` skips the loading skeleton (used for background refresh).
  const fetchStakingData = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoadingData(true);
      try {
        const response = await (isAuthenticated ? authFetch : fetch)(
          `/api/staking/${agentId}?tokenMint=${tokenMint}`,
        );
        if (response.ok) {
          const json = await response.json();
          setData(json);
          setError(null);
        } else {
          const err = await response.json().catch(() => ({}));
          if (!silent) setError(err.error || "Failed to load staking data");
        }
      } catch {
        if (!silent) setError("Failed to connect to staking service");
      } finally {
        if (!silent) setIsLoadingData(false);
      }
    },
    [agentId, tokenMint, isAuthenticated, authFetch],
  );

  // Initial fetch
  useEffect(() => {
    fetchStakingData();
  }, [fetchStakingData]);

  // Periodic background refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => fetchStakingData(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchStakingData]);

  // Refresh when tab becomes visible again
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        fetchStakingData(true);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchStakingData]);

  // Clear success message after 4s
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // ─── Wallet Helpers ─────────────────────────────────────────────

  function getWallet() {
    // Prefer the wallet matching the user's active wallet address.
    // This must match the wallet used server-side to build the transaction
    // (via auth.walletAddress from the DB), otherwise the feePayer signature
    // won't match and the transaction will silently fail to land.
    if (walletAddress) {
      const activeMatch = solanaWallets.find(
        (w) => w.address === walletAddress,
      );
      if (activeMatch) return activeMatch;
    }
    // Fall back to embedded Privy wallet, then first available
    const embedded = solanaWallets.find(
      (w) => w.standardWallet?.name === "Privy",
    );
    return embedded || solanaWallets[0];
  }

  async function signAndSend(transactionBase64: string): Promise<string> {
    const wallet = getWallet();
    if (!wallet) {
      throw new Error("No wallet found. Please reconnect.");
    }

    const txBytes = Uint8Array.from(atob(transactionBase64), (c) =>
      c.charCodeAt(0),
    );

    const { signedTransaction } = await signTransaction({
      transaction: txBytes,
      wallet,
    });

    const signedBase64 = btoa(
      String.fromCharCode(...new Uint8Array(signedTransaction)),
    );

    const sendResponse = await authFetch("/api/solana/send", {
      method: "POST",
      body: JSON.stringify({ signedTransaction: signedBase64 }),
    });

    if (!sendResponse.ok) {
      const err = await sendResponse.json().catch(() => ({}));
      throw new Error(err.error || "Failed to send transaction");
    }

    const result = await sendResponse.json();

    // If confirmation timed out, the transaction was still sent — warn but don't fail
    if (result.signature && result.confirmed === false) {
      console.warn(
        "[Staking] Transaction sent but confirmation timed out:",
        result.signature,
      );
    }

    return result.signature;
  }

  // ─── Handlers ───────────────────────────────────────────────────

  const handleCreatePool = async () => {
    setIsCreatingPool(true);
    setError(null);

    try {
      const response = await authFetch(`/api/staking/${agentId}/create-pool`, {
        method: "POST",
        body: JSON.stringify({ rewardRate: 0.001 }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create pool");
      }

      const { transaction, stakePoolAddress } = await response.json();
      await signAndSend(transaction);

      // Persist pool to DB (retry up to 3 times, non-fatal if all fail)
      for (let i = 0; i < 3; i++) {
        try {
          const saveRes = await authFetch(`/api/staking/${agentId}/save-pool`, {
            method: "POST",
            body: JSON.stringify({
              stakePoolAddress,
              tokenMint,
              rewardPoolNonce: 0,
            }),
          });
          if (saveRes.ok) break;
        } catch {
          if (i < 2) await new Promise((r) => setTimeout(r, 1000));
        }
      }

      setSuccess("Staking pool created successfully! Now set up rewards.");
      await fetchStakingData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create staking pool",
      );
    } finally {
      setIsCreatingPool(false);
    }
  };

  const handleCreateRewardPool = async () => {
    setIsCreatingRewardPool(true);
    setError(null);

    try {
      const response = await authFetch(
        `/api/staking/${agentId}/create-reward-pool`,
        {
          method: "POST",
          body: JSON.stringify({ rewardRate: 0.001 }),
        },
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create reward pool");
      }

      const { transaction, stakePoolAddress: poolAddress } =
        await response.json();
      await signAndSend(transaction);

      // Persist reward pool nonce to DB after confirmed on-chain
      if (poolAddress || data?.stakePoolAddress) {
        try {
          await authFetch(`/api/staking/${agentId}/save-pool`, {
            method: "POST",
            body: JSON.stringify({
              stakePoolAddress: poolAddress || data?.stakePoolAddress,
              tokenMint,
              rewardPoolNonce: 0,
            }),
          });
        } catch {
          // Non-fatal: pool exists on-chain, DB will sync on next fetch
        }
      }

      setSuccess("Reward pool created! Stakers can now earn rewards.");
      await fetchStakingData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create reward pool",
      );
    } finally {
      setIsCreatingRewardPool(false);
    }
  };

  const handleFundRewardPool = async () => {
    const fundAmountNum = parseFloat(fundAmount);
    if (!fundAmountNum || fundAmountNum <= 0) {
      setError("Enter an amount to fund");
      return;
    }
    if (data && fundAmountNum > data.tokenBalance) {
      setError("Insufficient token balance");
      return;
    }

    setIsFundingRewardPool(true);
    setError(null);

    try {
      const response = await authFetch(
        `/api/staking/${agentId}/fund-reward-pool`,
        {
          method: "POST",
          body: JSON.stringify({ amount: fundAmountNum }),
        },
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to fund reward pool");
      }

      const { transaction } = await response.json();
      await signAndSend(transaction);

      setSuccess(
        `Funded reward pool with ${fundAmountNum.toLocaleString()} ${tokenSymbol}!`,
      );
      setFundAmount("");
      setShowFundPanel(false);
      await fetchStakingData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fund reward pool",
      );
    } finally {
      setIsFundingRewardPool(false);
    }
  };

  const handleStake = async () => {
    const stakeAmount = parseFloat(amount);
    if (!stakeAmount || stakeAmount <= 0) {
      setError("Enter an amount to stake");
      return;
    }
    if (data && stakeAmount > data.tokenBalance) {
      setError("Insufficient token balance");
      return;
    }

    setIsStaking(true);
    setError(null);

    try {
      const response = await authFetch(`/api/staking/${agentId}/stake`, {
        method: "POST",
        body: JSON.stringify({
          tokenMint,
          amount: stakeAmount,
          lockDays: duration.days,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to build stake transaction");
      }

      const { transaction } = await response.json();
      await signAndSend(transaction);

      setSuccess(
        `Staked ${stakeAmount.toLocaleString()} ${tokenSymbol} successfully!`,
      );
      setAmount("");
      await fetchStakingData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stake tokens");
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async (position: StakePosition) => {
    setLoadingPosition(`unstake-${position.id}`);
    setError(null);

    try {
      const response = await authFetch(`/api/staking/${agentId}/unstake`, {
        method: "POST",
        body: JSON.stringify({
          tokenMint,
          positionId: position.id,
          stakeNonce: position.nonce,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to build unstake transaction");
      }

      const { transaction } = await response.json();
      await signAndSend(transaction);

      setSuccess(
        `Unstaked ${formatNumber(position.amount)} ${tokenSymbol} and claimed rewards!`,
      );
      await fetchStakingData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unstake tokens");
    } finally {
      setLoadingPosition(null);
    }
  };

  const handleClaim = async (position: StakePosition) => {
    setLoadingPosition(`claim-${position.id}`);
    setError(null);

    try {
      const response = await authFetch(`/api/staking/${agentId}/claim`, {
        method: "POST",
        body: JSON.stringify({
          tokenMint,
          stakeNonce: position.nonce,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to build claim transaction");
      }

      const { transaction } = await response.json();
      await signAndSend(transaction);

      setSuccess(
        `Claimed rewards for ${formatNumber(position.amount)} ${tokenSymbol} position!`,
      );
      await fetchStakingData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim rewards");
    } finally {
      setLoadingPosition(null);
    }
  };

  // ─── Quick Amount Helpers ───────────────────────────────────────

  const setAmountPercent = (pct: number) => {
    if (!tokenBalance) return;
    const val = tokenBalance * (pct / 100);
    setAmount(val < 1 ? val.toFixed(4) : String(Math.floor(val)));
    setError(null);
  };

  const setFundPercent = (pct: number) => {
    if (!data?.tokenBalance) return;
    const val = data.tokenBalance * (pct / 100);
    setFundAmount(val < 1 ? val.toFixed(4) : String(Math.floor(val)));
  };

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="staking-fade-in rounded-2xl bg-[#0a0520]/80 backdrop-blur-sm border border-[#6FEC06]/15 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#6FEC06]/10 border border-[#6FEC06]/20">
            <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-[#6FEC06]" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold font-display leading-tight">
              Stake {tokenSymbol}
            </h2>
            <p className="text-[10px] sm:text-xs text-white/55 mt-0.5">
              Lock tokens to earn rewards
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchStakingData()}
          disabled={isLoadingData}
          className="p-2 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
          title="Refresh"
        >
          <RefreshCw
            className={`w-4 h-4 text-white/50 ${isLoadingData ? "animate-spin" : "hover:text-white/70"}`}
          />
        </button>
      </div>

      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        {/* Loading Skeleton */}
        {isLoadingData && <StakingSkeleton />}

        {/* Loaded Content */}
        {!isLoadingData && (
          <div className="staking-fade-in">
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-6">
              {[
                {
                  label: "Total Staked",
                  value: formatNumber(stats.totalStaked),
                  accent: false,
                },
                {
                  label: "Stakers",
                  value: String(stats.totalStakers),
                  accent: false,
                },
                {
                  label: "APY",
                  value: `${stats.apy.toFixed(1)}%`,
                  accent: true,
                },
                {
                  label: "Rewards Pool",
                  value: formatNumber(stats.rewardsPool),
                  accent: false,
                },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  className={`p-2.5 sm:p-3 rounded-xl border transition-colors ${
                    stat.accent
                      ? "bg-[#6FEC06]/5 border-[#6FEC06]/15"
                      : "bg-white/[0.02] border-white/5 hover:border-white/10"
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div
                    className={`text-[9px] sm:text-[10px] uppercase tracking-wider mb-1 ${
                      stat.accent ? "text-[#6FEC06]/70" : "text-white/45"
                    }`}
                  >
                    {stat.label}
                  </div>
                  <div
                    className={`text-sm sm:text-base font-bold tabular-nums ${
                      stat.accent ? "text-[#6FEC06]" : "text-white"
                    }`}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Success Toast */}
            {success && (
              <div className="staking-toast-in mb-4 p-3 rounded-xl bg-[#6FEC06]/10 border border-[#6FEC06]/20 flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#6FEC06] shrink-0" />
                <span className="text-xs sm:text-sm text-[#6FEC06]/90 flex-1">
                  {success}
                </span>
              </div>
            )}

            {/* Error Toast */}
            {error && (
              <div className="staking-toast-in mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-xs sm:text-sm text-red-400/90 flex-1">
                  {error}
                </span>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400/60 hover:text-red-400 text-xs transition-colors px-1"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* No Pool State */}
            {!poolExists && (
              <div className="staking-fade-in text-center py-8 sm:py-10">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/5">
                  <Coins className="w-7 h-7 sm:w-8 sm:h-8 text-white/30" />
                </div>
                <p className="text-sm sm:text-base text-white/55 mb-1.5">
                  No staking pool yet
                </p>
                <p className="text-xs text-white/40 mb-5 max-w-xs mx-auto">
                  The agent creator can set up staking for {tokenSymbol} holders
                </p>
                {isAuthenticated && data?.isCreator && (
                  <button
                    onClick={handleCreatePool}
                    disabled={isCreatingPool}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6FEC06]/10 border border-[#6FEC06]/30 rounded-xl text-[#6FEC06] text-sm font-medium hover:bg-[#6FEC06]/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {isCreatingPool ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {isCreatingPool
                      ? "Creating Pool..."
                      : "Create Staking Pool"}
                  </button>
                )}
              </div>
            )}

            {/* Reward Pool Setup Banner */}
            {poolExists &&
              data &&
              !data.hasRewardPool &&
              isAuthenticated &&
              data.isCreator && (
                <div className="staking-fade-in mb-5 p-4 rounded-xl bg-amber-500/8 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-amber-500/15 shrink-0 mt-0.5">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-amber-300 mb-1">
                        Rewards not set up yet
                      </p>
                      <p className="text-xs text-amber-300/70 mb-3 leading-relaxed">
                        Create a reward pool so stakers can earn {tokenSymbol}{" "}
                        rewards. This sets a daily reward rate distributed to
                        all stakers.
                      </p>
                      <button
                        onClick={handleCreateRewardPool}
                        disabled={isCreatingRewardPool}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/15 border border-amber-500/25 rounded-lg text-amber-300 text-xs font-medium hover:bg-amber-500/25 active:scale-[0.98] transition-all disabled:opacity-40 disabled:pointer-events-none"
                      >
                        {isCreatingRewardPool ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        {isCreatingRewardPool
                          ? "Setting Up Rewards..."
                          : "Setup Reward Pool"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            {/* Fund Reward Pool */}
            {poolExists && data?.hasRewardPool && isAuthenticated && (
              <div className="mb-5">
                <button
                  onClick={() => {
                    setShowFundPanel(!showFundPanel);
                    if (showFundPanel) setFundAmount("");
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#6FEC06]/15 transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#6FEC06]/8 flex items-center justify-center group-hover:bg-[#6FEC06]/15 transition-colors">
                      <Plus className="w-3.5 h-3.5 text-[#6FEC06]/85" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-medium text-white/60 group-hover:text-white/80 transition-colors">
                        Fund Reward Pool
                      </div>
                      <div className="text-[10px] text-white/45">
                        Deposit {tokenSymbol} for staking rewards
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-white/45 group-hover:text-white/55 transition-all duration-200 ${
                      showFundPanel ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Collapsible Fund Panel */}
                <div
                  className={`staking-collapsible ${showFundPanel ? "open" : ""}`}
                >
                  <div>
                    <div className="pt-3">
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-[#6FEC06]/10">
                        <p className="text-[10px] sm:text-xs text-white/50 mb-3 leading-relaxed">
                          Deposit {tokenSymbol} tokens into the reward pool.
                          These tokens will be distributed to stakers based on
                          the reward rate ({stats.apy.toFixed(1)}% APY).
                        </p>

                        {/* Fund Input */}
                        <input
                          type="number"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                          placeholder="Amount to fund"
                          className="w-full px-3.5 py-2.5 bg-black/20 border border-white/10 rounded-xl text-sm text-white placeholder-white/35 outline-none focus:border-[#6FEC06]/30 focus:ring-1 focus:ring-[#6FEC06]/10 transition-all tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />

                        {/* Percentage Buttons */}
                        <div className="flex gap-1.5 mt-2.5 mb-3">
                          {[25, 50, 75, 100].map((pct) => (
                            <button
                              key={pct}
                              onClick={() => setFundPercent(pct)}
                              className="flex-1 py-1.5 rounded-lg text-[10px] font-medium bg-white/[0.03] border border-white/8 text-white/55 hover:bg-[#6FEC06]/8 hover:border-[#6FEC06]/20 hover:text-[#6FEC06]/85 active:scale-[0.97] transition-all"
                            >
                              {pct === 100 ? "MAX" : `${pct}%`}
                            </button>
                          ))}
                        </div>

                        {tokenBalance > 0 && (
                          <p className="text-[10px] text-white/40 mb-3">
                            Balance: {tokenBalance.toLocaleString()}{" "}
                            {tokenSymbol}
                          </p>
                        )}

                        {/* Fund + Cancel Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={handleFundRewardPool}
                            disabled={
                              isFundingRewardPool ||
                              !fundAmount ||
                              parseFloat(fundAmount) <= 0
                            }
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#6FEC06]/10 border border-[#6FEC06]/25 rounded-xl text-[#6FEC06] text-sm font-medium hover:bg-[#6FEC06]/20 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none"
                          >
                            {isFundingRewardPool ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Coins className="w-4 h-4" />
                            )}
                            {isFundingRewardPool
                              ? "Funding..."
                              : `Fund ${fundAmount ? Math.floor(parseFloat(fundAmount)).toLocaleString() : ""} ${tokenSymbol}`}
                          </button>
                          <button
                            onClick={() => {
                              setShowFundPanel(false);
                              setFundAmount("");
                            }}
                            className="px-4 py-2.5 rounded-xl text-white/50 text-sm hover:text-white/70 hover:bg-white/5 transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Staking UI */}
            {poolExists && (
              <div className="staking-fade-in">
                {/* User Position Summary */}
                {userTotalStaked > 0 && (
                  <div className="mb-5 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-[#6FEC06]/8 to-transparent border border-[#6FEC06]/15">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] sm:text-xs text-[#6FEC06]/70 mb-0.5">
                          Your Staked
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-[#6FEC06] tabular-nums">
                          {formatNumber(userTotalStaked)}{" "}
                          <span className="text-xs sm:text-sm font-normal text-[#6FEC06]/70">
                            {tokenSymbol}
                          </span>
                        </div>
                      </div>
                      {userTotalEarned > 0 && (
                        <div className="text-right">
                          <div className="text-[10px] sm:text-xs text-[#6FEC06]/70 mb-0.5">
                            Earned
                          </div>
                          <div className="text-lg sm:text-xl font-bold text-[#6FEC06] tabular-nums">
                            {formatNumber(userTotalEarned)}{" "}
                            <span className="text-xs sm:text-sm font-normal text-[#6FEC06]/70">
                              {tokenSymbol}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab Switcher */}
                <div className="relative flex p-1 rounded-xl bg-white/[0.03] border border-white/5 mb-5">
                  {/* Sliding indicator */}
                  <div
                    className="staking-tab-indicator absolute top-1 bottom-1 rounded-lg"
                    style={{
                      width: "calc(50% - 4px)",
                      left: activeTab === "stake" ? "4px" : "calc(50% + 0px)",
                      background:
                        activeTab === "stake"
                          ? "rgba(111, 236, 6, 0.15)"
                          : "rgba(255, 255, 255, 0.06)",
                      border:
                        activeTab === "stake"
                          ? "1px solid rgba(111, 236, 6, 0.25)"
                          : "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  />
                  <button
                    onClick={() => setActiveTab("stake")}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "stake"
                        ? "text-[#6FEC06]"
                        : "text-white/55 hover:text-white/70"
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Stake
                  </button>
                  <button
                    onClick={() => setActiveTab("unstake")}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === "unstake"
                        ? "text-white"
                        : "text-white/55 hover:text-white/70"
                    }`}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Unstake
                    {positions.length > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] tabular-nums">
                        {positions.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Stake Tab */}
                {activeTab === "stake" && (
                  <div className="staking-fade-in space-y-4">
                    {/* Amount Input */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium">
                          Amount
                        </label>
                        <button
                          onClick={() => setAmountPercent(100)}
                          className="text-[10px] sm:text-xs text-[#6FEC06]/80 hover:text-[#6FEC06] transition-colors"
                        >
                          Balance: {formatNumber(tokenBalance)} {tokenSymbol}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => {
                            setAmount(e.target.value);
                            setError(null);
                          }}
                          placeholder="0"
                          disabled={!isAuthenticated}
                          className="w-full pl-4 pr-28 sm:pr-32 py-3 bg-black/20 border border-white/8 focus:border-[#6FEC06]/30 focus:ring-1 focus:ring-[#6FEC06]/10 rounded-xl text-base text-white placeholder-white/30 outline-none transition-all tabular-nums disabled:opacity-30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          {[
                            { pct: 25, label: "25%" },
                            { pct: 50, label: "50%" },
                            { pct: 100, label: "MAX", accent: true },
                          ].map(({ pct, label, accent }) => (
                            <button
                              key={pct}
                              onClick={() => setAmountPercent(pct)}
                              className={`px-2 py-1 text-[10px] rounded-md font-medium transition-all active:scale-95 ${
                                accent
                                  ? "bg-[#6FEC06]/10 text-[#6FEC06]/80 hover:text-[#6FEC06] hover:bg-[#6FEC06]/20"
                                  : "bg-white/5 text-white/50 hover:text-white/70 hover:bg-white/8"
                              }`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Lock Duration */}
                    <div>
                      <label className="text-[10px] sm:text-xs text-white/50 uppercase tracking-wider font-medium mb-2 block">
                        Lock Duration
                      </label>
                      <div className="relative" ref={durationRef}>
                        <button
                          onClick={() =>
                            setShowDurationPicker(!showDurationPicker)
                          }
                          className="w-full flex items-center justify-between px-4 py-3 bg-black/20 border border-white/8 hover:border-white/15 rounded-xl transition-all"
                        >
                          <div className="flex items-center gap-2.5">
                            <Clock className="w-4 h-4 text-white/50" />
                            <span className="text-sm sm:text-base text-white">
                              {duration.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm text-[#6FEC06]/80 font-medium">
                              {duration.multiplier}x rewards
                            </span>
                            <ChevronDown
                              className={`w-4 h-4 text-white/50 transition-transform duration-200 ${
                                showDurationPicker ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </button>

                        {/* Duration Dropdown */}
                        {showDurationPicker && (
                          <div className="animate-dropdown-in absolute top-full left-0 right-0 mt-1.5 bg-[#0d0625] border border-white/10 rounded-xl overflow-hidden z-20 shadow-2xl shadow-black/50">
                            {LOCK_DURATIONS.map((d, i) => (
                              <button
                                key={d.days}
                                onClick={() => {
                                  setSelectedDuration(i);
                                  setShowDurationPicker(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-all ${
                                  i === selectedDuration
                                    ? "bg-[#6FEC06]/10 text-[#6FEC06]"
                                    : "text-white/60 hover:bg-white/[0.03] hover:text-white/80"
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <Clock className="w-3.5 h-3.5 opacity-50" />
                                  <span>{d.label}</span>
                                </div>
                                <span
                                  className={`text-xs font-medium ${
                                    i === selectedDuration
                                      ? "text-[#6FEC06]"
                                      : "text-white/50"
                                  }`}
                                >
                                  {d.multiplier}x rewards
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Estimated Rewards */}
                    {amount && parseFloat(amount) > 0 && stats.apy > 0 && (
                      <div className="staking-fade-in p-3.5 rounded-xl bg-[#6FEC06]/5 border border-[#6FEC06]/10">
                        <div className="flex items-center gap-1.5 mb-2">
                          <TrendingUp className="w-3.5 h-3.5 text-[#6FEC06]/70" />
                          <span className="text-[10px] sm:text-xs text-[#6FEC06]/70 uppercase tracking-wider font-medium">
                            Estimated Rewards
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg sm:text-xl font-bold text-[#6FEC06] tabular-nums staking-number-pop">
                            ~
                            {formatNumber(
                              (parseFloat(amount) *
                                (stats.apy / 100) *
                                duration.days) /
                                365,
                            )}
                          </span>
                          <span className="text-xs text-[#6FEC06]/70 font-medium">
                            {tokenSymbol}
                          </span>
                          <span className="text-[10px] text-white/45 ml-1">
                            over {duration.label.toLowerCase()} (
                            {duration.multiplier}x weight)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Stake Button */}
                    {isAuthenticated ? (
                      <button
                        onClick={handleStake}
                        disabled={
                          isStaking || !amount || parseFloat(amount) <= 0
                        }
                        className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-[#6FEC06] to-[#5ad005] rounded-xl text-black text-sm sm:text-base font-semibold hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-30 disabled:pointer-events-none shadow-lg shadow-[#6FEC06]/10"
                      >
                        {isStaking ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                            Stake {tokenSymbol}
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="text-center py-4 text-sm text-white/45">
                        Connect wallet to stake
                      </div>
                    )}
                  </div>
                )}

                {/* Unstake Tab */}
                {activeTab === "unstake" && (
                  <div className="staking-fade-in space-y-3">
                    {positions.length === 0 ? (
                      <div className="text-center py-10 sm:py-12">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/5">
                          <Coins className="w-7 h-7 sm:w-8 sm:h-8 text-white/30" />
                        </div>
                        <p className="text-sm sm:text-base text-white/55 mb-1.5">
                          No staked positions
                        </p>
                        <p className="text-xs text-white/40 max-w-xs mx-auto">
                          Stake {tokenSymbol} tokens to start earning rewards
                        </p>
                      </div>
                    ) : (
                      positions.map((position, i) => {
                        const unlocked = isUnlocked(position.unlockAt);
                        const isUnstaking =
                          loadingPosition === `unstake-${position.id}`;
                        const isClaiming =
                          loadingPosition === `claim-${position.id}`;
                        const isPositionBusy = isUnstaking || isClaiming;
                        const hasRewards =
                          data?.hasRewardPool && position.earned > 0;
                        return (
                          <div
                            key={position.id}
                            className={`staking-fade-in p-3.5 sm:p-4 rounded-xl border transition-all ${
                              unlocked
                                ? "bg-[#6FEC06]/5 border-[#6FEC06]/15 hover:border-[#6FEC06]/25"
                                : "bg-white/[0.02] border-white/5"
                            }`}
                            style={{ animationDelay: `${i * 60}ms` }}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="text-sm sm:text-base font-bold text-white tabular-nums">
                                  {formatNumber(position.amount)}{" "}
                                  <span className="text-xs font-normal text-white/55">
                                    {tokenSymbol}
                                  </span>
                                </div>
                                <div className="text-[10px] sm:text-xs text-white/45 mt-0.5">
                                  {position.multiplier}x multiplier
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1.5">
                                  {unlocked ? (
                                    <Unlock className="w-3 h-3 text-[#6FEC06]" />
                                  ) : (
                                    <Lock className="w-3 h-3 text-white/45" />
                                  )}
                                  <span
                                    className={`text-xs font-medium ${
                                      unlocked
                                        ? "text-[#6FEC06]"
                                        : "text-white/55"
                                    }`}
                                  >
                                    {getTimeRemaining(position.unlockAt)}
                                  </span>
                                </div>
                                {position.earned > 0 && (
                                  <div className="text-[10px] sm:text-xs text-[#6FEC06]/80 mt-0.5 tabular-nums">
                                    +{formatNumber(position.earned)} earned
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {/* Claim Rewards button — available any time there are rewards */}
                              {hasRewards && (
                                <button
                                  onClick={() => handleClaim(position)}
                                  disabled={isPositionBusy || !!loadingPosition}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium bg-[#6FEC06]/10 text-[#6FEC06] hover:bg-[#6FEC06]/20 active:scale-[0.99] border border-[#6FEC06]/20 transition-all disabled:opacity-30 disabled:pointer-events-none"
                                >
                                  {isClaiming ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Gift className="w-3.5 h-3.5" />
                                  )}
                                  {isClaiming ? "Claiming..." : "Claim Rewards"}
                                </button>
                              )}
                              {/* Unstake button */}
                              <button
                                onClick={() => handleUnstake(position)}
                                disabled={
                                  !unlocked ||
                                  isPositionBusy ||
                                  !!loadingPosition
                                }
                                className={`${hasRewards ? "flex-1" : "w-full"} flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                                  unlocked
                                    ? "bg-white/[0.04] text-white/70 hover:bg-white/[0.08] active:scale-[0.99] border border-white/10"
                                    : "bg-white/[0.03] text-white/40 cursor-not-allowed border border-white/5"
                                }`}
                              >
                                {isUnstaking ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : unlocked ? (
                                  <>
                                    <Unlock className="w-3.5 h-3.5" />
                                    Unstake
                                  </>
                                ) : (
                                  `Locked — ${getTimeRemaining(position.unlockAt)}`
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-white/5 bg-white/[0.01]">
        <div className="flex items-center justify-between">
          <a
            href="https://streamflow.finance/staking"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[10px] sm:text-xs text-white/30 hover:text-white/55 transition-colors"
          >
            <Zap className="w-3 h-3" />
            Powered by Streamflow
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
          <div className="flex items-center gap-3">
            {data?.stakePoolAddress && (
              <a
                href={`https://solscan.io/account/${data.stakePoolAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] sm:text-xs text-white/30 hover:text-white/55 transition-colors"
              >
                View pool
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            <a
              href={`https://solscan.io/token/${tokenMint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] sm:text-xs text-white/30 hover:text-white/55 transition-colors"
            >
              View token
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
