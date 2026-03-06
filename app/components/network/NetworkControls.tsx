"use client";

import {
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";
import type { NetworkStats } from "@/lib/network/types";
import { TRUST_TIER_NAMES, TRUST_TIER_CSS } from "@/lib/network/types";

interface Props {
  stats: NetworkStats | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onReset: () => void;
  totalAgentsLoaded: number;
  totalCollectionsLoaded: number;
}

export default function NetworkControls({
  stats,
  searchQuery,
  onSearchChange,
  onReset,
  totalAgentsLoaded,
  totalCollectionsLoaded,
}: Props) {
  const platCss = TRUST_TIER_CSS[4];
  const goldCss = TRUST_TIER_CSS[3];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-[#0a1120]/90 backdrop-blur-2xl border border-white/[0.07] rounded-2xl px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-30 max-w-[calc(100vw-2rem)]"
    >
      {/* Stats */}
      <div className="flex items-center gap-4 pr-3 border-r border-white/[0.06]">
        <StatPill
          icon={<Users className="w-3.5 h-3.5" />}
          value={stats?.totalAgents ?? totalAgentsLoaded}
          label="Agents"
        />
        <span className="hidden sm:contents">
          <StatPill
            icon={<ShieldCheck className="w-3.5 h-3.5" />}
            value={stats?.totalCollections ?? totalCollectionsLoaded}
            label="Collections"
          />
        </span>
        {stats && (
          <span className="hidden sm:contents">
            <StatPill
              icon={<MessageSquare className="w-3.5 h-3.5" />}
              value={stats.totalFeedbacks}
              label="Feedbacks"
            />
          </span>
        )}
        {stats && stats.totalVerified > 0 && (
          <span className="hidden sm:contents">
            <StatPill
              icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              value={stats.totalVerified}
              label="Verified"
            />
          </span>
        )}
      </div>

      {/* Tier highlights */}
      {stats && (stats.platinumAgents > 0 || stats.goldAgents > 0) && (
        <div className="hidden sm:flex items-center gap-2 pr-3 border-r border-white/[0.06]">
          {stats.platinumAgents > 0 && (
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${platCss.bg} ${platCss.text}`}
            >
              {TRUST_TIER_NAMES[4]}: {stats.platinumAgents}
            </span>
          )}
          {stats.goldAgents > 0 && (
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${goldCss.bg} ${goldCss.text}`}
            >
              {TRUST_TIER_NAMES[3]}: {stats.goldAgents}
            </span>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative group">
        <Search className="w-3.5 h-3.5 text-gray-600 group-focus-within:text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 transition-colors duration-150" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
          className="w-24 sm:w-36 pl-8 pr-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.06] rounded-xl text-gray-300 placeholder-gray-600 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-all duration-200"
        />
      </div>

      {/* Reset */}
      <motion.button
        whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.08)" }}
        whileTap={{ scale: 0.92 }}
        onClick={onReset}
        className="p-2 rounded-xl text-gray-500 hover:text-white transition-colors duration-150"
        title="Reset view"
      >
        <RefreshCw className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
}

function StatPill({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center gap-1 justify-center text-white font-bold text-sm tabular-nums">
        {icon}
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] text-gray-600">{label}</div>
    </div>
  );
}
