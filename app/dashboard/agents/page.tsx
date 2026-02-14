"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  Bot,
  Plus,
  MessageSquare,
  Trash2,
  Globe,
  Lock,
  Sparkles,
  Zap,
  User,
  Download,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { PersonalityBadge } from "@/components/ui/PersonalityRadar";
import { type PersonalityScores } from "@/lib/agentTraits";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  imageUrl: string | null;
  rarity: string | null;
  personality: string | null;
  personalityScores: PersonalityScores | null;
  isMinted: boolean;
  tokenMint: string | null;
  tokenSymbol: string | null;
  createdAt: string;
  updatedAt: string;
}

import { RARITY_DETAIL_STYLES } from "@/lib/utils/rarity";

const rarityColors = RARITY_DETAIL_STYLES as Record<
  string,
  { border: string; bg: string; text: string; glow: string }
>;

export default function AgentsPage() {
  const { authFetch, identityToken } = useAuth();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!identityToken) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await authFetch("/api/agents");

      if (!response.ok) {
        throw new Error("Failed to fetch agents");
      }

      const data = await response.json();
      setAgents(data.agents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setIsLoading(false);
    }
  }, [identityToken, authFetch]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleDelete = async (agentId: string, agentName: string) => {
    if (!confirm(`Are you sure you want to delete "${agentName}"?`)) {
      return;
    }

    if (!identityToken) return;

    setDeletingId(agentId);

    try {
      const response = await authFetch(`/api/agents/${agentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete agent");
      }

      setAgents(agents.filter((a) => a.id !== agentId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete agent");
    } finally {
      setDeletingId(null);
    }
  };

  const getRarityStyle = (rarity: string | null) => {
    return rarityColors[rarity || "common"] || rarityColors.common;
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#6FEC06]/30 bg-[#6FEC06]/10 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#6FEC06]" />
            <span className="text-xs font-medium text-[#6FEC06]">
              Your Collection
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 font-display">
            Your <span className="gradient-text-shimmer">AI Agents</span>
          </h1>
          <p className="text-white/50 text-lg">
            Create and manage your custom AI assistants
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard/agents/import"
            className="group inline-flex items-center gap-2 px-6 py-3.5 bg-white/5 border border-white/10 rounded-full text-white font-semibold hover:bg-white/10 hover:border-white/20 transition-all"
          >
            <Download className="w-5 h-5" />
            Import Agent
          </Link>
          <Link
            href="/dashboard/mint"
            className="group inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-full text-black font-semibold hover:opacity-90 transition-all shadow-lg shadow-[#6FEC06]/25 hover:shadow-[#6FEC06]/40"
          >
            <Plus className="w-5 h-5" />
            Mint Agent
            <Zap className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all" />
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mb-8 backdrop-blur-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-2 border-[#6FEC06]/30 border-t-[#6FEC06] rounded-full animate-spin mb-4" />
          <p className="text-white/40 text-sm">Loading your agents...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && agents.length === 0 && (
        <div className="text-center py-20">
          <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-[#120557] to-[#6FEC06]/20 flex items-center justify-center border border-[#6FEC06]/30 shadow-lg shadow-[#6FEC06]/10">
            <Bot className="w-12 h-12 text-[#6FEC06]" />
          </div>
          <h2 className="text-2xl font-bold mb-3 font-display">
            No agents yet
          </h2>
          <p className="text-white/50 mb-8 max-w-md mx-auto text-lg">
            Mint a new agent or import an existing one from Bags.fm
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard/mint"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-full text-black font-semibold hover:opacity-90 transition-all shadow-lg shadow-[#6FEC06]/25"
            >
              <Plus className="w-5 h-5" />
              Mint Agent
            </Link>
            <Link
              href="/dashboard/agents/import"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 rounded-full text-white hover:bg-white/10 transition-all"
            >
              <Download className="w-5 h-5" />
              Import from Bags
            </Link>
          </div>
        </div>
      )}

      {/* Agents grid */}
      {!isLoading && agents.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent, index) => {
            const rarityStyle = getRarityStyle(agent.rarity);
            return (
              <div
                key={agent.id}
                className={`group relative rounded-2xl bg-[#0a0520] border ${rarityStyle.border} transition-all duration-300 overflow-hidden card-hover ${rarityStyle.glow} hover:${rarityStyle.glow.replace("shadow-", "shadow-")} hover:-translate-y-0.5 flex flex-col`}
                style={{
                  animationDelay: `${index * 50}ms`,
                  ...(agent.rarity && agent.rarity !== "common"
                    ? {
                        boxShadow:
                          "0 0 20px " +
                          (agent.rarity === "legendary"
                            ? "rgba(255,215,0,0.15)"
                            : agent.rarity === "epic"
                              ? "rgba(168,85,247,0.15)"
                              : agent.rarity === "rare"
                                ? "rgba(59,130,246,0.15)"
                                : "rgba(111,236,6,0.15)"),
                      }
                    : {}),
                }}
                onMouseEnter={(e) => {
                  if (agent.rarity && agent.rarity !== "common") {
                    e.currentTarget.style.boxShadow =
                      "0 0 30px " +
                      (agent.rarity === "legendary"
                        ? "rgba(255,215,0,0.35)"
                        : agent.rarity === "epic"
                          ? "rgba(168,85,247,0.35)"
                          : agent.rarity === "rare"
                            ? "rgba(59,130,246,0.35)"
                            : "rgba(111,236,6,0.35)");
                  }
                }}
                onMouseLeave={(e) => {
                  if (agent.rarity && agent.rarity !== "common") {
                    e.currentTarget.style.boxShadow =
                      "0 0 20px " +
                      (agent.rarity === "legendary"
                        ? "rgba(255,215,0,0.15)"
                        : agent.rarity === "epic"
                          ? "rgba(168,85,247,0.15)"
                          : agent.rarity === "rare"
                            ? "rgba(59,130,246,0.15)"
                            : "rgba(111,236,6,0.15)");
                  }
                }}
              >
                {/* Agent Image */}
                <div className="relative aspect-square bg-gradient-to-br from-[#120557]/50 to-[#000028] overflow-hidden flex-shrink-0 rounded-t-2xl">
                  {agent.imageUrl ? (
                    <Image
                      src={agent.imageUrl}
                      alt={agent.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500 rounded-t-2xl"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#6FEC06]/20 to-[#120557]/50 flex items-center justify-center border border-[#6FEC06]/20">
                        <Bot className="w-10 h-10 text-[#6FEC06]/60" />
                      </div>
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0520] via-transparent to-transparent" />

                  {/* Top badges row */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    {/* Token badge */}
                    {agent.isMinted && agent.tokenSymbol && (
                      <div className="px-2.5 py-1 rounded-full bg-[#6FEC06]/20 text-[#6FEC06] text-xs font-semibold backdrop-blur-sm border border-[#6FEC06]/30">
                        ${agent.tokenSymbol}
                      </div>
                    )}

                    <div className="flex-1" />

                    {/* Rarity badge */}
                    {agent.rarity && agent.rarity !== "common" && (
                      <div
                        className={`px-2.5 py-1 rounded-full ${rarityStyle.bg} ${rarityStyle.text} text-xs font-semibold uppercase tracking-wider backdrop-blur-sm border ${rarityStyle.border}`}
                      >
                        {agent.rarity}
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(agent.id, agent.name)}
                    disabled={deletingId === agent.id}
                    className="absolute bottom-3 right-3 p-2 text-white/60 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm bg-black/30"
                    title="Delete agent"
                  >
                    {deletingId === agent.id ? (
                      <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Content - grows to fill space */}
                <div className="p-4 flex flex-col flex-1">
                  {/* Top content */}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg truncate font-display mb-1.5">
                      {agent.name}
                    </h3>

                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={`flex items-center gap-1 text-xs ${agent.isPublic ? "text-[#6FEC06]" : "text-white/40"}`}
                      >
                        {agent.isPublic ? (
                          <>
                            <Globe className="w-3 h-3" />
                            Public
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" />
                            Private
                          </>
                        )}
                      </span>
                      {agent.personalityScores && (
                        <>
                          <span className="text-white/20">·</span>
                          <PersonalityBadge scores={agent.personalityScores} />
                        </>
                      )}
                    </div>

                    {agent.description && (
                      <p className="text-white/50 text-sm line-clamp-2 mb-3">
                        {agent.description}
                      </p>
                    )}

                    <p className="text-xs text-white/30">
                      Created{" "}
                      {new Date(agent.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Action buttons - always at bottom */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                    <Link
                      href={`/agent/${agent.tokenMint || agent.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white/70 text-sm font-medium hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>
                    <Link
                      href={`/dashboard/chat?agent=${agent.tokenMint || agent.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#6FEC06]/10 border border-[#6FEC06]/30 rounded-xl text-[#6FEC06] text-sm font-medium hover:bg-[#6FEC06]/20 hover:border-[#6FEC06]/50 transition-all"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Chat
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
