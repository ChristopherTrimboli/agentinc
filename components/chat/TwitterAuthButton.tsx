"use client";

import React, { useState, useEffect } from "react";
import { ExternalLink, Loader2, LogOut, AlertCircle } from "lucide-react";
import { usePrivy, useIdentityToken } from "@privy-io/react-auth";

interface TwitterAuthButtonProps {
  className?: string;
  agentId?: string;
  chatId?: string;
}

export function TwitterAuthButton({
  className = "",
  agentId,
  chatId,
}: TwitterAuthButtonProps) {
  const { user, authenticated } = usePrivy();
  const { identityToken } = useIdentityToken();
  const [status, setStatus] = useState<{
    connected: boolean;
    username?: string;
    loading: boolean;
    error?: string;
  }>({
    connected: false,
    loading: true,
  });

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, identityToken]);

  const checkStatus = async () => {
    try {
      if (!authenticated || !identityToken) {
        setStatus({ connected: false, loading: false });
        return;
      }

      const response = await fetch("/api/twitter/oauth/status", {
        headers: {
          "privy-id-token": identityToken,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus({
          connected: data.connected,
          username: data.username,
          loading: false,
        });
      } else {
        setStatus({ connected: false, loading: false });
      }
    } catch (error) {
      console.error("Failed to check Twitter status:", error);
      setStatus({ connected: false, loading: false });
    }
  };

  const handleConnect = async () => {
    try {
      if (!authenticated || !user?.id) {
        setStatus((prev) => ({
          ...prev,
          error: "Please log in first",
        }));
        return;
      }

      // Build OAuth URL with context preservation
      const params = new URLSearchParams({ userId: user.id });
      if (agentId) params.set("agentId", agentId);
      if (chatId) params.set("chatId", chatId);

      // Redirect to OAuth authorization
      window.location.href = `/api/twitter/oauth/authorize?${params.toString()}`;
    } catch (error) {
      console.error("Failed to initiate Twitter OAuth:", error);
      setStatus((prev) => ({
        ...prev,
        error: "Failed to connect. Please try again.",
      }));
    }
  };

  const handleDisconnect = async () => {
    try {
      if (!identityToken) return;

      setStatus((prev) => ({ ...prev, loading: true }));

      const response = await fetch("/api/twitter/oauth/disconnect", {
        method: "POST",
        headers: {
          "privy-id-token": identityToken,
        },
      });

      if (response.ok) {
        setStatus({ connected: false, loading: false });
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      console.error("Failed to disconnect Twitter:", error);
      setStatus((prev) => ({
        ...prev,
        error: "Failed to disconnect. Please try again.",
        loading: false,
      }));
    }
  };

  if (status.loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="w-3 h-3 animate-spin text-white/30" />
        <span className="text-[10px] text-white/40">Checking...</span>
      </div>
    );
  }

  if (status.connected && status.username) {
    return (
      <div className={`flex items-center justify-between gap-2 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#6FEC06] animate-pulse shadow-[0_0_6px_rgba(111,236,6,0.5)]" />
          <span className="text-[11px] font-medium text-white/80">
            @{status.username}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] text-white/50 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          title="Disconnect Twitter"
        >
          <LogOut className="w-3 h-3" />
          <span>Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {status.error && (
        <div className="flex items-center gap-1.5 text-[10px] text-red-400/80">
          <AlertCircle className="w-3 h-3" />
          <span>{status.error}</span>
        </div>
      )}
      <button
        onClick={handleConnect}
        className="flex items-center gap-2 text-[11px] text-white/60 hover:text-[#6FEC06] transition-colors group"
      >
        <ExternalLink className="w-3 h-3 group-hover:text-[#6FEC06]" />
        <span>Connect account</span>
      </button>
    </div>
  );
}
