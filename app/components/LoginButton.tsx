"use client";

import { usePrivy } from "@privy-io/react-auth";
import { LogIn, Loader2 } from "lucide-react";
import WalletProfile from "./WalletProfile";

interface LoginButtonProps {
  className?: string;
  fullWidth?: boolean;
  compact?: boolean;
}

export default function LoginButton({
  className = "",
  fullWidth = false,
  compact = false,
}: LoginButtonProps) {
  const { ready, authenticated, login, user } = usePrivy();

  // Show loading state while Privy initializes
  if (!ready) {
    return (
      <button
        disabled
        className={`${fullWidth ? "w-full" : ""} ${
          compact ? "p-2" : "px-6 py-2.5"
        } bg-[#120557]/50 rounded-xl font-medium cursor-not-allowed flex items-center justify-center gap-2 opacity-60 ${className}`}
      >
        <Loader2
          className={`${compact ? "w-5 h-5" : "w-4 h-4"} animate-spin`}
        />
        {!compact && "Loading..."}
      </button>
    );
  }

  // User is authenticated - show WalletProfile
  if (authenticated && user) {
    return (
      <WalletProfile
        className={className}
        fullWidth={fullWidth}
        compact={compact}
      />
    );
  }

  // User is not authenticated - show login button
  return (
    <button
      onClick={login}
      className={`${fullWidth ? "w-full" : ""} ${
        compact ? "p-2" : "px-6 py-2.5"
      } bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] hover:from-[#9FF24A] hover:to-[#6FEC06] rounded-xl font-medium text-black transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#6FEC06]/25 hover:shadow-[#6FEC06]/40 ${className}`}
    >
      <LogIn className={`${compact ? "w-5 h-5" : "w-4 h-4"}`} />
      {!compact && "Login"}
    </button>
  );
}
