"use client";

import { usePrivy } from "@privy-io/react-auth";
import {
  useExportWallet,
  useWallets as useSolanaWallets,
} from "@privy-io/react-auth/solana";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  Wallet,
  Copy,
  Check,
  LogOut,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Key,
  Coins,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import WalletModal from "./WalletModal";
import WalletSwitcher from "./WalletSwitcher";
import { getSolscanUrl } from "@/lib/constants/urls";
import { useWalletBalance } from "@/lib/hooks/useWalletBalance";
import { useActiveWalletAddress } from "@/lib/hooks/useActiveWalletAddress";

interface ClaimablePosition {
  baseMint: string;
  totalClaimable: number;
}

interface WalletProfileProps {
  className?: string;
  fullWidth?: boolean;
  compact?: boolean;
}

export default function WalletProfile({
  className = "",
  fullWidth = false,
  compact = false,
}: WalletProfileProps) {
  const { logout, user } = usePrivy();
  const { authFetch, identityToken } = useAuth();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { exportWallet } = useExportWallet();
  const walletAddress = useActiveWalletAddress();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<
    "deposit" | "withdraw"
  >("deposit");
  const [copied, setCopied] = useState(false);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [earnings, setEarnings] = useState<number | null>(null);
  const [earningsPositions, setEarningsPositions] = useState<
    ClaimablePosition[]
  >([]);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Private key export state
  const [isExportingKey, setIsExportingKey] = useState(false);
  const [exportedKey, setExportedKey] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Use ref for cache timestamp to avoid dependency loops
  const lastPriceFetchRef = useRef<number>(0);
  const lastEarningsFetchRef = useRef<number>(0);

  // Realtime wallet balance via Solana WebSocket subscription
  const {
    balance,
    isLoading: isLoadingBalance,
    refresh: refreshBalance,
  } = useWalletBalance(walletAddress, { showToasts: true });

  // Fetch SOL price via backend API with smart caching
  const fetchSolPrice = useCallback(
    async (force = false) => {
      if (!identityToken) return;

      const now = Date.now();
      const PRICE_CACHE_TTL = 30 * 1000;
      if (!force && now - lastPriceFetchRef.current < PRICE_CACHE_TTL) {
        return;
      }

      try {
        const response = await authFetch("/api/price");
        if (response.ok) {
          const data = await response.json();
          if (data.price) {
            setSolPrice(data.price);
            lastPriceFetchRef.current = now;
          }
        }
      } catch (error) {
        console.error("[WalletProfile] Failed to fetch SOL price:", error);
      }
    },
    [identityToken, authFetch],
  );

  // Fetch SOL price on mount and every 30 seconds (only when visible)
  useEffect(() => {
    const PRICE_CACHE_TTL = 30 * 1000;
    fetchSolPrice(true);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchSolPrice();
      }
    }, PRICE_CACHE_TTL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchSolPrice();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchSolPrice]);

  // Fetch claimable earnings from Bags API
  const fetchEarnings = useCallback(
    async (force = false) => {
      if (!identityToken || !walletAddress) return;

      const now = Date.now();
      const EARNINGS_CACHE_TTL = 60 * 1000;
      if (!force && now - lastEarningsFetchRef.current < EARNINGS_CACHE_TTL) {
        return;
      }

      setIsLoadingEarnings(true);
      try {
        const response = await authFetch("/api/earnings/positions", {
          method: "POST",
          body: JSON.stringify({ wallet: walletAddress }),
        });
        if (response.ok) {
          const data = await response.json();
          setEarnings(data.totalClaimableSol ?? 0);
          setEarningsPositions(data.positions ?? []);
          lastEarningsFetchRef.current = now;
        }
      } catch (error) {
        console.error("[WalletProfile] Failed to fetch earnings:", error);
      } finally {
        setIsLoadingEarnings(false);
      }
    },
    [identityToken, walletAddress, authFetch],
  );

  // Fetch earnings on mount and periodically
  useEffect(() => {
    if (walletAddress && identityToken) {
      fetchEarnings(true);
    }
  }, [walletAddress, identityToken, fetchEarnings]);

  // Claim all earnings — server signs the claim transactions for server-owned wallets
  const handleClaimEarnings = useCallback(async () => {
    if (!identityToken || !walletAddress || !earnings || earnings <= 0) return;

    setIsClaiming(true);
    setClaimSuccess(false);

    try {
      const claimResponse = await authFetch("/api/earnings/claim", {
        method: "POST",
        body: JSON.stringify({ wallet: walletAddress }),
      });

      if (!claimResponse.ok) {
        const error = await claimResponse.json();
        throw new Error(error.error || "Failed to generate claim transactions");
      }

      const { transactions } = await claimResponse.json();

      if (!transactions || transactions.length === 0) {
        setEarnings(0);
        setEarningsPositions([]);
        return;
      }

      // Send each unsigned transaction to the server for signing and broadcast
      for (const txData of transactions) {
        const sendResponse = await authFetch("/api/solana/send", {
          method: "POST",
          body: JSON.stringify({ transaction: txData.transaction }),
        });

        if (!sendResponse.ok) {
          const error = await sendResponse.json();
          console.error("[Claim] Failed to send claim transaction:", error);
          // Continue with remaining transactions
        }
      }

      setClaimSuccess(true);
      setTimeout(() => setClaimSuccess(false), 3000);

      setTimeout(() => {
        fetchEarnings(true);
      }, 2000);
    } catch (error) {
      console.error("[Claim] Error:", error);
    } finally {
      setIsClaiming(false);
    }
  }, [identityToken, walletAddress, earnings, fetchEarnings, authFetch]);

  // Open modal with specific tab
  const openModal = (tab: "deposit" | "withdraw") => {
    setModalInitialTab(tab);
    setIsModalOpen(true);
    setIsOpen(false);
  };

  // Export private key — tries server-side first (server-owned wallets),
  // falls back to Privy's React hook for legacy user-owned wallets.
  const exportPrivateKey = useCallback(async () => {
    if (!walletAddress) return;

    setIsExportingKey(true);
    setIsOpen(false);

    try {
      const response = await authFetch("/api/users/wallet/export", {
        method: "POST",
      });

      if (response.ok) {
        const data = await response.json();
        setExportedKey(data.privateKey);
        setShowKey(false);
        setKeyCopied(false);
        setShowExportModal(true);
        return;
      }

      const data = await response.json();
      if (data.error === "use_client_export") {
        // Legacy user-owned wallet — Privy's React SDK handles this securely
        await exportWallet({ address: walletAddress });
      } else {
        console.error("[WalletProfile] Failed to export wallet:", data.error);
      }
    } catch (error) {
      console.error("[WalletProfile] Export error:", error);
    } finally {
      setIsExportingKey(false);
    }
  }, [walletAddress, authFetch, exportWallet]);

  // Copy exported private key to clipboard
  const copyExportedKey = useCallback(async () => {
    if (!exportedKey) return;
    try {
      await navigator.clipboard.writeText(exportedKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [exportedKey]);

  // Send SOL (withdraw) — fully server-side, no client signing needed
  const handleSendTransaction = useCallback(
    async (to: string, amount: number): Promise<{ signature: string }> => {
      if (!identityToken) {
        throw new Error("Not authenticated");
      }

      const sendResponse = await authFetch("/api/solana/transfer", {
        method: "POST",
        body: JSON.stringify({ to, amountSol: amount }),
      });

      if (!sendResponse.ok) {
        const error = await sendResponse.json();
        throw new Error(error.error || "Failed to send transaction");
      }

      return sendResponse.json();
    },
    [identityToken, authFetch],
  );

  // Copy address to clipboard
  const copyAddress = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!walletAddress) return;

    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  };

  // Format address for display
  const formatAddress = (address: string, short = true) => {
    if (short) return `${address.slice(0, 4)}...${address.slice(-4)}`;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  // Format balance for display
  const formatBalance = (bal: number) => {
    if (bal === 0) return "0";
    if (bal < 0.0001) return "<0.0001";
    if (bal < 1) return bal.toFixed(4);
    if (bal < 100) return bal.toFixed(3);
    return bal.toFixed(2);
  };

  const email = user?.email?.address;
  const displayName =
    email || (walletAddress ? formatAddress(walletAddress) : "Connected");

  // Mask the private key for display (show first/last 4 chars)
  const maskedKey = exportedKey
    ? `${exportedKey.slice(0, 6)}${"•".repeat(Math.max(0, exportedKey.length - 12))}${exportedKey.slice(-6)}`
    : "";

  return (
    <>
      <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
        <div className={`relative ${fullWidth ? "w-full" : ""}`}>
          {/* Main Profile Button */}
          <DropdownMenu.Trigger asChild>
            <button
              className={`${fullWidth ? "w-full" : ""} ${
                compact ? "p-2 justify-center" : "px-3 py-2"
              } bg-[#120557]/50 hover:bg-[#120557]/70 border border-white/10 hover:border-white/20 rounded-xl font-medium transition-all duration-200 flex items-center gap-2.5 group ${className}`}
            >
              {/* Avatar/Icon */}
              <div
                className={`${compact ? "w-8 h-8" : "w-7 h-7"} rounded-lg bg-gradient-to-br from-[#6FEC06] to-[#120557] flex items-center justify-center flex-shrink-0`}
              >
                <Wallet
                  className={`${compact ? "w-4 h-4" : "w-3.5 h-3.5"} text-white`}
                />
              </div>

              {/* Info - hidden when compact */}
              {!compact && (
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span className="text-[11px] text-white/40 leading-tight">
                    {balance !== null
                      ? `${formatBalance(balance)} SOL`
                      : isLoadingBalance
                        ? "..."
                        : "Wallet"}
                  </span>
                  <span className="text-sm font-medium text-white/80 truncate max-w-[100px] leading-tight">
                    {walletAddress ? formatAddress(walletAddress) : displayName}
                  </span>
                </div>
              )}

              {/* Dropdown Arrow - hidden when compact */}
              {!compact && (
                <ChevronDown
                  className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>
          </DropdownMenu.Trigger>

          {/* Dropdown Menu */}
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="w-64 bg-[#000028]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-[9999] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
              sideOffset={8}
              align="end"
            >
              {/* Header with Balance */}
              <div className="p-4 pb-3">
                {/* User Info Row */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6FEC06] to-[#120557] flex items-center justify-center shadow-lg shadow-[#6FEC06]/20">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {email && (
                      <p className="text-xs text-white/40 truncate leading-tight">
                        {email}
                      </p>
                    )}
                    {walletAddress && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-sm font-mono text-white/80">
                          {formatAddress(walletAddress, false)}
                        </span>
                        <button
                          onClick={copyAddress}
                          className="p-1 hover:bg-[#120557]/50 rounded-md transition-all duration-150 active:scale-95"
                          title="Copy address"
                        >
                          {copied ? (
                            <Check className="w-3.5 h-3.5 text-[#10b981]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Balance Card */}
                {walletAddress && (
                  <div className="bg-gradient-to-br from-[#120557]/50 to-[#120557]/20 rounded-xl p-3 border border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] uppercase tracking-wider text-white/40 font-medium">
                        Balance
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          refreshBalance();
                        }}
                        disabled={isLoadingBalance}
                        className="p-1 hover:bg-[#120557]/50 rounded-md transition-all duration-150 disabled:opacity-50 active:scale-95"
                        title="Refresh"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 text-white/40 ${
                            isLoadingBalance ? "animate-spin" : ""
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold text-white tabular-nums">
                        {balance !== null ? formatBalance(balance) : "—"}
                      </span>
                      <span className="text-sm text-white/60 font-medium">
                        SOL
                      </span>
                    </div>
                    {balance !== null && (
                      <p className="text-[11px] text-white/40 mt-0.5">
                        ≈ ${solPrice ? (balance * solPrice).toFixed(2) : "—"}{" "}
                        USD
                      </p>
                    )}
                  </div>
                )}

                {/* Earnings Card */}
                {walletAddress && (
                  <div className="bg-gradient-to-br from-[#6FEC06]/10 to-[#6FEC06]/5 rounded-xl p-3 border border-[#6FEC06]/20 mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-[#6FEC06]/70" />
                        <span className="text-[11px] uppercase tracking-wider text-[#6FEC06]/70 font-medium">
                          Earnings
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fetchEarnings(true);
                        }}
                        disabled={isLoadingEarnings}
                        className="p-1 hover:bg-[#6FEC06]/10 rounded-md transition-all duration-150 disabled:opacity-50 active:scale-95"
                        title="Refresh earnings"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 text-[#6FEC06]/50 ${
                            isLoadingEarnings ? "animate-spin" : ""
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-bold text-[#6FEC06] tabular-nums">
                            {earnings !== null ? formatBalance(earnings) : "—"}
                          </span>
                          <span className="text-sm text-[#6FEC06]/60 font-medium">
                            SOL
                          </span>
                        </div>
                        {earnings !== null && earnings > 0 && solPrice && (
                          <p className="text-[11px] text-[#6FEC06]/50 mt-0.5">
                            ≈ ${(earnings * solPrice).toFixed(2)} USD
                          </p>
                        )}
                        {earningsPositions.length > 0 && (
                          <p className="text-[10px] text-white/30 mt-0.5">
                            {earningsPositions.length} position
                            {earningsPositions.length !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                      {earnings !== null && earnings > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClaimEarnings();
                          }}
                          disabled={isClaiming}
                          className={`px-2.5 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 flex items-center justify-center min-w-[52px] ${
                            claimSuccess
                              ? "bg-[#10b981] text-white"
                              : "bg-[#6FEC06] hover:bg-[#9FF24A] text-black"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isClaiming ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : claimSuccess ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            "Claim"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DropdownMenu.Separator className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Quick Actions - Deposit & Withdraw */}
              {walletAddress && (
                <div className="px-4 py-2 grid grid-cols-2 gap-2">
                  <DropdownMenu.Item asChild>
                    <button
                      onClick={() => openModal("deposit")}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 bg-[#6FEC06]/10 hover:bg-[#6FEC06]/20 border border-[#6FEC06]/20 hover:border-[#6FEC06]/30 rounded-xl transition-all duration-150 group outline-none cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#6FEC06]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowDownLeft className="w-4 h-4 text-[#6FEC06]" />
                      </div>
                      <span className="text-xs font-medium text-[#6FEC06]">
                        Deposit
                      </span>
                    </button>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <button
                      onClick={() => openModal("withdraw")}
                      className="flex flex-col items-center gap-1.5 py-3 px-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl transition-all duration-150 group outline-none cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ArrowUpRight className="w-4 h-4 text-white/70" />
                      </div>
                      <span className="text-xs font-medium text-white/70">
                        Withdraw
                      </span>
                    </button>
                  </DropdownMenu.Item>
                </div>
              )}

              <DropdownMenu.Separator className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Wallet Switcher */}
              <div className="px-4 py-2">
                <WalletSwitcher
                  onWalletChange={() => {
                    refreshBalance();
                    fetchEarnings(true);
                  }}
                />
              </div>

              <DropdownMenu.Separator className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* Actions */}
              <div className="px-4 py-2">
                {/* Export Private Key */}
                {walletAddress && (
                  <DropdownMenu.Item asChild>
                    <button
                      onClick={exportPrivateKey}
                      disabled={isExportingKey}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#120557]/40 rounded-lg transition-all duration-150 group outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isExportingKey ? (
                        <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                      ) : (
                        <Key className="w-4 h-4 text-white/40 group-hover:text-white/70" />
                      )}
                      <span className="text-sm text-white/70 group-hover:text-white">
                        {isExportingKey ? "Exporting..." : "Export Private Key"}
                      </span>
                    </button>
                  </DropdownMenu.Item>
                )}

                {/* View on Explorer */}
                {walletAddress && (
                  <DropdownMenu.Item asChild>
                    <a
                      href={getSolscanUrl("account", walletAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 hover:bg-[#120557]/40 rounded-lg transition-all duration-150 group outline-none cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white/70" />
                      <span className="text-sm text-white/70 group-hover:text-white">
                        View on Solscan
                      </span>
                    </a>
                  </DropdownMenu.Item>
                )}

                {/* Disconnect */}
                <DropdownMenu.Item asChild>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#ef4444]/10 rounded-lg transition-all duration-150 group outline-none cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-white/40 group-hover:text-[#ef4444]" />
                    <span className="text-sm text-white/70 group-hover:text-[#ef4444]">
                      Disconnect
                    </span>
                  </button>
                </DropdownMenu.Item>
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>

          {/* Wallet Modal */}
          {walletAddress && (
            <WalletModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              walletAddress={walletAddress}
              onSendTransaction={handleSendTransaction}
              initialTab={modalInitialTab}
            />
          )}
        </div>
      </DropdownMenu.Root>

      {/* Private Key Export Modal */}
      <Dialog.Root
        open={showExportModal}
        onOpenChange={(open) => {
          setShowExportModal(open);
          if (!open) {
            setExportedKey(null);
            setShowKey(false);
            setKeyCopied(false);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[10000] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[10001] w-full max-w-sm bg-[#000028] border border-white/10 rounded-2xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            {/* Warning header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444]/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
              </div>
              <div>
                <Dialog.Title className="text-base font-semibold text-white">
                  Private Key
                </Dialog.Title>
                <Dialog.Description className="text-xs text-white/40 mt-0.5">
                  Never share this with anyone
                </Dialog.Description>
              </div>
            </div>

            <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-xl p-3 mb-4">
              <p className="text-xs text-[#ef4444]/90 leading-relaxed">
                Anyone with this key has full control of your wallet. Store it
                securely offline and never paste it anywhere online.
              </p>
            </div>

            {/* Key display */}
            <div className="bg-[#120557]/40 border border-white/10 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wider text-white/40 font-medium">
                  Solana Private Key (Base58)
                </span>
                <button
                  onClick={() => setShowKey((v) => !v)}
                  className="p-1 hover:bg-white/10 rounded-md transition-all"
                  title={showKey ? "Hide key" : "Reveal key"}
                >
                  {showKey ? (
                    <EyeOff className="w-3.5 h-3.5 text-white/40" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-white/40" />
                  )}
                </button>
              </div>
              <p className="text-xs font-mono text-white/80 break-all leading-relaxed select-all">
                {showKey ? exportedKey : maskedKey}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={copyExportedKey}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  keyCopied
                    ? "bg-[#10b981] text-white"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                {keyCopied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Key
                  </>
                )}
              </button>
              <Dialog.Close asChild>
                <button className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-[#120557]/50 hover:bg-[#120557]/70 text-white/70 hover:text-white transition-all duration-200">
                  Close
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
