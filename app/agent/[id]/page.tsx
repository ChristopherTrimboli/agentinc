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
}

// Rarity colors matching the design system
const rarityColors: Record<
  string,
  { border: string; bg: string; text: string; glow: string; gradient: string }
> = {
  legendary: {
    border: "border-[#FFD700]",
    bg: "bg-[#FFD700]/10",
    text: "text-[#FFD700]",
    glow: "shadow-[0_0_40px_rgba(255,215,0,0.4)]",
    gradient: "from-[#FFD700]/20 via-[#FFA500]/10 to-transparent",
  },
  epic: {
    border: "border-[#A855F7]",
    bg: "bg-[#A855F7]/10",
    text: "text-[#A855F7]",
    glow: "shadow-[0_0_40px_rgba(168,85,247,0.4)]",
    gradient: "from-[#A855F7]/20 via-[#8B5CF6]/10 to-transparent",
  },
  rare: {
    border: "border-[#3B82F6]",
    bg: "bg-[#3B82F6]/10",
    text: "text-[#3B82F6]",
    glow: "shadow-[0_0_40px_rgba(59,130,246,0.4)]",
    gradient: "from-[#3B82F6]/20 via-[#1D4ED8]/10 to-transparent",
  },
  uncommon: {
    border: "border-[#6FEC06]",
    bg: "bg-[#6FEC06]/10",
    text: "text-[#6FEC06]",
    glow: "shadow-[0_0_40px_rgba(111,236,6,0.4)]",
    gradient: "from-[#6FEC06]/20 via-[#4a9f10]/10 to-transparent",
  },
  common: {
    border: "border-white/20",
    bg: "bg-white/5",
    text: "text-white/60",
    glow: "",
    gradient: "from-white/5 to-transparent",
  },
};

// Chart/DEX links for Solana tokens
const getChartLinks = (tokenMint: string) => ({
  bags: `https://bags.fm/bag/${tokenMint}`,
  dexscreener: `https://dexscreener.com/solana/${tokenMint}`,
  dexscreenerEmbed: `https://dexscreener.com/solana/${tokenMint}?embed=1&theme=dark&trades=0&info=0`,
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
    <div className="min-h-screen bg-[var(--background)]">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div
        className={`fixed inset-0 bg-gradient-to-b ${rarityStyle.gradient} pointer-events-none`}
      />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--background)]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </Link>
          <div className="flex items-center gap-3">
            {agent.isMinted && chartLinks && (
              <a
                href={chartLinks.dexscreener}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#6FEC06]/10 border border-[#6FEC06]/30 rounded-full text-[#6FEC06] text-sm font-medium hover:bg-[#6FEC06]/20 transition-all"
              >
                <TrendingUp className="w-4 h-4" />
                View Chart
              </a>
            )}
            <Link
              href={`/dashboard/chat?agent=${agent.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-full text-black text-sm font-semibold hover:opacity-90 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Left Column - Image */}
          <div className="lg:col-span-2">
            <div
              className={`relative aspect-square rounded-3xl overflow-hidden ${rarityStyle.border} border-2 ${rarityStyle.glow} bg-[#0a0520]`}
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
                  className={`absolute top-4 right-4 px-3 py-1.5 rounded-full ${rarityStyle.bg} ${rarityStyle.text} text-xs font-bold uppercase tracking-wider backdrop-blur-sm border ${rarityStyle.border} flex items-center gap-1.5`}
                >
                  <Star className="w-3.5 h-3.5" />
                  {agent.rarity}
                </div>
              )}
            </div>

            {/* Quick Stats - Mobile */}
            <div className="lg:hidden mt-6 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#0a0520] border border-white/10">
                <div className="text-xs text-white/40 mb-1">Status</div>
                <div className="flex items-center gap-2">
                  {agent.isPublic ? (
                    <>
                      <Globe className="w-4 h-4 text-[#6FEC06]" />
                      <span className="text-[#6FEC06] font-medium">Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-white/40" />
                      <span className="text-white/60 font-medium">Private</span>
                    </>
                  )}
                </div>
              </div>
              {agent.personality && (
                <div className="p-4 rounded-2xl bg-[#0a0520] border border-white/10">
                  <div className="text-xs text-white/40 mb-1">Personality</div>
                  <div className="text-white font-medium capitalize">
                    {agent.personality}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Info */}
          <div className="lg:col-span-3 space-y-8">
            {/* Header */}
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {agent.isMinted && agent.tokenSymbol && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6FEC06]/10 border border-[#6FEC06]/30">
                    <Zap className="w-3.5 h-3.5 text-[#6FEC06]" />
                    <span className="text-sm font-semibold text-[#6FEC06]">
                      {agent.tokenSymbol}
                    </span>
                  </div>
                )}
                {agent.specialAbility && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#A855F7]/10 border border-[#A855F7]/30">
                    <Sparkles className="w-3.5 h-3.5 text-[#A855F7]" />
                    <span className="text-sm font-medium text-[#A855F7]">
                      {agent.specialAbility}
                    </span>
                  </div>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
                {agent.name}
              </h1>
              {agent.description && (
                <p className="text-lg text-white/70 leading-relaxed">
                  {agent.description}
                </p>
              )}
            </div>

            {/* Token Info */}
            {agent.isMinted && agent.tokenMint && chartLinks && (
              <div className="p-6 rounded-2xl bg-[#0a0520] border border-[#6FEC06]/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#6FEC06]" />
                    <h2 className="text-lg font-semibold font-display">
                      Token Info
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={chartLinks.bags}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-full text-black text-sm font-semibold hover:opacity-90 transition-all"
                    >
                      <Zap className="w-4 h-4" />
                      Buy on Bags
                    </a>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-white/40 mb-1.5">
                      Token Mint Address
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-[#120557]/30 rounded-lg text-sm text-white/80 font-mono truncate">
                        {agent.tokenMint}
                      </code>
                      <button
                        onClick={() => copyToClipboard(agent.tokenMint!)}
                        className="p-2 rounded-lg bg-[#120557]/30 text-white/60 hover:text-white hover:bg-[#120557]/50 transition-colors"
                        title="Copy address"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-[#6FEC06]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={chartLinks.bags}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#6FEC06]/10 border border-[#6FEC06]/30 rounded-xl text-[#6FEC06] text-sm font-medium hover:bg-[#6FEC06]/20 transition-all"
                    >
                      <Zap className="w-4 h-4" />
                      Buy on Bags
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={chartLinks.dexscreener}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-medium hover:bg-white/10 transition-all"
                    >
                      <TrendingUp className="w-4 h-4" />
                      DexScreener
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Traits & Skills */}
            {((agent.traits && agent.traits.length > 0) ||
              (agent.skills && agent.skills.length > 0)) && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Traits */}
                {agent.traits && agent.traits.length > 0 && (
                  <div className="p-6 rounded-2xl bg-[#0a0520] border border-white/10">
                    <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
                      Traits
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {agent.traits.map((trait) => (
                        <span
                          key={trait}
                          className="px-3 py-1.5 rounded-full bg-[#120557]/50 border border-[#6FEC06]/20 text-sm text-white/70"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {agent.skills && agent.skills.length > 0 && (
                  <div className="p-6 rounded-2xl bg-[#0a0520] border border-white/10">
                    <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {agent.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1.5 rounded-full bg-[#6FEC06]/10 border border-[#6FEC06]/30 text-sm text-[#6FEC06]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
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
                  <div className="text-xs text-white/40 mb-2">Personality</div>
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
            <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() =>
                  copyToClipboard(`${window.location.origin}/agent/${agent.id}`)
                }
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-medium hover:bg-white/10 transition-all"
              >
                <Copy className="w-4 h-4" />
                Copy Link
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=Check out ${encodeURIComponent(agent.name)} on Agent Inc!&url=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/agent/${agent.id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-medium hover:bg-white/10 transition-all"
              >
                <Twitter className="w-4 h-4" />
                Share on X
              </a>
            </div>
          </div>
        </div>

        {/* Live Price Chart */}
        {agent.isMinted && agent.tokenMint && chartLinks && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#6FEC06]/10 border border-[#6FEC06]/30">
                  <TrendingUp className="w-5 h-5 text-[#6FEC06]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-display">Live Price Chart</h2>
                  <p className="text-sm text-white/50">
                    {agent.tokenSymbol || agent.name} / SOL
                  </p>
                </div>
              </div>
              <a
                href={chartLinks.dexscreener}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                Open full chart
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <div className="rounded-2xl overflow-hidden border border-[#6FEC06]/20 bg-[#0a0520]">
              <iframe
                src={chartLinks.dexscreenerEmbed}
                className="w-full h-[500px] md:h-[600px]"
                title={`${agent.name} Price Chart`}
                allow="clipboard-write"
                loading="lazy"
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative py-16 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6FEC06] to-[#120557] flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">Agent Inc.</span>
              </Link>
              <p className="text-white/60 max-w-sm mb-6">
                Incorporate, trade and invest in collections of agents that
                build together a real startup. Based on ERC-8041.
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://x.com/agentincdotfun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#120557]/50 flex items-center justify-center hover:bg-[#6FEC06]/20 transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="https://discord.gg/jTGebW3rkS"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#120557]/50 flex items-center justify-center hover:bg-[#6FEC06]/20 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                </a>
                <a
                  href="https://github.com/ChristopherTrimboli/agentinc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#120557]/50 flex items-center justify-center hover:bg-[#6FEC06]/20 transition-colors"
                >
                  <Code className="w-5 h-5" />
                </a>
                <a
                  href="https://ethereum-magicians.org/t/erc-8041-fixed-supply-agent-nft-collections/25656"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-[#120557]/50 flex items-center justify-center hover:bg-[#6FEC06]/20 transition-colors"
                >
                  <Globe className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-white/60">
                <li>
                  <Link
                    href="/dashboard"
                    className="hover:text-white transition-colors"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    href="/dashboard/mint"
                    className="hover:text-white transition-colors"
                  >
                    Mint Agent
                  </Link>
                </li>
                <li>
                  <Link
                    href="/tokenomics"
                    className="hover:text-white transition-colors"
                  >
                    Tokenomics
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-3 text-white/60">
                <li>
                  <a
                    href="https://ethereum-magicians.org/t/erc-8041-fixed-supply-agent-nft-collections/25656"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    ERC-8041 Spec
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/ChristopherTrimboli/agentinc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/agentincdotfun"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Twitter
                  </a>
                </li>
                <li>
                  <a
                    href="https://discord.gg/jTGebW3rkS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Discord
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-white/60 text-sm">
            <div>© 2026 Agent Inc. All rights reserved.</div>
            <div className="flex items-center gap-6">
              <span className="text-white/40">Privacy Policy</span>
              <span className="text-white/40">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
