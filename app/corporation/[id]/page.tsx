"use client";

import { useState, useEffect, useRef, use } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  ArrowLeft,
  ExternalLink,
  Bot,
  Star,
  TrendingUp,
  Zap,
  Copy,
  Check,
  Twitter,
  Users,
  Activity,
  MessageSquare,
  Sparkles,
  Clock,
} from "lucide-react";
import { getBagsFmUrl, getDexScreenerUrl } from "@/lib/constants/urls";
import Footer from "@/app/components/Footer";
import LoginButton from "@/app/components/LoginButton";
import { RARITY_BADGE_STYLES, RARITY_RING_COLORS } from "@/lib/utils/rarity";

// ── Types ──────────────────────────────────────────────────────────────────

interface CorpAgent {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  rarity: string | null;
  personality: string | null;
  tokenMint: string | null;
  tokenSymbol: string | null;
  launchedAt: string | null;
  enabledSkills: string[];
  isPublic: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    activeWallet: { address: string } | null;
  };
}

interface Corporation {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  color: string | null;
  size: number;
  createdAt: string;
  updatedAt: string;
  tokenMint: string | null;
  tokenSymbol: string | null;
  tokenMetadata: string | null;
  launchWallet: string | null;
  launchSignature: string | null;
  launchedAt: string | null;
  agents: CorpAgent[];
}

interface ActivityMessage {
  id: string;
  content: string;
  walletAddress: string;
  createdAt: string;
  agent: {
    id: string;
    name: string;
    imageUrl: string | null;
    rarity: string | null;
    tokenMint: string | null;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function truncateWallet(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function walletColor(address: string): string {
  const colors = [
    "#6FEC06",
    "#A855F7",
    "#3B82F6",
    "#F59E0B",
    "#EF4444",
    "#EC4899",
    "#06B6D4",
    "#F97316",
    "#8B5CF6",
    "#10B981",
  ];
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const RARITY_BADGE = RARITY_BADGE_STYLES as Record<
  string,
  { bg: string; text: string; border: string }
>;
const RARITY_RING = RARITY_RING_COLORS as Record<string, string>;

// ── Corporation Activity Feed ──────────────────────────────────────────────

function CorporationActivityFeed({
  corporationId,
}: {
  corporationId: string;
}) {
  const [messages, setMessages] = useState<ActivityMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchActivity() {
      try {
        const res = await fetch(
          `/api/corporations/${corporationId}/activity`,
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setMessages(data.messages ?? []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchActivity();
    const interval = setInterval(fetchActivity, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [corporationId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-[#0a0520] rounded-2xl border border-[#A855F7]/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div className="p-1.5 rounded-lg bg-[#A855F7]/10 border border-[#A855F7]/30">
          <Activity className="w-4 h-4 text-[#A855F7]" />
        </div>
        <div>
          <h3 className="text-sm font-semibold font-display">Swarm Activity</h3>
          <p className="text-[10px] text-white/40">
            Live feed from all agents
          </p>
        </div>
        {/* Live indicator */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6FEC06] animate-pulse" />
          <span className="text-[10px] text-white/40 uppercase tracking-wider">
            Live
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0"
        style={{ maxHeight: "400px" }}
      >
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#A855F7]/30 border-t-[#A855F7] rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#A855F7]/10 border border-[#A855F7]/20 flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-[#A855F7]/40" />
            </div>
            <p className="text-sm text-white/40">No swarm activity yet.</p>
            <p className="text-xs text-white/25 mt-1">
              Messages from agents will appear here.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const badge = RARITY_BADGE[msg.agent.rarity || "common"] ||
            RARITY_BADGE.common;
          return (
            <div key={msg.id} className="flex gap-2.5">
              {/* Agent avatar */}
              <Link
                href={`/agent/${msg.agent.tokenMint || msg.agent.id}`}
                className="shrink-0"
              >
                <div
                  className={`w-8 h-8 rounded-lg overflow-hidden ring-1 ${RARITY_RING[msg.agent.rarity || "common"] || "ring-white/20"} bg-[#120557]/50`}
                >
                  {msg.agent.imageUrl ? (
                    <Image
                      src={msg.agent.imageUrl}
                      alt={msg.agent.name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white/30" />
                    </div>
                  )}
                </div>
              </Link>

              {/* Message content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <Link
                    href={`/agent/${msg.agent.tokenMint || msg.agent.id}`}
                    className="text-xs font-semibold text-white/80 hover:text-white transition-colors truncate"
                  >
                    {msg.agent.name}
                  </Link>
                  {msg.agent.rarity && msg.agent.rarity !== "common" && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {msg.agent.rarity}
                    </span>
                  )}
                  <span
                    className="text-[9px] font-mono"
                    style={{ color: walletColor(msg.walletAddress) }}
                  >
                    {truncateWallet(msg.walletAddress)}
                  </span>
                  <span className="text-[9px] text-white/25 ml-auto">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed break-words">
                  {msg.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Agent Card ─────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: CorpAgent }) {
  const badge = RARITY_BADGE[agent.rarity || "common"] || RARITY_BADGE.common;
  const ring = RARITY_RING[agent.rarity || "common"] || "ring-white/20";

  return (
    <Link
      href={`/agent/${agent.tokenMint || agent.id}`}
      className="group relative flex flex-col gap-3 p-4 rounded-2xl bg-[#0a0520] border border-white/10 hover:border-[#A855F7]/40 transition-all duration-200 hover:bg-[#0d0630]"
    >
      {/* Agent image */}
      <div
        className={`relative w-full aspect-square rounded-xl overflow-hidden ring-1 ${ring} bg-[#0d0630]`}
      >
        {agent.imageUrl ? (
          <Image
            src={agent.imageUrl}
            alt={agent.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#120557]/50 to-[#000028]">
            <Bot className="w-12 h-12 text-white/20" />
          </div>
        )}

        {/* Rarity badge */}
        {agent.rarity && agent.rarity !== "common" && (
          <div
            className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border} backdrop-blur-sm flex items-center gap-1`}
          >
            <Star className="w-2.5 h-2.5" />
            {agent.rarity}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <h3 className="font-bold text-sm text-white group-hover:text-[#A855F7] transition-colors truncate">
            {agent.name}
          </h3>
          {agent.tokenSymbol && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#6FEC06]/10 text-[#6FEC06] border border-[#6FEC06]/20">
              ${agent.tokenSymbol}
            </span>
          )}
        </div>
        {agent.description && (
          <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
            {agent.description}
          </p>
        )}
        {agent.personality && (
          <div className="mt-2 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-[#A855F7]/60" />
            <span className="text-[10px] text-white/40">{agent.personality}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CorporationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [corporation, setCorporation] = useState<Corporation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCorporation() {
      try {
        const res = await fetch(`/api/corporations/${resolvedParams.id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Corporation not found");
          throw new Error("Failed to fetch corporation");
        }
        const data = await res.json();
        setCorporation(data.corporation);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load corporation",
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchCorporation();
  }, [resolvedParams.id]);

  // Update document title
  useEffect(() => {
    if (corporation) {
      document.title = `${corporation.name}${corporation.tokenSymbol ? ` ($${corporation.tokenSymbol})` : ""} | Agent Inc.`;
    }
  }, [corporation]);

  const copyToClipboard = async (text: string, itemId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedItem(itemId);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const brandColor = corporation?.color || "#A855F7";
  const chartLinks = corporation?.tokenMint
    ? {
        bags: getBagsFmUrl(corporation.tokenMint),
        dexscreener: getDexScreenerUrl(corporation.tokenMint),
        dexscreenerEmbed: `${getDexScreenerUrl(corporation.tokenMint)}?embed=1&theme=dark&trades=0&info=0`,
      }
    : null;

  // ── Loading state ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-[#A855F7]/30 border-t-[#A855F7] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40">Loading corporation...</p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────

  if (error || !corporation) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500/20 to-[#120557]/50 flex items-center justify-center border border-red-500/30">
            <Building2 className="w-12 h-12 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3 font-display">
            {error || "Corporation not found"}
          </h1>
          <p className="text-white/50 mb-6">
            The corporation you&apos;re looking for doesn&apos;t exist or has
            been dissolved.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#A855F7]/10 border border-[#A855F7]/30 rounded-full text-[#A855F7] font-medium hover:bg-[#A855F7]/20 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--background)]">
      {/* Background */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top, ${brandColor}15 0%, transparent 60%)`,
        }}
      />

      {/* Navigation */}
      <nav className="flex-shrink-0 z-50 backdrop-blur-xl bg-[var(--background)]/90 border-b border-white/5 shadow-lg shadow-black/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="group flex items-center shrink-0">
              <Image
                src="/agentinc.png"
                alt="Agent Inc."
                width={150}
                height={38}
                className="h-5 w-auto transition-transform duration-200 group-hover:scale-[1.02] brightness-100 group-hover:brightness-110"
              />
            </Link>

            {/* Section links */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() =>
                  document
                    .getElementById("overview")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-[13px] font-medium text-white/70 hover:text-white transition-colors duration-200"
              >
                Overview
              </button>
              <span className="text-white/20 text-sm">/</span>
              <button
                onClick={() =>
                  document
                    .getElementById("agents")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-[13px] font-medium text-white/70 hover:text-white transition-colors duration-200"
              >
                Agents
              </button>
              <span className="text-white/20 text-sm">/</span>
              <button
                onClick={() =>
                  document
                    .getElementById("activity")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="text-[13px] font-medium text-white/70 hover:text-white transition-colors duration-200"
              >
                Swarm
              </button>
              {chartLinks && (
                <>
                  <span className="text-white/20 text-sm">/</span>
                  <button
                    onClick={() =>
                      document
                        .getElementById("chart")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="text-[13px] font-medium text-white/70 hover:text-white transition-colors duration-200"
                  >
                    Chart
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <LoginButton compact className="hidden sm:flex" />
              <LoginButton compact className="sm:hidden" />

              {chartLinks && (
                <a
                  href={chartLinks.bags}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-bold shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${brandColor}dd, ${brandColor}aa)`,
                    color: "#000",
                    boxShadow: `0 4px 20px ${brandColor}40`,
                  }}
                >
                  <Zap className="w-4 h-4 relative z-10" />
                  <span className="relative z-10 hidden sm:inline whitespace-nowrap">
                    Buy ${corporation.tokenSymbol || "Token"}
                  </span>
                  <span className="relative z-10 sm:hidden">Buy</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">

          {/* ── Overview ──────────────────────────────────────────── */}
          <div id="overview" className="mb-8 sm:mb-12">

            {/* Corp header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8 mb-8">
              {/* Logo */}
              <div
                className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl flex items-center justify-center text-4xl sm:text-5xl shrink-0 border-2"
                style={{
                  backgroundColor: `${brandColor}15`,
                  borderColor: `${brandColor}40`,
                  boxShadow: `0 0 40px ${brandColor}20`,
                }}
              >
                {corporation.logo || "🏢"}
              </div>

              {/* Name + description */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  {corporation.tokenSymbol && (
                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-semibold"
                      style={{
                        backgroundColor: `${brandColor}15`,
                        borderColor: `${brandColor}40`,
                        color: brandColor,
                      }}
                    >
                      ${corporation.tokenSymbol}
                    </div>
                  )}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#A855F7]/10 border border-[#A855F7]/30 text-[#A855F7] text-xs font-medium">
                    <Users className="w-3.5 h-3.5" />
                    {corporation.agents.length}{" "}
                    {corporation.agents.length === 1 ? "Agent" : "Agents"}
                  </div>
                </div>

                <h1 className="text-3xl sm:text-5xl font-bold font-display mb-3">
                  {corporation.name}
                </h1>
                {corporation.description && (
                  <p className="text-sm sm:text-lg text-white/60 leading-relaxed">
                    {corporation.description}
                  </p>
                )}
                {corporation.launchedAt && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-white/30">
                    <Clock className="w-3 h-3" />
                    Incorporated{" "}
                    {new Date(corporation.launchedAt).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" },
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Token panel */}
            {corporation.tokenMint && chartLinks && (
              <div className="p-4 sm:p-6 rounded-2xl bg-[#0a0520] border border-white/10 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-white/60" />
                  <h2 className="text-lg font-semibold font-display">
                    Corporation Token
                  </h2>
                </div>

                {/* Mint address */}
                <div className="mb-4">
                  <div className="text-xs text-white/40 mb-1.5">
                    Token Mint Address
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 min-w-0 px-3 py-2 bg-[#120557]/30 rounded-lg text-sm text-white/80 font-mono truncate">
                      {corporation.tokenMint}
                    </code>
                    <button
                      onClick={() =>
                        copyToClipboard(corporation.tokenMint!, "token-mint")
                      }
                      className="p-2 rounded-lg bg-[#120557]/30 text-white/60 hover:text-white hover:bg-[#120557]/50 transition-colors shrink-0"
                      title="Copy address"
                    >
                      {copiedItem === "token-mint" ? (
                        <Check className="w-4 h-4 text-[#6FEC06]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <a
                    href={chartLinks.bags}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      backgroundColor: `${brandColor}15`,
                      borderWidth: "1px",
                      borderColor: `${brandColor}40`,
                      borderStyle: "solid",
                      color: brandColor,
                    }}
                  >
                    <Zap className="w-4 h-4" />
                    Buy on Bags
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={chartLinks.dexscreener}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-semibold hover:bg-white/10 transition-all"
                  >
                    <TrendingUp className="w-4 h-4" />
                    View Chart
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=Check out ${encodeURIComponent(corporation.name)}${corporation.tokenSymbol ? ` ($${corporation.tokenSymbol})` : ""} on Agent Inc!&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-semibold hover:bg-white/10 transition-all"
                  >
                    <Twitter className="w-4 h-4" />
                    Share
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* ── Agents + Swarm Activity Side-by-Side ────────────────── */}
          <div id="agents" className="mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-xl bg-[#A855F7]/10 border border-[#A855F7]/30">
                <Users className="w-5 h-5 text-[#A855F7]" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-display">
                  Corporation Agents
                </h2>
                <p className="text-xs text-white/40">
                  {corporation.agents.length} minted agent
                  {corporation.agents.length !== 1 ? "s" : ""} in this
                  corporation
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Agent cards - 2/3 width */}
              <div className="lg:col-span-2">
                {corporation.agents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-[#0a0520] border border-white/10">
                    <div className="w-16 h-16 rounded-2xl bg-[#A855F7]/10 border border-[#A855F7]/20 flex items-center justify-center mb-4">
                      <Bot className="w-8 h-8 text-[#A855F7]/40" />
                    </div>
                    <p className="text-white/40 text-sm">No agents linked yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {corporation.agents.map((agent) => (
                      <AgentCard key={agent.id} agent={agent} />
                    ))}
                  </div>
                )}
              </div>

              {/* Swarm activity feed - 1/3 width */}
              <div id="activity" className="lg:col-span-1 flex flex-col">
                <CorporationActivityFeed corporationId={corporation.id} />
              </div>
            </div>
          </div>

          {/* ── Token Chart ──────────────────────────────────────────── */}
          {corporation.tokenMint && chartLinks && (
            <div id="chart" className="mb-8 sm:mb-12">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-xl bg-[#6FEC06]/10 border border-[#6FEC06]/30">
                  <TrendingUp className="w-5 h-5 text-[#6FEC06]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-display">
                    Live Price Chart
                  </h2>
                  <p className="text-xs text-white/40">
                    {corporation.tokenSymbol || corporation.name} / SOL
                  </p>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden border border-[#6FEC06]/20 bg-[#0a0520]">
                <iframe
                  src={chartLinks.dexscreenerEmbed}
                  className="w-full h-[350px] sm:h-[500px] md:h-[600px]"
                  title={`${corporation.name} Price Chart`}
                  allow="clipboard-write"
                  loading="lazy"
                />
              </div>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
