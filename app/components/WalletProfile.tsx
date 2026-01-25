"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Wallet,
  Copy,
  Check,
  LogOut,
  ExternalLink,
  ChevronDown,
  RefreshCw,
} from "lucide-react";

interface WalletProfileProps {
  className?: string;
  fullWidth?: boolean;
}

export default function WalletProfile({
  className = "",
  fullWidth = false,
}: WalletProfileProps) {
  const { logout, user } = usePrivy();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get the Solana wallet address from linked accounts
  const walletAddress = useMemo(() => {
    const solanaWallet = user?.linkedAccounts?.find(
      (account) => account.type === "wallet" && account.chainType === "solana"
    );
    return solanaWallet && "address" in solanaWallet ? solanaWallet.address : null;
  }, [user?.linkedAccounts]);

  // Fetch SOL balance using multiple RPC endpoints as fallbacks
  // Fetch balance on mount and when wallet changes
  useEffect(() => {
    if (!walletAddress) return;

    let cancelled = false;
    const controller = new AbortController();

    const fetchBalance = async () => {
      setIsLoadingBalance(true);
      
      const rpcEndpoints = [
        "https://api.devnet.solana.com",
        "https://rpc.ankr.com/solana",
        "https://solana-mainnet.g.alchemy.com/v2/demo",
      ];

      for (const rpc of rpcEndpoints) {
        if (cancelled) return;
        try {
          const response = await fetch(rpc, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "getBalance",
              params: [walletAddress],
            }),
            signal: controller.signal,
          });

          if (!response.ok) continue;

          const data = await response.json();
          if (data.result?.value !== undefined && !cancelled) {
            setBalance(data.result.value / 1e9);
            setIsLoadingBalance(false);
            return;
          }
        } catch {
          continue;
        }
      }

      if (!cancelled) {
        setBalance(null);
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [walletAddress]);

  // Manual refresh handler
  const refreshBalance = async () => {
    if (!walletAddress) return;
    setIsLoadingBalance(true);

    const rpcEndpoints = [
      "https://api.devnet.solana.com",
      "https://rpc.ankr.com/solana",
      "https://solana-mainnet.g.alchemy.com/v2/demo",
    ];

    for (const rpc of rpcEndpoints) {
      try {
        const response = await fetch(rpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getBalance",
            params: [walletAddress],
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();
        if (data.result?.value !== undefined) {
          setBalance(data.result.value / 1e9);
          setIsLoadingBalance(false);
          return;
        }
      } catch {
        continue;
      }
    }

    setBalance(null);
    setIsLoadingBalance(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  const displayName = email || (walletAddress ? formatAddress(walletAddress) : "Connected");

  return (
    <div className={`relative ${fullWidth ? "w-full" : ""}`} ref={dropdownRef}>
      {/* Main Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`${
          fullWidth ? "w-full" : ""
        } px-3 py-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700/50 hover:border-gray-600/50 rounded-xl font-medium transition-all duration-200 flex items-center gap-2.5 group ${className}`}
      >
        {/* Avatar/Icon */}
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
          <Wallet className="w-3.5 h-3.5 text-white" />
        </div>

        {/* Info */}
        <div className="flex flex-col items-start min-w-0">
          <span className="text-[11px] text-gray-500 leading-tight">
            {balance !== null ? (
              `${formatBalance(balance)} SOL`
            ) : isLoadingBalance ? (
              "..."
            ) : (
              "Wallet"
            )}
          </span>
          <span className="text-sm font-medium text-gray-200 truncate max-w-[100px] leading-tight">
            {walletAddress ? formatAddress(walletAddress) : displayName}
          </span>
        </div>

        {/* Dropdown Arrow */}
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-900/98 backdrop-blur-2xl border border-gray-800 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header with Balance */}
          <div className="p-4 pb-3">
            {/* User Info Row */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                {email && (
                  <p className="text-xs text-gray-500 truncate leading-tight">{email}</p>
                )}
                {walletAddress && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-sm font-mono text-gray-200">
                      {formatAddress(walletAddress, false)}
                    </span>
                    <button
                      onClick={copyAddress}
                      className="p-1 hover:bg-gray-700/50 rounded-md transition-all duration-150 active:scale-95"
                      title="Copy address"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-500 hover:text-gray-300" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Balance Card */}
            {walletAddress && (
              <div className="bg-gradient-to-br from-gray-800/80 to-gray-800/40 rounded-xl p-3 border border-gray-700/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Balance</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      refreshBalance();
                    }}
                    disabled={isLoadingBalance}
                    className="p-1 hover:bg-gray-700/50 rounded-md transition-all duration-150 disabled:opacity-50 active:scale-95"
                    title="Refresh"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-gray-500 ${
                        isLoadingBalance ? "animate-spin" : ""
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-white tabular-nums">
                    {balance !== null ? formatBalance(balance) : "—"}
                  </span>
                  <span className="text-sm text-gray-400 font-medium">SOL</span>
                </div>
                {balance !== null && (
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    ≈ ${(balance * 150).toFixed(2)} USD
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-700/50 to-transparent" />

          {/* Actions */}
          <div className="p-2">
            {/* View on Explorer */}
            {walletAddress && (
              <a
                href={`https://solscan.io/account/${walletAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-800/60 rounded-lg transition-all duration-150 group"
              >
                <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-gray-300" />
                <span className="text-sm text-gray-300 group-hover:text-white">View on Solscan</span>
              </a>
            )}

            {/* Disconnect */}
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-500/10 rounded-lg transition-all duration-150 group"
            >
              <LogOut className="w-4 h-4 text-gray-500 group-hover:text-red-400" />
              <span className="text-sm text-gray-300 group-hover:text-red-400">Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
