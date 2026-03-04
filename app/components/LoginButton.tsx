"use client";

import { usePrivy } from "@privy-io/react-auth";
import { LogIn, Loader2, Sparkles, Zap } from "lucide-react";
import WalletProfile from "./WalletProfile";

interface LoginButtonProps {
  className?: string;
  fullWidth?: boolean;
  compact?: boolean;
  variant?: "default" | "promo";
}

export default function LoginButton({
  className = "",
  fullWidth = false,
  compact = false,
  variant = "default",
}: LoginButtonProps) {
  const { ready, authenticated, login, user } = usePrivy();

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

  if (authenticated && user) {
    return (
      <WalletProfile
        className={className}
        fullWidth={fullWidth}
        compact={compact}
      />
    );
  }

  if (variant === "promo" && !compact) {
    return (
      <button
        onClick={login}
        className={`${fullWidth ? "w-full" : ""} group relative overflow-hidden rounded-xl border border-[#6FEC06]/20 bg-gradient-to-br from-[#6FEC06]/10 via-[#120557]/20 to-[#6FEC06]/5 p-3 transition-all duration-300 hover:border-[#6FEC06]/40 hover:shadow-lg hover:shadow-[#6FEC06]/10 ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#6FEC06]/0 via-[#6FEC06]/5 to-[#6FEC06]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6FEC06]/30 to-[#120557]/30 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-[#6FEC06]" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="text-sm font-semibold text-white flex items-center gap-1.5">
              Login
              <Sparkles className="w-3 h-3 text-[#6FEC06]" />
            </div>
            <div className="text-[11px] text-white/50 leading-tight">
              Mint, chat &amp; earn
            </div>
          </div>
          <LogIn className="w-4 h-4 text-[#6FEC06]/60 group-hover:text-[#6FEC06] transition-colors flex-shrink-0" />
        </div>
      </button>
    );
  }

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
