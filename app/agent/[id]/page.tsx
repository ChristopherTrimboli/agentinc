"use client";

import { useState, useEffect, use } from "react";
import { useIdentityToken } from "@privy-io/react-auth";
import Image from "next/image";
import Link from "next/link";
import {
  Bot,
  ArrowLeft,
  ExternalLink,
  Globe,
  Lock,
  MessageSquare,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
  Copy,
  Check,
  Twitter,
  Building2,
} from "lucide-react";
import { getBagsFmUrl, getDexScreenerUrl } from "@/lib/constants/urls";
import Footer from "@/app/components/Footer";
import StakingPanel from "@/app/components/StakingPanel";
import AgentChat from "@/app/components/AgentChat";
import { PersonalityRadar } from "@/components/ui/PersonalityRadar";
import { LEGACY_TO_SCORES, type PersonalityScores } from "@/lib/agentTraits";

interface Corporation {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  color: string | null;
  tokenMint: string | null;
  tokenSymbol: string | null;
}

interface Agent {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  isPublic: boolean;
  imageUrl: string | null;
  rarity: string | null;
  personality: string | null;
  personalityScores: PersonalityScores | null;
  isMinted: boolean;
  tokenMint: string | null;
  tokenSymbol: string | null;
  launchedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    walletAddress: string | null;
  };
  corporation: Corporation | null;
}

interface AgentStats {
  chats: {
    totalSessions: number;
    totalMessages: number;
    uniqueUsers: number;
    averageMessagesPerSession: number;
  };
  community: {
    generalMessages: number;
    vipMessages: number;
    totalMessages: number;
  };
}

import { RARITY_DETAIL_STYLES } from "@/lib/utils/rarity";

const rarityColors = RARITY_DETAIL_STYLES as Record<
  string,
  { border: string; bg: string; text: string; glow: string; gradient: string }
>;

// Chart/DEX links for Solana tokens
const getChartLinks = (tokenMint: string) => ({
  bags: getBagsFmUrl(tokenMint),
  dexscreener: getDexScreenerUrl(tokenMint),
  dexscreenerEmbed: `${getDexScreenerUrl(tokenMint)}?embed=1&theme=dark&trades=0&info=0`,
});

export default function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { identityToken } = useIdentityToken();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const headers: HeadersInit = {};
        if (identityToken) {
          headers["privy-id-token"] = identityToken;
        }

        // Fetch agent and stats in parallel
        const [agentResponse, statsResponse] = await Promise.all([
          fetch(`/api/agents/${resolvedParams.id}`, { headers }),
          fetch(`/api/agents/${resolvedParams.id}/stats`),
        ]);

        if (!agentResponse.ok) {
          if (agentResponse.status === 404) {
            throw new Error("Agent not found");
          } else if (agentResponse.status === 403) {
            throw new Error("This agent is private");
          }
          throw new Error("Failed to fetch agent");
        }

        const agentData = await agentResponse.json();
        setAgent(agentData.agent);

        // Stats are optional - don't fail if they're unavailable
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.stats);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load agent");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [resolvedParams.id, identityToken]);

  // Update document title when agent loads
  useEffect(() => {
    if (agent) {
      const title = `${agent.name}${agent.tokenSymbol ? ` ($${agent.tokenSymbol})` : ""} | Agent Inc.`;
      document.title = title;
    }
  }, [agent]);

  const getRarityStyle = (rarity: string | null) => {
    return rarityColors[rarity || "common"] || rarityColors.common;
  };

  const copyToClipboard = async (text: string, itemId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedItem(itemId);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-[#6FEC06]/30 border-t-[#6FEC06] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40">Loading agent profile...</p>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500/20 to-[#120557]/50 flex items-center justify-center border border-red-500/30">
            <Bot className="w-12 h-12 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3 font-display">
            {error || "Agent not found"}
          </h1>
          <p className="text-white/50 mb-6">
            The agent you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have permission to view it.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#6FEC06]/10 border border-[#6FEC06]/30 rounded-full text-[#6FEC06] font-medium hover:bg-[#6FEC06]/20 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const rarityStyle = getRarityStyle(agent.rarity);
  const chartLinks = agent.tokenMint ? getChartLinks(agent.tokenMint) : null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--background)]">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div
        className={`fixed inset-0 bg-gradient-to-b ${rarityStyle.gradient} pointer-events-none`}
      />

      {/* Navigation */}
      <nav className="flex-shrink-0 z-50 backdrop-blur-xl bg-[var(--background)]/90 border-b border-white/5 shadow-lg shadow-black/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <Link href="/" className="group flex items-center shrink-0">
              <Image
                src="/agentinc.png"
                alt="Agent Inc."
                width={150}
                height={38}
                className="h-5 w-auto transition-transform duration-200 group-hover:scale-[1.02] brightness-100 group-hover:brightness-110"
              />
            </Link>

            {/* Section Links */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => {
                  document
                    .getElementById("overview")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-[13px] font-medium text-white/70 hover:text-white transition-colors duration-200 active:scale-95"
              >
                Overview
              </button>
              {agent.isMinted && agent.tokenMint && (
                <>
                  <span className="text-white/20 text-sm">/</span>
                  <button
                    onClick={() => {
                      document
                        .getElementById("community")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-[13px] font-medium text-white/70 hover:text-white transition-colors duration-200 active:scale-95"
                  >
                    Community
                  </button>
                  <span className="text-white/20 text-sm">/</span>
                  <button
                    onClick={() => {
                      document
                        .getElementById("chart")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="text-[13px] font-medium text-white/70 hover:text-white transition-colors duration-200 active:scale-95"
                  >
                    Chart
                  </button>
                </>
              )}
            </div>

            {/* Chat Button */}
            <Link
              href={`/dashboard/chat?agent=${agent.id}`}
              className="group relative flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-[#6FEC06] via-[#5dd105] to-[#4ab804] rounded-full text-black text-sm font-bold shadow-lg shadow-[#6FEC06]/25 hover:shadow-xl hover:shadow-[#6FEC06]/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
            >
              {/* Animated gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#7fff20] to-[#6FEC06] opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

              <MessageSquare className="w-4 h-4 relative z-10 group-hover:-rotate-6 transition-transform duration-200" />
              <span className="relative z-10 whitespace-nowrap">
                Chat with {agent.name}
              </span>

              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Main Content */}
        <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
          <div
            id="overview"
            className="grid lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-12 w-full min-w-0"
          >
            {/* Left Column - Image */}
            <div className="lg:col-span-2 w-full min-w-0">
              <div
                className={`relative aspect-square w-full rounded-2xl sm:rounded-3xl overflow-hidden ${rarityStyle.border} border-2 ${rarityStyle.glow} bg-[#0a0520]`}
              >
                {agent.imageUrl ? (
                  <Image
                    src={agent.imageUrl}
                    alt={agent.name}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#120557]/50 to-[#000028]">
                    <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-[#6FEC06]/20 to-[#120557]/50 flex items-center justify-center border border-[#6FEC06]/20">
                      <Bot className="w-16 h-16 text-[#6FEC06]/60" />
                    </div>
                  </div>
                )}

                {/* Rarity Badge */}
                {agent.rarity && agent.rarity !== "common" && (
                  <div
                    className={`absolute top-2 right-2 sm:top-4 sm:right-4 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${rarityStyle.bg} ${rarityStyle.text} text-[10px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-sm border ${rarityStyle.border} flex items-center gap-1`}
                  >
                    <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {agent.rarity}
                  </div>
                )}
              </div>

              {/* Quick Stats - Mobile */}
              <div className="lg:hidden mt-4 sm:mt-6 space-y-3 sm:space-y-4 w-full">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0a0520] border border-white/10">
                    <div className="text-[10px] sm:text-xs text-white/40 mb-1">
                      Status
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {agent.isPublic ? (
                        <>
                          <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6FEC06]" />
                          <span className="text-[#6FEC06] text-sm sm:text-base font-medium">
                            Public
                          </span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/40" />
                          <span className="text-white/60 text-sm sm:text-base font-medium">
                            Private
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {agent.createdBy.walletAddress && (
                    <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0a0520] border border-white/10">
                      <div className="text-[10px] sm:text-xs text-white/40 mb-1">
                        Creator
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <code className="text-xs sm:text-sm text-white/80 font-mono truncate">
                          {agent.createdBy.walletAddress.slice(0, 4)}...
                          {agent.createdBy.walletAddress.slice(-4)}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              agent.createdBy.walletAddress!,
                              "creator-mobile",
                            )
                          }
                          className="p-1 rounded-md bg-[#120557]/30 text-white/60 hover:text-white hover:bg-[#120557]/50 transition-colors shrink-0"
                          title="Copy address"
                        >
                          {copiedItem === "creator-mobile" ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div
                  className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0a0520] border ${agent.corporation ? "border-[#A855F7]/20" : "border-white/10"}`}
                >
                  <div className="text-[10px] sm:text-xs text-white/40 mb-1">
                    Corporation
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${agent.corporation ? "text-[#A855F7]" : "text-white/40"}`}
                    />
                    <span
                      className={`text-sm sm:text-base font-medium truncate ${agent.corporation ? "text-[#A855F7]" : "text-white/40"}`}
                    >
                      {agent.corporation ? agent.corporation.name : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Personality Radar - Under Image */}
              {(() => {
                const radarScores =
                  agent.personalityScores ??
                  (agent.personality
                    ? LEGACY_TO_SCORES[agent.personality]
                    : null);
                if (!radarScores) return null;
                return (
                  <div className="mt-4 sm:mt-6 w-full bg-[#0a0520] rounded-xl sm:rounded-2xl">
                    <PersonalityRadar
                      scores={radarScores}
                      size="md"
                      showMBTI
                      showValues
                    />
                  </div>
                );
              })()}
            </div>

            {/* Right Column - Info */}
            <div className="lg:col-span-3 space-y-5 sm:space-y-8 w-full min-w-0 overflow-hidden">
              {/* Header */}
              <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  {agent.isMinted && agent.tokenSymbol && (
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#6FEC06]/10 border border-[#6FEC06]/30">
                      <span className="text-xs sm:text-sm font-semibold text-[#6FEC06]">
                        ${agent.tokenSymbol}
                      </span>
                    </div>
                  )}
                </div>
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold font-display mb-3 sm:mb-4">
                  {agent.name}
                </h1>
                {agent.description && (
                  <p className="text-sm sm:text-lg text-white/70 leading-relaxed">
                    {agent.description}
                  </p>
                )}
              </div>

              {/* Token Info */}
              {agent.isMinted && agent.tokenMint && chartLinks && (
                <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-[#0a0520] border border-white/10">
                  <div className="flex items-center gap-2 mb-3 sm:mb-2">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
                    <h2 className="text-base sm:text-lg font-semibold font-display">
                      Token Details
                    </h2>
                  </div>
                  <div className="min-w-0 mb-4">
                    <div className="text-[10px] sm:text-xs text-white/40 mb-1 sm:mb-1.5">
                      Token Mint Address
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                      <code className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 sm:py-2 bg-[#120557]/30 rounded-lg text-xs sm:text-sm text-white/80 font-mono truncate overflow-hidden">
                        {agent.tokenMint}
                      </code>
                      <button
                        onClick={() =>
                          copyToClipboard(agent.tokenMint!, "token-mint")
                        }
                        className="p-1.5 sm:p-2 rounded-lg bg-[#120557]/30 text-white/60 hover:text-white hover:bg-[#120557]/50 transition-colors shrink-0"
                        title="Copy address"
                      >
                        {copiedItem === "token-mint" ? (
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6FEC06]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <a
                      href={chartLinks.bags}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#6FEC06]/10 border border-[#6FEC06]/30 rounded-xl text-[#6FEC06] text-sm font-semibold hover:bg-[#6FEC06]/20 transition-all"
                    >
                      <Zap className="w-4 h-4" />
                      Buy on Bags
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?text=Check out ${encodeURIComponent(agent.name)} on Agent Inc!&url=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/agent/${agent.tokenMint || agent.id}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-semibold hover:bg-white/10 transition-all"
                    >
                      <Twitter className="w-4 h-4" />
                      Share on X
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Corporation Section */}
              {agent.corporation && (
                <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-[#0a0520] border border-[#A855F7]/20">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#A855F7]" />
                    <h2 className="text-base sm:text-lg font-semibold font-display">
                      Part of Corporation
                    </h2>
                  </div>
                  <Link
                    href={`/incorporate?id=${agent.corporation.id}`}
                    className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-[#120557]/30 border border-[#A855F7]/20 hover:border-[#A855F7]/40 transition-all"
                  >
                    {/* Corporation Logo */}
                    <div
                      className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl shrink-0"
                      style={{
                        backgroundColor: agent.corporation.color
                          ? `${agent.corporation.color}20`
                          : "rgba(168, 85, 247, 0.1)",
                        borderColor: agent.corporation.color || "#A855F7",
                        borderWidth: "1px",
                      }}
                    >
                      {agent.corporation.logo || "🏢"}
                    </div>
                    {/* Corporation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                        <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-[#A855F7] transition-colors truncate">
                          {agent.corporation.name}
                        </h3>
                        {agent.corporation.tokenSymbol && (
                          <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-[#A855F7]/20 text-[#A855F7] text-[10px] sm:text-xs font-semibold">
                            {agent.corporation.tokenSymbol}
                          </span>
                        )}
                      </div>
                      {agent.corporation.description && (
                        <p className="text-xs sm:text-sm text-white/50 line-clamp-2">
                          {agent.corporation.description}
                        </p>
                      )}
                    </div>
                    {/* Arrow */}
                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-white/40 group-hover:text-[#A855F7] transition-colors shrink-0" />
                  </Link>
                  {/* Corporation Token Link */}
                  {agent.corporation.tokenMint && (
                    <div className="mt-3 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
                      <a
                        href={getBagsFmUrl(agent.corporation.tokenMint)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-[#A855F7]/10 border border-[#A855F7]/30 rounded-lg sm:rounded-xl text-[#A855F7] text-xs sm:text-sm font-medium hover:bg-[#A855F7]/20 transition-all"
                      >
                        <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Buy {agent.corporation.tokenSymbol || "Corp Token"}
                        <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </a>
                      <a
                        href={getDexScreenerUrl(agent.corporation.tokenMint)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white/70 text-xs sm:text-sm font-medium hover:bg-white/10 transition-all"
                      >
                        <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden xs:inline">View Chart</span>
                        <span className="xs:hidden">Chart</span>
                        <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Analytics Stats */}
              {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-6">
                  {/* Total Chats */}
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-[#0a0520] border border-white/10">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[#6FEC06]" />
                      <div className="text-xs text-white/40">Chats</div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-white mb-1">
                      {stats.chats.totalSessions.toLocaleString()}
                    </div>
                    <div className="text-xs text-white/50">
                      {stats.chats.uniqueUsers}{" "}
                      {stats.chats.uniqueUsers === 1 ? "user" : "users"}
                    </div>
                  </div>

                  {/* Total Messages */}
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-[#0a0520] border border-white/10">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#6FEC06]" />
                      <div className="text-xs text-white/40">Messages</div>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-white mb-1">
                      {stats.chats.totalMessages.toLocaleString()}
                    </div>
                    <div className="text-xs text-white/50">
                      {stats.chats.averageMessagesPerSession} avg per chat
                    </div>
                  </div>

                  {/* Community Activity */}
                  {stats.community.totalMessages > 0 && (
                    <>
                      <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-[#0a0520] border border-white/10">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3">
                          <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                          <div className="text-xs text-white/40">Community</div>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white mb-1">
                          {stats.community.generalMessages.toLocaleString()}
                        </div>
                        <div className="text-xs text-white/50">
                          general messages
                        </div>
                      </div>

                      {stats.community.vipMessages > 0 && (
                        <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-[#0a0520] border border-[#6FEC06]/20">
                          <div className="flex items-center gap-2 mb-2 sm:mb-3">
                            <Star className="w-4 h-4 sm:w-5 sm:h-5 text-[#6FEC06]" />
                            <div className="text-xs text-white/40">
                              VIP Chat
                            </div>
                          </div>
                          <div className="text-xl sm:text-2xl font-bold text-white mb-1">
                            {stats.community.vipMessages.toLocaleString()}
                          </div>
                          <div className="text-xs text-white/50">
                            VIP messages
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Details Grid - Desktop */}
              <div className="hidden lg:block space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-[#0a0520] border border-white/10">
                    <div className="text-xs text-white/40 mb-2">Status</div>
                    <div className="flex items-center gap-2">
                      {agent.isPublic ? (
                        <>
                          <Globe className="w-5 h-5 text-[#6FEC06]" />
                          <span className="text-[#6FEC06] font-semibold">
                            Public
                          </span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5 text-white/40" />
                          <span className="text-white/60 font-semibold">
                            Private
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {agent.createdBy.walletAddress && (
                    <div className="p-5 rounded-2xl bg-[#0a0520] border border-white/10">
                      <div className="text-xs text-white/40 mb-2">Creator</div>
                      <div className="flex items-center gap-2 min-w-0">
                        <code className="text-sm text-white/80 font-mono truncate">
                          {agent.createdBy.walletAddress.slice(0, 4)}...
                          {agent.createdBy.walletAddress.slice(-4)}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              agent.createdBy.walletAddress!,
                              "creator-desktop",
                            )
                          }
                          className="p-1.5 rounded-lg bg-[#120557]/30 text-white/60 hover:text-white hover:bg-[#120557]/50 transition-colors shrink-0"
                          title="Copy address"
                        >
                          {copiedItem === "creator-desktop" ? (
                            <Check className="w-4 h-4 text-[#6FEC06]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="p-5 rounded-2xl bg-[#0a0520] border border-white/10">
                    <div className="text-xs text-white/40 mb-2">Created</div>
                    <div className="text-white font-semibold">
                      {new Date(agent.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div
                  className={`p-5 rounded-2xl bg-[#0a0520] border ${agent.corporation ? "border-[#A855F7]/20" : "border-white/10"}`}
                >
                  <div className="text-xs text-white/40 mb-2">Corporation</div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2
                      className={`w-5 h-5 ${agent.corporation ? "text-[#A855F7]" : "text-white/40"}`}
                    />
                    <span
                      className={`font-semibold truncate ${agent.corporation ? "text-[#A855F7]" : "text-white/40"}`}
                    >
                      {agent.corporation ? agent.corporation.name : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Staking & Community Chat - Side by Side */}
          {agent.isMinted && agent.tokenMint && agent.tokenSymbol && (
            <div
              id="community"
              className="mt-6 sm:mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch"
            >
              <div className="h-full">
                <AgentChat
                  agentId={agent.id}
                  tokenMint={agent.tokenMint}
                  tokenSymbol={agent.tokenSymbol}
                />
              </div>
              <div className="h-full">
                <StakingPanel
                  tokenMint={agent.tokenMint}
                  tokenSymbol={agent.tokenSymbol}
                  agentId={agent.id}
                />
              </div>
            </div>
          )}

          {/* Live Price Chart */}
          {agent.isMinted && agent.tokenMint && chartLinks && (
            <div id="chart" className="mt-8 sm:mt-12 overflow-hidden">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-[#6FEC06]/10 border border-[#6FEC06]/30">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-[#6FEC06]" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold font-display">
                    Live Price Chart
                  </h2>
                  <p className="text-xs sm:text-sm text-white/50">
                    {agent.tokenSymbol || agent.name} / SOL
                  </p>
                </div>
              </div>
              <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-[#6FEC06]/20 bg-[#0a0520]">
                <iframe
                  src={chartLinks.dexscreenerEmbed}
                  className="w-full h-[350px] sm:h-[500px] md:h-[600px]"
                  title={`${agent.name} Price Chart`}
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
