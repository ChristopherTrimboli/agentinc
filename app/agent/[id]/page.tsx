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
  Code,
} from "lucide-react";
import { getBagsFmUrl, getDexScreenerUrl } from "@/lib/constants/urls";
import Footer from "@/app/components/Footer";

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
  traits: string[];
  skills: string[];
  specialAbility: string | null;
  isMinted: boolean;
  tokenMint: string | null;
  tokenSymbol: string | null;
  launchedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    email: string | null;
  };
  corporation: Corporation | null;
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
  dexscreenerEmbed: `${getDexScreenerUrl(tokenMint)}?embed=1&theme=dark`,
});

export default function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { identityToken } = useIdentityToken();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchAgent() {
      try {
        const headers: HeadersInit = {};
        if (identityToken) {
          headers["privy-id-token"] = identityToken;
        }

        const response = await fetch(`/api/agents/${resolvedParams.id}`, {
          headers,
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Agent not found");
          } else if (response.status === 403) {
            throw new Error("This agent is private");
          }
          throw new Error("Failed to fetch agent");
        }

        const data = await response.json();
        setAgent(data.agent);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load agent");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAgent();
  }, [resolvedParams.id, identityToken]);

  const getRarityStyle = (rarity: string | null) => {
    return rarityColors[rarity || "common"] || rarityColors.common;
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      <nav className="flex-shrink-0 z-50 backdrop-blur-xl bg-[var(--background)]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 sm:gap-2 text-white/60 hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {agent.isMinted && chartLinks && (
              <a
                href={chartLinks.dexscreener}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-white/5 border border-white/10 rounded-full text-white/70 text-xs sm:text-sm font-medium hover:bg-white/10 transition-all"
              >
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline sm:inline">Chart</span>
              </a>
            )}
            <Link
              href={`/dashboard/chat?agent=${agent.id}`}
              className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-full text-black text-xs sm:text-sm font-semibold hover:opacity-90 transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline sm:inline">Chat</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Main Content */}
        <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
          <div className="grid lg:grid-cols-5 gap-6 sm:gap-8 lg:gap-12 w-full min-w-0">
            {/* Left Column - Image */}
            <div className="lg:col-span-2 max-w-[260px] sm:max-w-[300px] md:max-w-none mx-auto lg:mx-0 min-w-0">
              <div
                className={`relative aspect-square rounded-2xl sm:rounded-3xl overflow-hidden ${rarityStyle.border} border-2 ${rarityStyle.glow} bg-[#0a0520]`}
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
              <div className="lg:hidden mt-4 sm:mt-6 grid grid-cols-2 gap-3 sm:gap-4">
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
                {agent.personality && (
                  <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-[#0a0520] border border-white/10">
                    <div className="text-[10px] sm:text-xs text-white/40 mb-1">
                      Personality
                    </div>
                    <div className="text-white text-sm sm:text-base font-medium capitalize truncate">
                      {agent.personality}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Info */}
            <div className="lg:col-span-3 space-y-5 sm:space-y-8 w-full min-w-0 overflow-hidden">
              {/* Header */}
              <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  {agent.isMinted && agent.tokenSymbol && (
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#6FEC06]/10 border border-[#6FEC06]/30">
                      <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#6FEC06]" />
                      <span className="text-xs sm:text-sm font-semibold text-[#6FEC06]">
                        {agent.tokenSymbol}
                      </span>
                    </div>
                  )}
                  {agent.specialAbility && (
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#A855F7]/10 border border-[#A855F7]/30">
                      <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#A855F7]" />
                      <span className="text-xs sm:text-sm font-medium text-[#A855F7]">
                        {agent.specialAbility}
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
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
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
                        onClick={() => copyToClipboard(agent.tokenMint!)}
                        className="p-1.5 sm:p-2 rounded-lg bg-[#120557]/30 text-white/60 hover:text-white hover:bg-[#120557]/50 transition-colors shrink-0"
                        title="Copy address"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#6FEC06]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        )}
                      </button>
                    </div>
                  </div>
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
                </div>
              )}

              {/* Traits & Skills */}
              {((agent.traits && agent.traits.length > 0) ||
                (agent.skills && agent.skills.length > 0)) && (
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-6">
                  {/* Traits */}
                  {agent.traits && agent.traits.length > 0 && (
                    <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-[#0a0520] border border-white/10">
                      <h3 className="text-xs sm:text-sm font-semibold text-white/40 uppercase tracking-wider mb-3 sm:mb-4">
                        Traits
                      </h3>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {agent.traits.map((trait) => (
                          <span
                            key={trait}
                            className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#120557]/50 border border-[#6FEC06]/20 text-xs sm:text-sm text-white/70"
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {agent.skills && agent.skills.length > 0 && (
                    <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-[#0a0520] border border-white/10">
                      <h3 className="text-xs sm:text-sm font-semibold text-white/40 uppercase tracking-wider mb-3 sm:mb-4">
                        Skills
                      </h3>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {agent.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#6FEC06]/10 border border-[#6FEC06]/30 text-xs sm:text-sm text-[#6FEC06]"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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

              {/* Details Grid - Desktop */}
              <div className="hidden lg:grid grid-cols-3 gap-4">
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
                {agent.personality && (
                  <div className="p-5 rounded-2xl bg-[#0a0520] border border-white/10">
                    <div className="text-xs text-white/40 mb-2">
                      Personality
                    </div>
                    <div className="text-white font-semibold capitalize">
                      {agent.personality}
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

              {/* Share Actions */}
              <div className="flex flex-wrap gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-white/10">
                <button
                  onClick={() =>
                    copyToClipboard(
                      `${window.location.origin}/agent/${agent.id}`,
                    )
                  }
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white/70 text-xs sm:text-sm font-medium hover:bg-white/10 transition-all"
                >
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Copy Link
                </button>
                <a
                  href={`https://twitter.com/intent/tweet?text=Check out ${encodeURIComponent(agent.name)} on Agent Inc!&url=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/agent/${agent.id}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 border border-white/10 rounded-lg sm:rounded-xl text-white/70 text-xs sm:text-sm font-medium hover:bg-white/10 transition-all"
                >
                  <Twitter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Share on X
                </a>
              </div>
            </div>
          </div>

          {/* Live Price Chart */}
          {agent.isMinted && agent.tokenMint && chartLinks && (
            <div className="mt-8 sm:mt-12 overflow-hidden">
              <div className="flex flex-col gap-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
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
                <a
                  href={chartLinks.dexscreener}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-white/60 hover:text-white transition-colors"
                >
                  Full chart
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </a>
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
