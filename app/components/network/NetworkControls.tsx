"use client";

import {
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  MessageSquare,
} from "lucide-react";
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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-2xl px-4 py-3 shadow-2xl z-30">
      {/* Live badge */}
      <div className="flex items-center gap-2 pr-3 border-r border-gray-700">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span className="text-xs text-emerald-400 font-semibold tracking-wide">
          8004
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 pr-3 border-r border-gray-700">
        <StatPill
          icon={<Users className="w-3.5 h-3.5" />}
          value={stats?.totalAgents ?? totalAgentsLoaded}
          label="Agents"
        />
        <StatPill
          icon={<ShieldCheck className="w-3.5 h-3.5" />}
          value={stats?.totalCollections ?? totalCollectionsLoaded}
          label="Collections"
        />
        {stats && (
          <StatPill
            icon={<MessageSquare className="w-3.5 h-3.5" />}
            value={stats.totalFeedbacks}
            label="Feedbacks"
          />
        )}
      </div>

      {/* Tier highlights */}
      {stats && (stats.platinumAgents > 0 || stats.goldAgents > 0) && (
        <div className="flex items-center gap-2 pr-3 border-r border-gray-700">
          {stats.platinumAgents > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${platCss.bg} ${platCss.text}`}
            >
              {TRUST_TIER_NAMES[4]}: {stats.platinumAgents}
            </span>
          )}
          {stats.goldAgents > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${goldCss.bg} ${goldCss.text}`}
            >
              {TRUST_TIER_NAMES[3]}: {stats.goldAgents}
            </span>
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search..."
          className="w-36 pl-8 pr-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-500"
        />
      </div>

      {/* Reset */}
      <button
        onClick={onReset}
        className="p-2.5 rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
        title="Reset view"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
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
      <div className="flex items-center gap-1 justify-center text-white font-bold text-sm">
        {icon}
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}
