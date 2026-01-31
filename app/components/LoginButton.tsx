"use client";

import { usePrivy } from "@privy-io/react-auth";
import { LogIn, Loader2 } from "lucide-react";
import WalletProfile from "./WalletProfile";

interface LoginButtonProps {
  className?: string;
  fullWidth?: boolean;
}

export default function LoginButton({
  className = "",
  fullWidth = false,
}: LoginButtonProps) {
  const { ready, authenticated, login, user } = usePrivy();

  // Show loading state while Privy initializes
  if (!ready) {
    return (
      <button
        disabled
        className={`${
          fullWidth ? "w-full" : ""
        } px-6 py-2.5 bg-[#120557]/50 rounded-xl font-medium cursor-not-allowed flex items-center justify-center gap-2 opacity-60 ${className}`}
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading...
      </button>
    );
  }

  // User is authenticated - show WalletProfile
  if (authenticated && user) {
    return <WalletProfile className={className} fullWidth={fullWidth} />;
  }

  // User is not authenticated - show login button
  return (
    <button
      onClick={login}
      className={`${
        fullWidth ? "w-full" : ""
      } px-6 py-2.5 bg-gradient-to-r from-[#f48f8e] to-[#120557] hover:from-[#f7a8a7] hover:to-[#2a1a8f] rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#f48f8e]/25 hover:shadow-[#f48f8e]/40 ${className}`}
    >
      <LogIn className="w-4 h-4" />
      Login
    </button>
  );
}
