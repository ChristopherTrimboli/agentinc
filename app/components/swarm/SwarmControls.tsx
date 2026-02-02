"use client";

import { RefreshCw, Activity } from "lucide-react";

interface SwarmControlsProps {
  onReset: () => void;
  agentCount: number;
  connectionCount: number;
}

export default function SwarmControls({
  onReset,
  agentCount,
  connectionCount,
}: SwarmControlsProps) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-2xl px-4 py-3 shadow-2xl z-30">
      {/* Live indicator */}
      <div className="flex items-center gap-2 pr-4 border-r border-gray-700">
        <Activity className="w-4 h-4 text-green-400 animate-pulse" />
        <span className="text-xs text-green-400 font-medium">LIVE</span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 pr-4 border-r border-gray-700">
        <div className="text-center">
          <div className="text-lg font-bold text-white">{agentCount}</div>
          <div className="text-xs text-gray-500">Agents</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-cyan-400">
            {connectionCount}
          </div>
          <div className="text-xs text-gray-500">Active</div>
        </div>
      </div>

      {/* Reset button */}
      <button
        onClick={onReset}
        className="p-3 rounded-xl bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-all"
        title="Reset positions"
      >
        <RefreshCw className="w-5 h-5" />
      </button>
    </div>
  );
}
