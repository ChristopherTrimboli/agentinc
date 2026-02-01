"use client";

import { usePrivy, useIdentityToken, useWallets } from "@privy-io/react-auth";
import { useExportWallet } from "@privy-io/react-auth/solana";
import { useState, useEffect, useMemo, useCallback } from "react";
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
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import WalletModal from "./WalletModal";

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
  const { identityToken } = useIdentityToken();
  const { wallets } = useWallets();
  const { exportWallet } = useExportWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<"deposit" | "withdraw">("deposit");
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // Fetch SOL price via backend API (keeps Jupiter API key private)
  const fetchSolPrice = useCallback(async () => {
    if (!identityToken) return;
    
    try {
      const response = await fetch("/api/price", {
        headers: {
          "privy-id-token": identityToken,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.price) {
          setSolPrice(data.price);
        }
      }
    } catch (error) {
      console.error("[WalletProfile] Failed to fetch SOL price:", error);
    }
  }, [identityToken]);

  // Fetch SOL price on mount and every 60 seconds
  useEffect(() => {
    fetchSolPrice();
    const interval = setInterval(fetchSolPrice, 60000);
    return () => clearInterval(interval);
  }, [fetchSolPrice]);

  // Get the Solana wallet address from linked accounts
  const walletAddress = useMemo(() => {
    const solanaWallet = user?.linkedAccounts?.find(
      (account) => account.type === "wallet" && account.chainType === "solana",
    );
    return solanaWallet && "address" in solanaWallet
      ? solanaWallet.address
      : null;
  }, [user?.linkedAccounts]);

  // Fetch balance via backend API (avoids CORS issues)
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

      if (response.ok) {
        const data = await response.json();
        setBalance(data.balanceSol ?? null);
      } else {
        setBalance(null);
      }
    } catch {
      setBalance(null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [walletAddress, identityToken]);

  // Fetch balance on mount and when wallet/token changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Auto-refresh balance every 15 seconds via server route
  useEffect(() => {
    if (!walletAddress || !identityToken) return;
    
    const interval = setInterval(() => {
      fetchBalance();
    }, 15000);
    
    return () => clearInterval(interval);
  }, [walletAddress, identityToken, fetchBalance]);

  // Manual refresh handler
  const refreshBalance = () => {
    fetchBalance();
  };

  // Open modal with specific tab
  const openModal = (tab: "deposit" | "withdraw") => {
    setModalInitialTab(tab);
    setIsModalOpen(true);
    setIsOpen(false);
  };

  // Export private key from embedded Solana wallet
  const exportPrivateKey = useCallback(async () => {
    if (!walletAddress) {
      console.error("No wallet address found");
      return;
    }

    try {
      // Privy's Solana-specific exportWallet opens a secure modal showing the private key
      await exportWallet({ address: walletAddress });
    } catch (error) {
      console.error("Failed to export wallet:", error);
    }
    
    setIsOpen(false);
  }, [walletAddress, exportWallet]);

  // Handle send transaction via Privy embedded wallet + server routes
  const handleSendTransaction = useCallback(async (to: string, amount: number): Promise<{ signature: string }> => {
    if (!identityToken) {
      throw new Error("Not authenticated");
    }

    // Find the embedded Solana wallet
    const embeddedWallet = wallets.find(w => 
      w.walletClientType === "privy" && 
      (w as unknown as { chainType?: string }).chainType === "solana"
    );
    
    if (!embeddedWallet) {
      throw new Error("No embedded wallet found. Please try again.");
    }

    try {
      // Import Solana dependencies
      const { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import("@solana/web3.js");
      
      // Get blockhash from server (uses authenticated RPC)
      const blockhashResponse = await fetch("/api/solana/blockhash", {
        headers: { "privy-id-token": identityToken },
      });
      
      if (!blockhashResponse.ok) {
        throw new Error("Failed to get blockhash");
      }
      
      const { blockhash } = await blockhashResponse.json();
      
      // Create the transfer instruction
      const fromPubkey = new PublicKey(walletAddress!);
      const toPubkey = new PublicKey(to);
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );
      
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;
      
      // Sign transaction with Privy wallet
      const walletWithProvider = embeddedWallet as unknown as { 
        getProvider: () => Promise<{ 
          signTransaction: (tx: typeof transaction) => Promise<typeof transaction>;
        }> 
      };
      const provider = await walletWithProvider.getProvider();
      const signedTx = await provider.signTransaction(transaction);
      
      // Serialize and send via server (uses authenticated RPC)
      const serializedTx = signedTx.serialize().toString("base64");
      
      const sendResponse = await fetch("/api/solana/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "privy-id-token": identityToken,
        },
        body: JSON.stringify({ signedTransaction: serializedTx }),
      });
      
      if (!sendResponse.ok) {
        const error = await sendResponse.json();
        throw new Error(error.error || "Failed to send transaction");
      }
      
      const { signature } = await sendResponse.json();
      
      // Refresh balance after sending
      setTimeout(() => fetchBalance(), 2000);
      
      return { signature };
    } catch (error) {
      console.error("Send transaction error:", error);
      throw error;
    }
  }, [wallets, walletAddress, identityToken, fetchBalance]);

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

  // Get user display info
  const email = user?.email?.address;
  const displayName =
    email || (walletAddress ? formatAddress(walletAddress) : "Connected");

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <div className={`relative ${fullWidth ? "w-full" : ""}`}>
        {/* Main Profile Button */}
        <DropdownMenu.Trigger asChild>
          <button
            className={`${
              fullWidth ? "w-full" : ""
            } ${
              compact 
                ? "p-2 justify-center" 
                : "px-3 py-2"
            } bg-[#120557]/50 hover:bg-[#120557]/70 border border-white/10 hover:border-white/20 rounded-xl font-medium transition-all duration-200 flex items-center gap-2.5 group ${className}`}
          >
            {/* Avatar/Icon */}
            <div className={`${compact ? "w-8 h-8" : "w-7 h-7"} rounded-lg bg-gradient-to-br from-[#6FEC06] to-[#120557] flex items-center justify-center flex-shrink-0`}>
              <Wallet className={`${compact ? "w-4 h-4" : "w-3.5 h-3.5"} text-white`} />
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
                    <span className="text-sm text-white/60 font-medium">SOL</span>
                  </div>
                  {balance !== null && (
                    <p className="text-[11px] text-white/40 mt-0.5">
                      ≈ ${solPrice ? (balance * solPrice).toFixed(2) : "—"} USD
                    </p>
                  )}
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
                    <span className="text-xs font-medium text-[#6FEC06]">Deposit</span>
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
                    <span className="text-xs font-medium text-white/70">Withdraw</span>
                  </button>
                </DropdownMenu.Item>
              </div>
            )}

            <DropdownMenu.Separator className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Actions */}
            <div className="px-4 py-2">
              {/* Export Private Key */}
              {walletAddress && (
                <DropdownMenu.Item asChild>
                  <button
                    onClick={exportPrivateKey}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[#120557]/40 rounded-lg transition-all duration-150 group outline-none cursor-pointer"
                  >
                    <Key className="w-4 h-4 text-white/40 group-hover:text-white/70" />
                    <span className="text-sm text-white/70 group-hover:text-white">
                      Export Private Key
                    </span>
                  </button>
                </DropdownMenu.Item>
              )}

              {/* View on Explorer */}
              {walletAddress && (
                <DropdownMenu.Item asChild>
                  <a
                    href={`https://solscan.io/account/${walletAddress}`}
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
            balance={balance}
            isLoadingBalance={isLoadingBalance}
            onRefreshBalance={refreshBalance}
            onSendTransaction={handleSendTransaction}
            initialTab={modalInitialTab}
          />
        )}
      </div>
    </DropdownMenu.Root>
  );
}
