"use client";

import { usePrivy } from "@privy-io/react-auth";
import { LogIn, LogOut, Wallet, Loader2 } from "lucide-react";

interface LoginButtonProps {
  className?: string;
  fullWidth?: boolean;
}

export default function LoginButton({
  className = "",
  fullWidth = false,
}: LoginButtonProps) {
  const { ready, authenticated, login, logout, user } = usePrivy();

  // Show loading state while Privy initializes
  if (!ready) {
    return (
      <button
        disabled
        className={`${
          fullWidth ? "w-full" : ""
        } px-6 py-2.5 bg-gray-700/50 rounded-full font-medium cursor-not-allowed flex items-center justify-center gap-2 opacity-60 ${className}`}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading...
      </button>
    );
  }

  // User is authenticated - show logout button with user info
  if (authenticated && user) {
    // Get display name - prefer email, then Solana wallet address
    const solanaWallet = user.linkedAccounts?.find(
      (account) => account.type === "wallet" && account.chainType === "solana"
    );
    const walletAddress =
      solanaWallet && "address" in solanaWallet ? solanaWallet.address : null;

    const displayName = user.email?.address
      ? user.email.address
      : walletAddress
        ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
        : "Connected";

    return (
      <button
        onClick={logout}
        className={`${
          fullWidth ? "w-full" : ""
        } px-6 py-2.5 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 hover:from-purple-600/30 hover:to-cyan-600/30 border border-purple-500/30 rounded-full font-medium transition-all duration-200 flex items-center justify-center gap-2 group ${className}`}
      >
        <Wallet className="w-4 h-4 text-purple-400" />
        <span className="truncate max-w-[120px]">{displayName}</span>
        <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
      </button>
    );
  }

  // User is not authenticated - show login button
  return (
    <button
      onClick={login}
      className={`${
        fullWidth ? "w-full" : ""
      } px-6 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 rounded-full font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 ${className}`}
    >
      <LogIn className="w-4 h-4" />
      Login
    </button>
  );
}
