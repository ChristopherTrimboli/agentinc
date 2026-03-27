"use client";

import { useState, useEffect } from "react";
import {
  Gem,
  Trophy,
  Award,
  Medal,
  Copy,
  Check,
  ExternalLink,
  Users,
  Coins,
  TrendingUp,
  RefreshCw,
  Timer,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  REVENUE_SHARE_TIERS,
  type RevShareTierName,
} from "@/lib/revenue/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HolderRow {
  rank: number;
  wallet: string;
  balance: number;
  tier: RevShareTierName;
  multiplier: number;
  totalEarnedSol: number;
  payoutCount: number;
}

interface Props {
  rows: HolderRow[];
  pendingPoolSol: number;
  totalDistributedSol: number;
  holderCount: number;
}

// ── Tier Config ───────────────────────────────────────────────────────────────

const TIER_STYLE = {
  Diamond: {
    Icon: Gem,
    iconColor: "text-cyan-400",
    badgeBg: "bg-cyan-400/10 border-cyan-400/30 text-cyan-400",
    glow: "shadow-[0_0_12px_rgba(34,211,238,0.3)]",
  },
  Gold: {
    Icon: Trophy,
    iconColor: "text-amber-400",
    badgeBg: "bg-amber-400/10 border-amber-400/30 text-amber-400",
    glow: "shadow-[0_0_12px_rgba(251,191,36,0.3)]",
  },
  Silver: {
    Icon: Award,
    iconColor: "text-slate-400",
    badgeBg: "bg-slate-400/10 border-slate-400/30 text-slate-400",
    glow: "",
  },
  Bronze: {
    Icon: Medal,
    iconColor: "text-orange-500",
    badgeBg: "bg-orange-500/10 border-orange-500/30 text-orange-500",
    glow: "",
  },
} satisfies Record<RevShareTierName, object>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncateWallet(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function formatBalance(balance: number): string {
  if (balance >= 1_000_000_000)
    return `${(balance / 1_000_000_000).toFixed(2)}B`;
  if (balance >= 1_000_000) return `${(balance / 1_000_000).toFixed(2)}M`;
  if (balance >= 1_000) return `${(balance / 1_000).toFixed(1)}K`;
  return balance.toFixed(0);
}

function formatSol(sol: number): string {
  if (sol === 0) return "—";
  if (sol >= 1) return `${sol.toFixed(4)} SOL`;
  return `${sol.toFixed(6)} SOL`;
}

// ── Countdown Hook ────────────────────────────────────────────────────────────

const CYCLE_MS = 5 * 60 * 1000;

function msToNext5Min(): number {
  const now = Date.now();
  return CYCLE_MS - (now % CYCLE_MS);
}

function useCountdown() {
  const [remaining, setRemaining] = useState(msToNext5Min);

  useEffect(() => {
    const id = setInterval(() => setRemaining(msToNext5Min()), 1000);
    return () => clearInterval(id);
  }, []);

  const totalSec = Math.ceil(remaining / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const pct = ((CYCLE_MS - remaining) / CYCLE_MS) * 100;

  return { min, sec, pct };
}

// ── Countdown Card ────────────────────────────────────────────────────────────

function CountdownCard() {
  const { min, sec, pct } = useCountdown();

  return (
    <div className="relative bg-[#060320]/80 border border-amber-500/20 rounded-2xl p-5 flex flex-col gap-3 overflow-hidden">
      {/* Progress bar background */}
      <div
        className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-amber-500/60 to-[#6FEC06]/60 transition-all duration-1000 ease-linear"
        style={{ width: `${pct}%` }}
      />
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Timer className="w-4 h-4 text-amber-400" />
        Next Payout
      </div>
      <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums tracking-wider">
        {min}:{sec.toString().padStart(2, "0")}
      </div>
      <div className="text-xs text-gray-600">
        Distribution cycles run ~every 5 min
      </div>
    </div>
  );
}

// ── Animated Wrapper ──────────────────────────────────────────────────────────

function AnimateIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={`animate-[fadeInUp_0.5s_ease-out_both] ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ── Copy Button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 p-1 rounded text-white/30 hover:text-white/70 transition-colors"
      aria-label="Copy wallet address"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-[#6FEC06]" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-[#060320]/80 border border-white/[0.06] rounded-2xl p-5 flex flex-col gap-3 hover:border-white/[0.12] transition-colors duration-300">
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <Icon className={`w-4 h-4 ${accent ?? "text-gray-500"}`} />
        {label}
      </div>
      <div className={`text-2xl font-bold ${accent ?? "text-white"}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-600">{sub}</div>}
    </div>
  );
}

// ── Tier Legend ───────────────────────────────────────────────────────────────

function TierLegend() {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {REVENUE_SHARE_TIERS.map((tier) => {
        const style = TIER_STYLE[tier.name];
        return (
          <div
            key={tier.name}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${style.badgeBg} text-sm`}
          >
            <style.Icon className={`w-4 h-4 ${style.iconColor}`} />
            <span className="font-medium">{tier.name}</span>
            <span className="text-white/40 text-xs">
              {(tier.minTokens / 1_000_000).toFixed(0)}M+ · {tier.multiplier}x
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Tier Badge ────────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: RevShareTierName }) {
  const cfg = TIER_STYLE[tier];
  const { Icon, iconColor, badgeBg } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${badgeBg}`}
    >
      <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
      {tier}
    </span>
  );
}

// ── Mobile Card Row ───────────────────────────────────────────────────────────

function MobileRow({ row, index }: { row: HolderRow; index: number }) {
  const cfg = TIER_STYLE[row.tier];
  const { Icon, iconColor, badgeBg, glow } = cfg;

  return (
    <div
      className={`bg-[#060320]/60 border border-white/[0.06] rounded-2xl p-4 transition-colors hover:border-white/[0.12] ${index === 0 ? glow : ""}`}
    >
      {/* Top row: rank + tier + wallet */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-gray-600 text-sm font-mono w-6 text-right">
            #{row.rank}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-medium ${badgeBg}`}
          >
            <Icon className={`w-3 h-3 ${iconColor}`} />
            {row.tier}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={`https://solscan.io/account/${row.wallet}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            {truncateWallet(row.wallet)}
            <ExternalLink className="w-3 h-3 text-gray-600" />
          </a>
          <CopyButton text={row.wallet} />
        </div>
      </div>

      {/* Bottom row: stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[11px] text-gray-600 mb-0.5">Holdings</div>
          <div className="text-sm font-medium text-white">
            {formatBalance(row.balance)}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-gray-600 mb-0.5">Multiplier</div>
          <div
            className={`text-sm font-bold ${TIER_STYLE[row.tier].iconColor}`}
          >
            {row.multiplier}x
          </div>
        </div>
        <div>
          <div className="text-[11px] text-gray-600 mb-0.5">Earned</div>
          <div className="text-sm font-medium text-[#6FEC06]">
            {formatSol(row.totalEarnedSol)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LeaderboardTable({
  rows,
  pendingPoolSol,
  totalDistributedSol,
  holderCount,
}: Props) {
  return (
    <div>
      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AnimateIn delay={100}>
          <StatCard
            icon={Coins}
            label="Pending Pool"
            value={`${pendingPoolSol.toFixed(6)} SOL`}
            sub="Accumulating for next cycle"
            accent="text-violet-400"
          />
        </AnimateIn>
        <AnimateIn delay={200}>
          <StatCard
            icon={TrendingUp}
            label="Total Distributed"
            value={
              totalDistributedSol > 0
                ? `${totalDistributedSol.toFixed(4)} SOL`
                : "—"
            }
            sub="All-time to holders"
            accent="text-[#6FEC06]"
          />
        </AnimateIn>
        <AnimateIn delay={300}>
          <StatCard
            icon={Users}
            label="Active Holders"
            value={holderCount.toString()}
            sub="Wallets holding 5M+ tokens"
            accent="text-cyan-400"
          />
        </AnimateIn>
        <AnimateIn delay={400}>
          <CountdownCard />
        </AnimateIn>
      </div>

      {/* Tier Legend */}
      <AnimateIn delay={500}>
        <TierLegend />
      </AnimateIn>

      {/* Table header row */}
      <AnimateIn delay={550}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            Qualified Holders
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({holderCount})
            </span>
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <RefreshCw className="w-3.5 h-3.5" />
            Snapshot refreshes every 2 min
          </div>
        </div>
      </AnimateIn>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="text-center py-16 bg-[#060320]/60 border border-white/[0.06] rounded-2xl">
          <Coins className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No qualifying holders yet.</p>
          <p className="text-gray-700 text-sm mt-1">
            Hold 5M+ $AGENTINC to appear here.
          </p>
        </div>
      )}

      {/* Desktop Table */}
      {rows.length > 0 && (
        <AnimateIn delay={600}>
          <div className="hidden md:block rounded-2xl border border-white/[0.06] overflow-hidden bg-[#060320]/50">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-gray-500 w-12 text-center">
                      #
                    </TableHead>
                    <TableHead className="text-gray-500">Tier</TableHead>
                    <TableHead className="text-gray-500">Wallet</TableHead>
                    <TableHead className="text-gray-500 text-right">
                      Holdings
                    </TableHead>
                    <TableHead className="text-gray-500 text-center">
                      Mult.
                    </TableHead>
                    <TableHead className="text-gray-500 text-right">
                      Total Earned
                    </TableHead>
                    <TableHead className="text-gray-500 text-center">
                      Payouts
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => {
                    const cfg = TIER_STYLE[row.tier];
                    const isTop3 = i < 3;
                    return (
                      <TableRow
                        key={row.wallet}
                        className={`border-white/[0.04] transition-colors animate-[fadeInUp_0.4s_ease-out_both] ${
                          isTop3
                            ? "hover:bg-white/[0.03]"
                            : "hover:bg-white/[0.02]"
                        }`}
                        style={{ animationDelay: `${650 + Math.min(i, 15) * 30}ms` }}
                      >
                        {/* Rank */}
                        <TableCell className="text-center font-mono text-gray-600 text-sm">
                          {i === 0 ? (
                            <span className="text-amber-400 font-bold">1</span>
                          ) : i === 1 ? (
                            <span className="text-slate-400 font-bold">2</span>
                          ) : i === 2 ? (
                            <span className="text-orange-500 font-bold">3</span>
                          ) : (
                            row.rank
                          )}
                        </TableCell>

                        {/* Tier */}
                        <TableCell>
                          <TierBadge tier={row.tier} />
                        </TableCell>

                        {/* Wallet */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <a
                              href={`https://solscan.io/account/${row.wallet}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-1.5"
                            >
                              {truncateWallet(row.wallet)}
                              <ExternalLink className="w-3 h-3 text-gray-600 hover:text-gray-400" />
                            </a>
                            <CopyButton text={row.wallet} />
                          </div>
                        </TableCell>

                        {/* Holdings */}
                        <TableCell className="text-right font-mono text-sm text-gray-300">
                          {formatBalance(row.balance)}
                          <span className="text-gray-600 text-xs ml-1">
                            AGENTINC
                          </span>
                        </TableCell>

                        {/* Multiplier */}
                        <TableCell className="text-center">
                          <span
                            className={`font-bold text-sm ${cfg.iconColor}`}
                          >
                            {row.multiplier}x
                          </span>
                        </TableCell>

                        {/* Total Earned */}
                        <TableCell className="text-right">
                          <span
                            className={`font-mono text-sm ${
                              row.totalEarnedSol > 0
                                ? "text-[#6FEC06]"
                                : "text-gray-600"
                            }`}
                          >
                            {formatSol(row.totalEarnedSol)}
                          </span>
                        </TableCell>

                        {/* Payout Count */}
                        <TableCell className="text-center">
                          {row.payoutCount > 0 ? (
                            <Badge
                              variant="secondary"
                              className="bg-gray-800 text-gray-400 border-gray-700"
                            >
                              {row.payoutCount}
                            </Badge>
                          ) : (
                            <span className="text-gray-700 text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </AnimateIn>
      )}

      {/* Mobile Cards */}
      {rows.length > 0 && (
        <div className="md:hidden space-y-3">
          {rows.map((row, i) => (
            <AnimateIn key={row.wallet} delay={600 + Math.min(i, 15) * 50}>
              <MobileRow row={row} index={i} />
            </AnimateIn>
          ))}
        </div>
      )}

      {/* How It Works */}
      <AnimateIn delay={750}>
        <div className="mt-12 rounded-2xl border border-white/[0.06] bg-[#060320]/60 p-6 md:p-8">
          <h3 className="text-lg font-semibold text-white mb-5">
            How Revenue Sharing Works
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm leading-relaxed">
            <div>
              <div className="text-violet-400 font-medium mb-1.5">
                Earn from every API call
              </div>
              <p className="text-white/40">
                Every time someone chats with an agent, the platform collects a
                fee. 50% of that profit goes straight into the holder revenue
                pool.
              </p>
            </div>
            <div>
              <div className="text-amber-400 font-medium mb-1.5">
                Tier-weighted payouts
              </div>
              <p className="text-white/40">
                The pool is split among all eligible holders, weighted by tier
                multiplier. Diamond holders (30M+) earn 3x the share of a Bronze
                holder.
              </p>
            </div>
            <div>
              <div className="text-[#6FEC06] font-medium mb-1.5">
                Dust threshold &amp; rollover
              </div>
              <p className="text-white/40">
                If your share in a cycle is below 0.00001 SOL (the dust
                threshold), it isn&apos;t lost — it rolls into the pending pool
                and accumulates until the next cycle where your payout is large
                enough to send.
              </p>
            </div>
          </div>
        </div>
      </AnimateIn>

      {/* Footer note */}
      <p className="text-center text-white/20 text-xs mt-8">
        Holder snapshot refreshed every 2 minutes · Payouts sent every 5 minutes
        · Min. 5M $AGENTINC to qualify
      </p>
    </div>
  );
}
