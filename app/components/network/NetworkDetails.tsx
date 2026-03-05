"use client";

import { useState } from "react";
import Image from "next/image";
import {
  X,
  ShieldCheck,
  ExternalLink,
  Copy,
  Star,
  Activity,
  AlertTriangle,
  Gauge,
  CheckCircle2,
  XCircle,
  Minus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { NetworkCollection, NetworkAgent } from "@/lib/network/types";
import {
  TRUST_TIER_NAMES,
  TRUST_TIER_CSS,
  getCollectionCssColor,
} from "@/lib/network/types";

const panelVariants = {
  hidden: { opacity: 0, x: 40, scale: 0.98 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  exit: {
    opacity: 0,
    x: 40,
    scale: 0.98,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

interface Props {
  collection: NetworkCollection | null;
  agent: NetworkAgent | null;
  onClose: () => void;
}

function truncate(s: string, n = 8): string {
  if (s.length <= n * 2 + 3) return s;
  return `${s.slice(0, n)}...${s.slice(-n)}`;
}

function copyText(text: string) {
  navigator.clipboard.writeText(text);
}

function safeHostname(url: string): string {
  if (!url) return "—";
  try {
    return new URL(url).hostname;
  } catch {
    return url.length > 24 ? url.slice(0, 24) + "..." : url;
  }
}

const CORS_SAFE_HOSTS = [
  ".blob.vercel-storage.com",
  "ipfs.io",
  "arweave.net",
  "nftstorage.link",
  "cloudflare-ipfs.com",
];

function resolveImageSrc(url: string | null | undefined): string | null {
  if (!url || url.trim() === "") return null;
  if (/example|placeholder|test|dummy/i.test(url)) return null;
  if (url.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${url.slice(7)}`;
  if (url.startsWith("ar://")) return `https://arweave.net/${url.slice(5)}`;
  if (url.startsWith("data:") || url.startsWith("/")) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const u = new URL(url);
      if (typeof window !== "undefined" && u.origin === window.location.origin)
        return url;
      const h = u.hostname;
      if (CORS_SAFE_HOSTS.some((s) => h === s || h.endsWith(s))) return url;
    } catch {
      /* fall through */
    }
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return null;
}

function Avatar({
  src,
  fallback,
  color,
  size = 48,
  rounded = "rounded-xl",
}: {
  src: string | null;
  fallback: React.ReactNode;
  color: string;
  size?: number;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveImageSrc(src);

  if (!resolved || failed) {
    return (
      <div
        className={`${rounded} flex items-center justify-center text-lg font-bold shrink-0`}
        style={{
          width: size,
          height: size,
          backgroundColor: color + "30",
          color,
        }}
      >
        {fallback}
      </div>
    );
  }

  return (
    <div
      className={`${rounded} overflow-hidden shrink-0 relative`}
      style={{ width: size, height: size }}
    >
      <Image
        src={resolved}
        alt=""
        fill
        className="object-cover"
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  );
}

// ── Collection Panel ─────────────────────────────────────────────────────────

function CollectionPanel({
  coll,
  onClose,
}: {
  coll: NetworkCollection;
  onClose: () => void;
}) {
  const color = getCollectionCssColor(coll.name, coll.isOwn);
  const tierCounts: Record<number, number> = {};
  for (const a of coll.agents) {
    tierCounts[a.trustTier] = (tierCounts[a.trustTier] || 0) + 1;
  }

  return (
    <motion.div
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed top-[88px] right-4 w-80 bg-[#0a1120]/90 backdrop-blur-2xl border border-white/[0.07] rounded-2xl p-5 shadow-[0_16px_48px_rgba(0,0,0,0.5)] z-40 overflow-y-auto max-h-[calc(100vh-120px)]"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar
            src={coll.isOwn ? "/agentinc.jpg" : coll.image}
            fallback={coll.isOwn ? "🏠" : coll.symbol || coll.name[0]}
            color={color}
          />
          <div>
            <h3 className="font-bold text-white text-sm">{coll.name}</h3>
            {coll.symbol && (
              <span className="text-xs text-gray-500">{coll.symbol}</span>
            )}
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.06)" }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </motion.button>
      </div>

      {coll.description && (
        <p className="text-xs text-gray-400 mb-4 leading-relaxed">
          {coll.description}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-2.5 bg-gray-800/50 rounded-lg text-center">
          <div className="text-lg font-bold text-white">{coll.agentCount}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">
            Agents
          </div>
        </div>
        <div className="p-2.5 bg-gray-800/50 rounded-lg text-center">
          <div className="text-lg font-bold" style={{ color }}>
            {coll.agents.reduce((s, a) => s + a.feedbackCount, 0)}
          </div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">
            Feedbacks
          </div>
        </div>
      </div>

      {/* Trust tier breakdown */}
      {Object.keys(tierCounts).length > 0 && (
        <div className="mb-4">
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Trust Tiers
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(tierCounts)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([tier, count]) => {
                const t = Number(tier);
                const css = TRUST_TIER_CSS[t] || TRUST_TIER_CSS[0];
                return (
                  <span
                    key={tier}
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${css.bg} ${css.text}`}
                  >
                    {TRUST_TIER_NAMES[t]} ({count})
                  </span>
                );
              })}
          </div>
        </div>
      )}

      {/* Links */}
      <div className="space-y-1.5 pt-3 border-t border-gray-800">
        {coll.website && (
          <a
            href={coll.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {coll.website.replace(/^https?:\/\//, "")}
          </a>
        )}
        {coll.twitter && (
          <a
            href={coll.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {coll.twitter.replace("https://x.com/", "@")}
          </a>
        )}
        <button
          onClick={() => copyText(coll.id)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          {truncate(coll.id, 10)}
        </button>
      </div>

      {/* Top agents */}
      {coll.agents.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-800">
          <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Top Agents
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {[...coll.agents]
              .sort((a, b) => b.qualityScore - a.qualityScore)
              .slice(0, 8)
              .map((a) => {
                const css = TRUST_TIER_CSS[a.trustTier] || TRUST_TIER_CSS[0];
                return (
                  <div
                    key={a.asset}
                    className="flex items-center gap-2 text-xs"
                  >
                    <Avatar
                      src={a.image}
                      fallback={(a.name || "?")[0]}
                      color={
                        css.text.includes("violet") ? "#a78bfa" : "#6b7280"
                      }
                      size={24}
                      rounded="rounded-full"
                    />
                    <span className="text-gray-300 truncate flex-1 min-w-0">
                      {a.name || truncate(a.asset)}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] shrink-0 ${css.bg} ${css.text}`}
                    >
                      {TRUST_TIER_NAMES[a.trustTier]}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Agent Panel ──────────────────────────────────────────────────────────────

function AgentPanel({
  agent,
  onClose,
}: {
  agent: NetworkAgent;
  onClose: () => void;
}) {
  const tierCss = TRUST_TIER_CSS[agent.trustTier] || TRUST_TIER_CSS[0];

  return (
    <motion.div
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed top-[88px] right-4 w-80 bg-[#0a1120]/90 backdrop-blur-2xl border border-white/[0.07] rounded-2xl p-5 shadow-[0_16px_48px_rgba(0,0,0,0.5)] z-40 overflow-y-auto max-h-[calc(100vh-120px)]"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar
            src={agent.image}
            fallback={<ShieldCheck className="w-6 h-6 text-gray-300" />}
            color={
              tierCss.text.includes("violet")
                ? "#a78bfa"
                : tierCss.text.includes("yellow")
                  ? "#eab308"
                  : tierCss.text.includes("slate")
                    ? "#94a3b8"
                    : tierCss.text.includes("amber")
                      ? "#cd7f32"
                      : "#6b7280"
            }
            rounded="rounded-full"
          />
          <div>
            <h3 className="font-bold text-white text-sm">
              {agent.name || "Agent"}
            </h3>
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${tierCss.bg} ${tierCss.text}`}
            >
              <Star className="w-3 h-3" />
              {TRUST_TIER_NAMES[agent.trustTier]}
            </span>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.06)" }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </motion.button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <Stat
          icon={<Gauge className="w-3.5 h-3.5" />}
          label="Quality"
          value={`${Math.round(agent.qualityScore)}%`}
          color="text-emerald-400"
        />
        <Stat
          icon={<Activity className="w-3.5 h-3.5" />}
          label="Feedbacks"
          value={String(agent.feedbackCount)}
          color="text-cyan-400"
        />
        <Stat
          icon={<ShieldCheck className="w-3.5 h-3.5" />}
          label="Confidence"
          value={`${Math.round(agent.confidence)}%`}
          color="text-violet-400"
        />
        <Stat
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          label="Risk"
          value={`${Math.round(agent.riskScore)}%`}
          color="text-amber-400"
        />
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {agent.atomEnabled && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400">
            ATOM
          </span>
        )}
        <span className="text-xs text-gray-500">
          Diversity: {Math.round(agent.diversityRatio * 100)}%
        </span>
      </div>

      {/* Slop or Not — Verification */}
      <VerificationPanel verification={agent.verification ?? null} />

      {/* Links */}
      <div className="space-y-1.5 pt-3 border-t border-gray-800">
        <a
          href={`https://8004market.io/agent/solana/mainnet-beta/${agent.agentId ?? agent.asset}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View on 8004market
        </a>
        <a
          href={`https://solscan.io/account/${agent.asset}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View on Solscan
        </a>
        {agent.uri && (
          <a
            href={agent.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Metadata
          </a>
        )}
        <button
          onClick={() => copyText(agent.asset)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          {truncate(agent.asset, 10)}
        </button>
        <div className="text-[10px] text-gray-600 pt-1">
          Registered {new Date(agent.createdAt).toLocaleDateString()}
        </div>
      </div>
    </motion.div>
  );
}

// ── Verification Panel ────────────────────────────────────────────────────────

function VerificationPanel({
  verification,
}: {
  verification: NetworkAgent["verification"] | null;
}) {
  const statusConfig = {
    verified: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      label: "Verified",
    },
    partial: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      text: "text-yellow-400",
      label: "Partially Verified",
    },
    unverified: {
      bg: "bg-gray-500/10",
      border: "border-gray-500/30",
      text: "text-gray-400",
      label: "Unverified",
    },
  };

  if (!verification) {
    return (
      <div className="mb-4 p-3 rounded-xl border bg-gray-500/5 border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-400">
              Slop or Not
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-500/10 text-gray-500">
            Pending
          </span>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5">
          Verification not yet run for this agent
        </p>
      </div>
    );
  }

  const cfg = statusConfig[verification.status];
  const ago = timeAgo(verification.verifiedAt);

  return (
    <div className={`mb-4 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className={`w-4 h-4 ${cfg.text}`} />
          <span className="text-xs font-semibold text-white">Slop or Not</span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}
        >
          {cfg.label}
        </span>
      </div>

      {/* Check list */}
      <div className="space-y-1.5">
        {verification.checks.map((check) => {
          const hasServiceBreakdown =
            check.name === "Service Liveness" &&
            check.serviceResults &&
            check.serviceResults.length > 0;

          return (
            <div key={check.name}>
              <div className="flex items-center gap-2">
                {check.skipped ? (
                  <Minus className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                ) : check.passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                )}
                <span className="text-xs text-gray-300 flex-1 min-w-0 truncate">
                  {check.name}
                </span>
                {check.latencyMs != null && (
                  <span className="text-[10px] text-gray-600 shrink-0">
                    {check.latencyMs}ms
                  </span>
                )}
              </div>

              {/* Per-service breakdown for liveness */}
              {hasServiceBreakdown && (
                <div className="ml-5 mt-1 space-y-0.5">
                  {check.serviceResults!.map((svc, i) => (
                    <div
                      key={`${svc.endpoint}-${i}`}
                      className="flex items-center gap-1.5"
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          svc.skipped
                            ? "bg-gray-600"
                            : svc.ok
                              ? "bg-emerald-400"
                              : "bg-red-400"
                        }`}
                      />
                      <span className="text-[10px] text-gray-500 uppercase shrink-0">
                        {svc.type}
                      </span>
                      <span className="text-[10px] text-gray-600 truncate flex-1 min-w-0">
                        {safeHostname(svc.endpoint)}
                      </span>
                      {svc.latencyMs != null && (
                        <span className="text-[10px] text-gray-600 shrink-0">
                          {svc.latencyMs}ms
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-800/50">
        <span className="text-[10px] text-gray-500">
          {verification.score}/{verification.maxScore} passed
        </span>
        <span className="text-[10px] text-gray-600">{ago}</span>
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="p-2.5 bg-gray-800/50 rounded-lg">
      <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-gray-500">
          {label}
        </span>
      </div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function NetworkDetails({ collection, agent, onClose }: Props) {
  return (
    <AnimatePresence mode="wait">
      {agent ? (
        <AgentPanel
          key={`agent-${agent.asset}`}
          agent={agent}
          onClose={onClose}
        />
      ) : collection ? (
        <CollectionPanel
          key={`coll-${collection.id}`}
          coll={collection}
          onClose={onClose}
        />
      ) : null}
    </AnimatePresence>
  );
}
