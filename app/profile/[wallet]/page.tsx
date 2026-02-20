"use client";

import { use, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bot,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  Rocket,
  Search,
  User,
  Wallet,
  Zap,
  Shield,
  Hash,
  Activity,
  ArrowUpRight,
  Sparkles,
  Star,
} from "lucide-react";

import Footer from "@/app/components/Footer";
import LoginButton from "@/app/components/LoginButton";
import { getSolscanUrl } from "@/lib/constants/urls";
import { getRarityBadgeStyle } from "@/lib/utils/rarity";

interface ProfileAgent {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  rarity: string | null;
  tokenMint: string | null;
  tokenSymbol: string | null;
  createdAt: string;
  launchedAt: string | null;
}

interface ProfileActivity {
  type: "agent_created" | "agent_launched" | "community_message";
  createdAt: string;
  agentId?: string;
  agentName?: string;
  agentImageUrl?: string | null;
  tokenMint?: string | null;
  tokenSymbol?: string | null;
  content?: string;
  isVip?: boolean;
}

interface ProfileResponse {
  profile: {
    walletAddress: string;
    userSince: string;
    twitterUsername: string | null;
    isActiveWallet: boolean;
    walletsCount: number;
  };
  stats: {
    totalAgents: number;
    publicAgents: number;
    mintedAgents: number;
    chatSessions: number;
    totalCommunityMessages: number;
  };
  agents: ProfileAgent[];
  activity: ProfileActivity[];
}

type AgentFilter = "all" | "launched" | "unlaunched";

function truncateWallet(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function formatRelative(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getAvatarGradient(address: string): string {
  const gradients = [
    "from-[#6FEC06] to-[#00d4a0]",
    "from-[#A855F7] to-[#6366f1]",
    "from-[#f59e0b] to-[#ef4444]",
    "from-[#06b6d4] to-[#6366f1]",
    "from-[#ec4899] to-[#A855F7]",
    "from-[#6FEC06] to-[#06b6d4]",
  ];
  const idx =
    address
      .split("")
      .slice(0, 4)
      .reduce((acc, c) => acc + c.charCodeAt(0), 0) % gradients.length;
  return gradients[idx];
}

function getAvatarInitials(
  twitterUsername: string | null,
  walletAddress: string,
): string {
  if (twitterUsername) {
    return twitterUsername.slice(0, 2).toUpperCase();
  }
  return walletAddress.slice(0, 2).toUpperCase();
}

function activityIcon(type: ProfileActivity["type"], isVip?: boolean) {
  if (type === "community_message") {
    return isVip ? (
      <Star className="w-3.5 h-3.5" />
    ) : (
      <MessageSquare className="w-3.5 h-3.5" />
    );
  }
  if (type === "agent_launched") return <Rocket className="w-3.5 h-3.5" />;
  return <Sparkles className="w-3.5 h-3.5" />;
}

function activityColors(type: ProfileActivity["type"], isVip?: boolean) {
  if (type === "community_message") {
    return isVip
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-[#6FEC06]/12 text-[#6FEC06] border-[#6FEC06]/25";
  }
  if (type === "agent_launched")
    return "bg-purple-500/15 text-purple-400 border-purple-500/30";
  return "bg-blue-500/15 text-blue-400 border-blue-500/30";
}

function activityLabel(item: ProfileActivity): string {
  if (item.type === "agent_created") return "Created agent";
  if (item.type === "agent_launched") return "Launched token";
  return item.isVip ? "VIP message" : "Community message";
}

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet } = use(params);
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [agentQuery, setAgentQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState<AgentFilter>("all");
  const [copiedWallet, setCopiedWallet] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      try {
        const res = await fetch(`/api/profile/${wallet}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Profile not found");
          if (res.status === 400) throw new Error("Invalid wallet address");
          throw new Error("Failed to load profile");
        }
        const json = (await res.json()) as ProfileResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load profile",
          );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  useEffect(() => {
    if (data?.profile.walletAddress) {
      const title = data.profile.twitterUsername
        ? `@${data.profile.twitterUsername} | Agent Inc.`
        : `${truncateWallet(data.profile.walletAddress)} | Agent Inc.`;
      document.title = title;
    }
  }, [data]);

  const filteredAgents = useMemo(() => {
    if (!data) return [];
    const query = agentQuery.trim().toLowerCase();
    return data.agents.filter((agent) => {
      const matchesQuery =
        query.length === 0 ||
        agent.name.toLowerCase().includes(query) ||
        agent.tokenSymbol?.toLowerCase().includes(query);
      const matchesFilter =
        agentFilter === "all" ||
        (agentFilter === "launched" && Boolean(agent.tokenMint)) ||
        (agentFilter === "unlaunched" && !agent.tokenMint);
      return matchesQuery && matchesFilter;
    });
  }, [agentFilter, agentQuery, data]);

  const copyWalletAddress = async () => {
    if (!data?.profile.walletAddress) return;
    try {
      await navigator.clipboard.writeText(data.profile.walletAddress);
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    } catch {
      // Clipboard API may be unavailable in some environments.
    }
  };

  // ── Loading State ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
        <nav className="relative z-20 backdrop-blur-xl bg-[var(--background)]/90 border-b border-white/8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="h-5 w-28 rounded-lg bg-white/10 animate-pulse" />
            <div className="h-8 w-20 rounded-lg bg-white/10 animate-pulse" />
          </div>
        </nav>
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
          {/* Hero skeleton */}
          <div className="rounded-3xl border border-white/10 bg-[#0a0520]/80 overflow-hidden">
            <div className="h-28 sm:h-36 bg-gradient-to-r from-white/5 to-white/[0.02] animate-pulse" />
            <div className="px-5 sm:px-8 pb-6 sm:pb-8 -mt-10">
              <div className="w-20 h-20 rounded-2xl bg-white/10 animate-pulse mb-4" />
              <div className="h-8 w-48 rounded-xl bg-white/10 animate-pulse mb-3" />
              <div className="h-4 w-64 rounded-lg bg-white/8 animate-pulse" />
            </div>
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/8 bg-[#0a0520]/80 p-4 animate-pulse"
              >
                <div className="h-7 w-12 rounded-lg bg-white/10 mb-2" />
                <div className="h-3 w-20 rounded bg-white/8" />
              </div>
            ))}
          </div>
          {/* Agents skeleton */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/8 bg-[#0a0520]/80 overflow-hidden"
              >
                <div className="aspect-square bg-white/5 animate-pulse" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-white/8 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error / Not Found ──────────────────────────────────────────────────────
  if (!data || error) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col">
        <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
        <nav className="relative z-20 backdrop-blur-xl bg-[var(--background)]/90 border-b border-white/8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <Link href="/">
              <Image
                src="/agentinc.png"
                alt="Agent Inc."
                width={150}
                height={38}
                className="h-5 w-auto"
              />
            </Link>
            <LoginButton compact />
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 flex items-center justify-center">
              <User className="w-10 h-10 text-white/25" />
            </div>
            <h1 className="text-2xl font-bold font-display mb-3">
              {error || "Profile not found"}
            </h1>
            <p className="text-white/45 mb-8 leading-relaxed">
              This wallet address doesn&apos;t have a public profile on Agent
              Inc. yet.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#6FEC06]/10 border border-[#6FEC06]/30 text-[#6FEC06] font-medium hover:bg-[#6FEC06]/20 transition-all duration-200"
            >
              Back to Home
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const avatarGradient = getAvatarGradient(data.profile.walletAddress);
  const avatarInitials = getAvatarInitials(
    data.profile.twitterUsername,
    data.profile.walletAddress,
  );
  const launchedCount = data.agents.filter((a) => Boolean(a.tokenMint)).length;

  // ── Main Page ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-[#6FEC06]/[0.03] via-transparent to-transparent pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-20 backdrop-blur-xl bg-[var(--background)]/90 border-b border-white/8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="group">
            <Image
              src="/agentinc.png"
              alt="Agent Inc."
              width={150}
              height={38}
              className="h-5 w-auto transition-transform group-hover:scale-[1.02]"
            />
          </Link>
          <LoginButton compact />
        </div>
      </nav>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-8">
        {/* ── Hero Card ─────────────────────────────────────────────────────── */}
        <section className="rounded-3xl border border-white/10 bg-[#0a0520]/90 overflow-hidden shadow-2xl shadow-black/30">
          {/* Banner */}
          <div
            className={`h-28 sm:h-40 bg-gradient-to-br ${avatarGradient} opacity-15`}
          />
          <div
            className={`h-28 sm:h-40 bg-gradient-to-r from-[#0a0520] via-transparent to-[#0a0520] -mt-28 sm:-mt-40`}
          />

          <div className="px-5 sm:px-8 pb-6 sm:pb-8 -mt-14 sm:-mt-20 relative">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 sm:gap-6">
              <div className="flex items-end gap-4">
                <div
                  className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center border-4 border-[#0a0520] shadow-xl shrink-0`}
                >
                  <span className="text-2xl sm:text-3xl font-black text-black/80 select-none">
                    {avatarInitials}
                  </span>
                  {data.profile.isActiveWallet && (
                    <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#6FEC06] border-2 border-[#0a0520] flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-black" />
                    </div>
                  )}
                </div>

                <div className="pb-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#6FEC06]/25 bg-[#6FEC06]/8 text-[#6FEC06] text-[10px] font-semibold uppercase tracking-widest">
                      <Shield className="w-3 h-3" />
                      Public Profile
                    </div>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black font-display leading-tight truncate max-w-xs sm:max-w-sm">
                    {data.profile.twitterUsername
                      ? `@${data.profile.twitterUsername}`
                      : truncateWallet(data.profile.walletAddress)}
                  </h1>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap pb-1">
                <button
                  onClick={copyWalletAddress}
                  className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/65 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-sm"
                >
                  {copiedWallet ? (
                    <Check className="w-4 h-4 text-[#6FEC06]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">
                    {copiedWallet
                      ? "Copied!"
                      : truncateWallet(data.profile.walletAddress)}
                  </span>
                  <span className="sm:hidden">
                    {copiedWallet ? "Copied!" : "Copy"}
                  </span>
                </button>
                <a
                  href={getSolscanUrl("account", data.profile.walletAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/65 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">Solscan</span>
                </a>
              </div>
            </div>

            {/* Meta info row */}
            <div className="flex flex-wrap items-center gap-4 mt-5 text-sm text-white/45">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-white/30" />
                Joined {formatDate(data.profile.userSince)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-white/30" />
                {data.profile.walletsCount} wallet
                {data.profile.walletsCount !== 1 ? "s" : ""}
              </span>
              {launchedCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-[#6FEC06]/70">
                  <Rocket className="w-3.5 h-3.5" />
                  {launchedCount} token{launchedCount !== 1 ? "s" : ""} launched
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            {
              value: data.stats.totalAgents,
              label: "Total Agents",
              icon: Bot,
              color: "text-blue-400",
              bg: "bg-blue-500/10",
              border: "hover:border-blue-500/30",
            },
            {
              value: data.stats.publicAgents,
              label: "Public Agents",
              icon: User,
              color: "text-[#6FEC06]",
              bg: "bg-[#6FEC06]/8",
              border: "hover:border-[#6FEC06]/30",
            },
            {
              value: data.stats.mintedAgents,
              label: "Minted",
              icon: Sparkles,
              color: "text-purple-400",
              bg: "bg-purple-500/10",
              border: "hover:border-purple-500/30",
            },
            {
              value: data.stats.chatSessions,
              label: "Chat Sessions",
              icon: MessageSquare,
              color: "text-cyan-400",
              bg: "bg-cyan-500/10",
              border: "hover:border-cyan-500/30",
            },
            {
              value: data.stats.totalCommunityMessages,
              label: "Community Msgs",
              icon: Hash,
              color: "text-amber-400",
              bg: "bg-amber-500/10",
              border: "hover:border-amber-500/30",
            },
          ].map(({ value, label, icon: Icon, color, bg, border }) => (
            <div
              key={label}
              className={`rounded-2xl border border-white/8 bg-[#0a0520]/80 p-4 transition-all duration-200 ${border} group`}
            >
              <div className="flex items-start justify-between mb-2">
                <div
                  className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center`}
                >
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/30 transition-colors" />
              </div>
              <div className="text-2xl font-black tabular-nums">{value}</div>
              <div className="text-[11px] text-white/40 mt-0.5 font-medium uppercase tracking-wide">
                {label}
              </div>
            </div>
          ))}
        </section>

        {/* ── Agents + Activity two-col on lg ───────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Agents Section */}
          <section className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-display flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#6FEC06]" />
                  Public Agents
                </h2>
                <p className="text-white/35 text-xs mt-0.5">
                  {data.agents.length} agent
                  {data.agents.length !== 1 ? "s" : ""} published
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="w-3.5 h-3.5 text-white/25 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={agentQuery}
                    onChange={(e) => setAgentQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full sm:w-44 pl-8 pr-3 py-2 rounded-xl bg-[#0a0520] border border-white/8 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-[#6FEC06]/35 focus:ring-1 focus:ring-[#6FEC06]/15 transition-all"
                  />
                </div>
                <div className="inline-flex items-center rounded-xl border border-white/8 bg-[#0a0520] p-1 shrink-0">
                  {(["all", "launched", "unlaunched"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setAgentFilter(f)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all capitalize ${
                        agentFilter === f
                          ? "bg-[#6FEC06]/15 text-[#6FEC06]"
                          : "text-white/45 hover:text-white/80"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {data.agents.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-[#0a0520]/80 p-12 text-center">
                <Bot className="w-10 h-10 text-white/15 mx-auto mb-3" />
                <p className="text-white/35 text-sm">No public agents yet.</p>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-[#0a0520]/80 p-10 text-center">
                <Search className="w-8 h-8 text-white/15 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-white/70 mb-1">
                  No matches
                </h3>
                <p className="text-white/35 text-xs">
                  Try a different search or filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filteredAgents.map((agent) => {
                  const rarityStyle = getRarityBadgeStyle(agent.rarity);
                  return (
                    <Link
                      key={agent.id}
                      href={`/agent/${agent.tokenMint || agent.id}`}
                      className="group relative rounded-2xl border border-white/8 bg-[#0a0520]/80 overflow-hidden hover:border-white/20 hover:shadow-lg hover:shadow-black/30 transition-all duration-200 hover:-translate-y-0.5"
                    >
                      {/* Image */}
                      <div className="relative aspect-square bg-[#0d0630] overflow-hidden">
                        {agent.imageUrl ? (
                          <Image
                            src={agent.imageUrl}
                            alt={agent.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-400"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Bot className="w-10 h-10 text-white/15" />
                          </div>
                        )}

                        {/* Bottom gradient overlay */}
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent" />

                        {/* Rarity badge */}
                        {agent.rarity && (
                          <div
                            className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider border backdrop-blur-sm ${rarityStyle.bg} ${rarityStyle.text} ${rarityStyle.border}`}
                          >
                            {agent.rarity}
                          </div>
                        )}

                        {/* Live indicator */}
                        {agent.launchedAt && (
                          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#6FEC06]/20 border border-[#6FEC06]/40 backdrop-blur-sm">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6FEC06] opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#6FEC06]" />
                            </span>
                            <span className="text-[#6FEC06] text-[9px] font-bold uppercase tracking-wider">
                              live
                            </span>
                          </div>
                        )}

                        {/* Token symbol overlay at bottom */}
                        {agent.tokenSymbol && (
                          <div className="absolute bottom-2 left-2 text-[10px] font-bold text-white/80">
                            ${agent.tokenSymbol}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <div className="text-sm font-semibold truncate leading-tight">
                          {agent.name}
                        </div>
                        <div className="text-[11px] text-white/40 mt-0.5">
                          {agent.tokenSymbol
                            ? `$${agent.tokenSymbol}`
                            : "Unlaunched"}
                        </div>
                      </div>

                      {/* Hover arrow */}
                      <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/50 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-0.5 group-hover:translate-y-0 backdrop-blur-sm pointer-events-none">
                        <ArrowUpRight className="w-3.5 h-3.5 text-white/80" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Activity Feed */}
          <section className="w-full lg:w-80 xl:w-96 shrink-0">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-display flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  Activity
                </h2>
                <p className="text-white/35 text-xs mt-0.5">
                  Recent {Math.min(40, data.activity.length)} events
                </p>
              </div>
            </div>

            {data.activity.length === 0 ? (
              <div className="rounded-2xl border border-white/8 bg-[#0a0520]/80 p-10 text-center">
                <Activity className="w-8 h-8 text-white/15 mx-auto mb-3" />
                <p className="text-white/35 text-sm">No activity yet.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/8 bg-[#0a0520]/80 overflow-hidden">
                <div className="divide-y divide-white/5">
                  {data.activity.slice(0, 40).map((item, idx) => {
                    const iconColors = activityColors(item.type, item.isVip);
                    return (
                      <div
                        key={`${item.type}-${item.createdAt}-${idx}`}
                        className="p-3.5 hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          {/* Agent thumbnail or icon */}
                          <div className="shrink-0 mt-0.5">
                            {item.agentImageUrl ? (
                              <div className="w-8 h-8 rounded-xl overflow-hidden border border-white/10 relative">
                                <Image
                                  src={item.agentImageUrl}
                                  alt={item.agentName || ""}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div
                                className={`w-8 h-8 rounded-xl border flex items-center justify-center ${iconColors}`}
                              >
                                {activityIcon(item.type, item.isVip)}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${iconColors}`}
                                  >
                                    {activityIcon(item.type, item.isVip)}
                                    {activityLabel(item)}
                                  </span>
                                </div>
                                {item.agentName && (
                                  <Link
                                    href={`/agent/${item.tokenMint || item.agentId}`}
                                    className="text-xs text-white/70 hover:text-white mt-1 block truncate transition-colors"
                                  >
                                    {item.agentName}
                                    {item.tokenSymbol &&
                                      ` · $${item.tokenSymbol}`}
                                  </Link>
                                )}
                                {item.content && (
                                  <p className="text-xs text-white/45 mt-1 line-clamp-2 leading-relaxed">
                                    {item.content}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-[10px] text-white/25 mt-1.5">
                              {formatRelative(item.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
