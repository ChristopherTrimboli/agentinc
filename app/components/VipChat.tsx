"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Crown,
  Send,
  Lock,
  Loader2,
  ShieldCheck,
  Wallet,
  ExternalLink,
  MessageCircle,
  Zap,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { usePrivy } from "@privy-io/react-auth";
import { getBagsFmUrl } from "@/lib/constants/urls";

interface VipMessage {
  id: string;
  content: string;
  walletAddress: string;
  createdAt: string;
}

interface VipAccessInfo {
  hasAccess: boolean;
  balance: number;
  totalSupply: number;
  threshold: number;
}

interface VipChatProps {
  agentId: string;
  tokenMint: string;
  tokenSymbol: string;
}

/** Truncate a wallet address for display: "7xKX...9f4Q" */
function truncateWallet(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/** Generate a consistent color from a wallet address */
function walletColor(address: string): string {
  const colors = [
    "#6FEC06", // green
    "#A855F7", // purple
    "#3B82F6", // blue
    "#F59E0B", // amber
    "#EF4444", // red
    "#EC4899", // pink
    "#06B6D4", // cyan
    "#F97316", // orange
    "#8B5CF6", // violet
    "#10B981", // emerald
  ];
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/** Format timestamp relative to now */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function VipChat({
  agentId,
  tokenMint,
  tokenSymbol,
}: VipChatProps) {
  const { authFetch } = useAuth();
  const { authenticated, login } = usePrivy();

  const [messages, setMessages] = useState<VipMessage[]>([]);
  const [vipAccess, setVipAccess] = useState<VipAccessInfo | null>(null);
  const [thresholdPercent, setThresholdPercent] = useState(0.1);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ── Fetch messages ──────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    let isCancelled = false;

    try {
      const res = await authFetch(`/api/agents/${agentId}/vip-chat`);
      if (isCancelled || !res.ok) return;

      const data = await res.json();
      if (!isCancelled) {
        setMessages(data.messages ?? []);
        setVipAccess(data.vipAccess);
        setThresholdPercent(data.thresholdPercent ?? 0.1);
      }
    } catch {
      // Silent fail on poll
    } finally {
      if (!isCancelled) {
        setIsLoading(false);
      }
    }

    return () => {
      isCancelled = true;
    };
  }, [agentId, authFetch]);

  // Initial load
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Only poll when user has VIP access (avoid wasting requests)
  useEffect(() => {
    if (!vipAccess?.hasAccess) return;

    const intervalId = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [vipAccess?.hasAccess, fetchMessages]);

  // Auto-scroll to bottom on new messages (within chat container only)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // ── Send message ────────────────────────────────────────────────

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isSending) return;

    setIsSending(true);
    setError("");

    try {
      const res = await authFetch(`/api/agents/${agentId}/vip-chat`, {
        method: "POST",
        body: JSON.stringify({ content: input.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send message");
        return;
      }

      setInput("");
      // Fetch fresh messages after sending
      await fetchMessages();
    } catch {
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, agentId, authFetch, fetchMessages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  // ── Render states ───────────────────────────────────────────────

  const hasAccess = vipAccess?.hasAccess ?? false;
  const messageCount = messages.length;
  const uniqueWallets = new Set(messages.map((m) => m.walletAddress)).size;

  return (
    <div
      className={`rounded-2xl overflow-hidden border transition-all duration-300 ${
        hasAccess
          ? "border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-[#0a0520]"
          : "border-white/10 bg-[#0a0520]"
      }`}
    >
      {/* Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-xl ${
              hasAccess
                ? "bg-gradient-to-br from-amber-500/20 to-yellow-600/20 border border-amber-500/30"
                : "bg-white/5 border border-white/10"
            }`}
          >
            <Crown
              className={`w-5 h-5 ${
                hasAccess ? "text-amber-400" : "text-white/40"
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3
                className={`font-bold font-display text-sm sm:text-base ${
                  hasAccess ? "text-amber-300" : "text-white/70"
                }`}
              >
                VIP Chat
              </h3>
              {hasAccess && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                  Access Granted
                </span>
              )}
            </div>
            <p className="text-xs text-white/40 mt-0.5">
              {hasAccess
                ? `${messageCount} messages from ${uniqueWallets} holders`
                : `Hold ${thresholdPercent}% of ${tokenSymbol} to unlock`}
            </p>
          </div>
        </div>

        {messageCount > 0 && (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 text-white/40 text-xs">
            <MessageCircle className="w-3 h-3" />
            {messageCount}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="border-t border-white/5">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-amber-400/60 animate-spin" />
          </div>
        ) : !authenticated ? (
          /* Not logged in */
          <div className="p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-[#120557]/30 flex items-center justify-center border border-amber-500/20">
              <Lock className="w-7 h-7 text-amber-400/50" />
            </div>
            <h4 className="text-white/80 font-semibold mb-2">
              Sign in to Access VIP Chat
            </h4>
            <p className="text-white/40 text-sm mb-4 max-w-xs mx-auto">
              Connect your wallet and hold {thresholdPercent}% of {tokenSymbol}{" "}
              to join the exclusive token-holder chat.
            </p>
            <button
              onClick={login}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl text-black text-sm font-bold hover:opacity-90 transition-all"
            >
              <Wallet className="w-4 h-4" />
              Sign In
            </button>
          </div>
        ) : !hasAccess ? (
          /* Authenticated but not enough tokens */
          <div className="p-6 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-[#120557]/30 flex items-center justify-center border border-amber-500/20">
              <ShieldCheck className="w-7 h-7 text-amber-400/50" />
            </div>
            <h4 className="text-white/80 font-semibold mb-2">
              Token Gate: {thresholdPercent}% Required
            </h4>
            <p className="text-white/40 text-sm mb-2 max-w-sm mx-auto">
              Hold at least {thresholdPercent}% of the {tokenSymbol} token
              supply to access this exclusive VIP chat room.
            </p>
            {vipAccess && (
              <div className="mt-3 mb-4 p-3 rounded-xl bg-[#120557]/30 border border-white/10 inline-block">
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <div className="text-white/40 text-right">Your balance:</div>
                  <div className="text-white/70 text-left font-mono">
                    {vipAccess.balance.toLocaleString()} {tokenSymbol}
                  </div>
                  <div className="text-white/40 text-right">Required:</div>
                  <div className="text-amber-400 text-left font-mono">
                    {vipAccess.threshold.toLocaleString()} {tokenSymbol}
                  </div>
                </div>
              </div>
            )}
            <div>
              <a
                href={getBagsFmUrl(tokenMint)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl text-black text-sm font-bold hover:opacity-90 transition-all"
              >
                <Zap className="w-4 h-4" />
                Buy {tokenSymbol}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          /* Has VIP access - show chat */
          <div className="flex flex-col" style={{ height: "400px" }}>
            {/* Online indicator bar */}
            <div className="px-4 py-2 flex items-center gap-2 border-b border-white/5 bg-amber-500/[0.03]">
              <Users className="w-3.5 h-3.5 text-amber-400/60" />
              <span className="text-xs text-white/40">
                {uniqueWallets} wallet{uniqueWallets !== 1 ? "s" : ""} in chat
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] text-green-400/70">Live</span>
              </div>
            </div>

            {/* Messages area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Crown className="w-8 h-8 text-amber-400/20 mb-3" />
                  <p className="text-white/30 text-sm">
                    No messages yet. Be the first VIP to say something!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const color = walletColor(msg.walletAddress);
                  return (
                    <div key={msg.id} className="group flex gap-2.5">
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-[10px] font-bold font-mono"
                        style={{
                          backgroundColor: `${color}15`,
                          border: `1px solid ${color}30`,
                          color: color,
                        }}
                      >
                        {msg.walletAddress.slice(0, 2)}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="text-xs font-semibold font-mono"
                            style={{ color }}
                          >
                            {truncateWallet(msg.walletAddress)}
                          </span>
                          <span className="text-[10px] text-white/20">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-white/80 leading-relaxed break-words">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input area */}
            <div className="p-3 border-t border-white/5 bg-[#0a0520]/80">
              {error && (
                <div className="mb-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {error}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  maxLength={500}
                  disabled={isSending}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isSending}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-between px-1">
                <span className="text-[10px] text-white/20">
                  {input.length}/500
                </span>
                <span className="text-[10px] text-white/20">
                  Wallet ID visible to others
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
