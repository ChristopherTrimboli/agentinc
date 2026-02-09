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
  MessagesSquare,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { usePrivy } from "@privy-io/react-auth";
import { getBagsFmUrl } from "@/lib/constants/urls";

// ── Types ─────────────────────────────────────────────────────────────

interface ChatMessage {
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

type ChatTab = "general" | "vip";

interface AgentChatProps {
  agentId: string;
  tokenMint: string;
  tokenSymbol: string;
}

// ── Utilities ─────────────────────────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────

export default function AgentChat({
  agentId,
  tokenMint,
  tokenSymbol,
}: AgentChatProps) {
  const { authFetch } = useAuth();
  const { authenticated, login } = usePrivy();

  const [activeTab, setActiveTab] = useState<ChatTab>("general");

  // General chat state
  const [generalMessages, setGeneralMessages] = useState<ChatMessage[]>([]);
  const [generalLoading, setGeneralLoading] = useState(true);

  // VIP chat state
  const [vipMessages, setVipMessages] = useState<ChatMessage[]>([]);
  const [vipAccess, setVipAccess] = useState<VipAccessInfo | null>(null);
  const [thresholdPercent, setThresholdPercent] = useState(0.1);
  const [vipLoading, setVipLoading] = useState(true);

  // Shared state
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const generalPollRef = useRef<NodeJS.Timeout | null>(null);
  const vipPollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch general messages ────────────────────────────────────────

  const fetchGeneralMessages = useCallback(async () => {
    try {
      const res = await authFetch(`/api/agents/${agentId}/general-chat`);
      if (!res.ok) return;
      const data = await res.json();
      setGeneralMessages(data.messages ?? []);
    } catch {
      // Silent fail on poll
    } finally {
      setGeneralLoading(false);
    }
  }, [agentId, authFetch]);

  // ── Fetch VIP messages ────────────────────────────────────────────

  const fetchVipMessages = useCallback(async () => {
    try {
      const res = await authFetch(`/api/agents/${agentId}/vip-chat`);
      if (!res.ok) return;
      const data = await res.json();
      setVipMessages(data.messages ?? []);
      setVipAccess(data.vipAccess);
      setThresholdPercent(data.thresholdPercent ?? 0.1);
    } catch {
      // Silent fail on poll
    } finally {
      setVipLoading(false);
    }
  }, [agentId, authFetch]);

  // Initial load for both
  useEffect(() => {
    fetchGeneralMessages();
    fetchVipMessages();
  }, [fetchGeneralMessages, fetchVipMessages]);

  // Poll general chat
  useEffect(() => {
    generalPollRef.current = setInterval(fetchGeneralMessages, 5000);
    return () => {
      if (generalPollRef.current) clearInterval(generalPollRef.current);
    };
  }, [fetchGeneralMessages]);

  // Poll VIP chat only when user has access
  useEffect(() => {
    if (!vipAccess?.hasAccess) return;
    vipPollRef.current = setInterval(fetchVipMessages, 5000);
    return () => {
      if (vipPollRef.current) clearInterval(vipPollRef.current);
    };
  }, [vipAccess?.hasAccess, fetchVipMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [generalMessages, vipMessages, activeTab]);

  // ── Send message ──────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!input.trim() || isSending) return;

    setIsSending(true);
    setError("");

    const endpoint =
      activeTab === "general"
        ? `/api/agents/${agentId}/general-chat`
        : `/api/agents/${agentId}/vip-chat`;

    try {
      const res = await authFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ content: input.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to send message");
        return;
      }

      setInput("");
      if (activeTab === "general") {
        await fetchGeneralMessages();
      } else {
        await fetchVipMessages();
      }
    } catch {
      setError("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Derived state ─────────────────────────────────────────────────

  const hasVipAccess = vipAccess?.hasAccess ?? false;
  const isVipTab = activeTab === "vip";
  const currentMessages = isVipTab ? vipMessages : generalMessages;
  const isCurrentLoading = isVipTab ? vipLoading : generalLoading;
  const uniqueWallets = new Set(currentMessages.map((m) => m.walletAddress))
    .size;

  // Can the user send in the current tab?
  const canSend = isVipTab ? hasVipAccess : authenticated;

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0a0520] transition-all duration-300 h-full flex flex-col">
      {/* Tab header */}
      <div className="flex items-stretch border-b border-white/5 flex-shrink-0">
        {/* General tab */}
        <button
          onClick={() => setActiveTab("general")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all relative ${
            activeTab === "general"
              ? "text-white"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          <MessagesSquare className="w-4 h-4" />
          <span>General</span>
          {generalMessages.length > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "general"
                  ? "bg-white/10 text-white/70"
                  : "bg-white/5 text-white/30"
              }`}
            >
              {generalMessages.length}
            </span>
          )}
          {activeTab === "general" && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-[#6FEC06] rounded-full" />
          )}
        </button>

        {/* VIP tab */}
        <button
          onClick={() => setActiveTab("vip")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-all relative ${
            activeTab === "vip"
              ? "text-amber-300"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          <Crown
            className={`w-4 h-4 ${activeTab === "vip" ? "text-amber-400" : ""}`}
          />
          <span>VIP</span>
          {hasVipAccess && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
              Access
            </span>
          )}
          {!hasVipAccess && authenticated && (
            <Lock className="w-3 h-3 text-white/30" />
          )}
          {activeTab === "vip" && (
            <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-amber-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Content area */}
      <div className="border-t border-white/5 flex-1 flex flex-col min-h-0">
        {isCurrentLoading ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <Loader2
              className={`w-5 h-5 animate-spin ${
                isVipTab ? "text-amber-400/60" : "text-white/40"
              }`}
            />
          </div>
        ) : isVipTab && !authenticated ? (
          /* VIP tab: Not logged in */
          <div className="p-6 text-center flex-1 flex flex-col justify-center">
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
        ) : isVipTab && !hasVipAccess ? (
          /* VIP tab: Authenticated but not enough tokens */
          <div className="p-6 text-center flex-1 flex flex-col justify-center">
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
        ) : !isVipTab && !authenticated ? (
          /* General tab: Not logged in */
          <div className="p-6 text-center flex-1 flex flex-col justify-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
              <MessagesSquare className="w-7 h-7 text-white/30" />
            </div>
            <h4 className="text-white/80 font-semibold mb-2">
              Sign in to Chat
            </h4>
            <p className="text-white/40 text-sm mb-4 max-w-xs mx-auto">
              Connect your wallet to join the community chat for this agent.
            </p>
            <button
              onClick={login}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-xl text-black text-sm font-bold hover:opacity-90 transition-all"
            >
              <Wallet className="w-4 h-4" />
              Sign In
            </button>
          </div>
        ) : (
          /* Chat is accessible - show messages */
          <div className="flex flex-col flex-1 min-h-0">
            {/* Online indicator bar */}
            <div
              className={`px-4 py-2 flex items-center gap-2 border-b border-white/5 ${
                isVipTab ? "bg-amber-500/[0.03]" : "bg-white/[0.02]"
              }`}
            >
              <Users
                className={`w-3.5 h-3.5 ${
                  isVipTab ? "text-amber-400/60" : "text-white/30"
                }`}
              />
              <span className="text-xs text-white/40">
                {uniqueWallets} wallet{uniqueWallets !== 1 ? "s" : ""} in chat
              </span>
              {currentMessages.length > 0 && (
                <span className="flex items-center gap-1 ml-1 text-white/30">
                  <MessageCircle className="w-3 h-3" />
                  <span className="text-[10px]">{currentMessages.length}</span>
                </span>
              )}
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
              {currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  {isVipTab ? (
                    <Crown className="w-8 h-8 text-amber-400/20 mb-3" />
                  ) : (
                    <MessagesSquare className="w-8 h-8 text-white/15 mb-3" />
                  )}
                  <p className="text-white/30 text-sm">
                    {isVipTab
                      ? "No messages yet. Be the first VIP to say something!"
                      : "No messages yet. Start the conversation!"}
                  </p>
                </div>
              ) : (
                currentMessages.map((msg) => {
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
              {canSend ? (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        isVipTab
                          ? "Message the VIP lounge..."
                          : "Type a message..."
                      }
                      maxLength={500}
                      disabled={isSending}
                      className={`flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition-all disabled:opacity-50 ${
                        isVipTab
                          ? "focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20"
                          : "focus:border-[#6FEC06]/40 focus:ring-1 focus:ring-[#6FEC06]/20"
                      }`}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || isSending}
                      className={`p-2.5 rounded-xl text-black disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all ${
                        isVipTab
                          ? "bg-gradient-to-r from-amber-500 to-yellow-600"
                          : "bg-gradient-to-r from-[#6FEC06] to-[#4a9f10]"
                      }`}
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
                </>
              ) : (
                <button
                  onClick={login}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/50 text-sm hover:bg-white/10 transition-all"
                >
                  <Wallet className="w-4 h-4" />
                  Sign in to chat
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
