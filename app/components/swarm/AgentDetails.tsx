"use client";

import { X, Cpu, Zap, Activity } from "lucide-react";
import type { SwarmAgent } from "@/lib/swarm/types";

interface AgentDetailsProps {
  agent: SwarmAgent | null;
  onClose: () => void;
}

export default function AgentDetails({ agent, onClose }: AgentDetailsProps) {
  if (!agent) return null;

  const statusColors = {
    idle: "text-gray-400",
    busy: "text-amber-400",
    calling: "text-cyan-400",
  };

  const statusBg = {
    idle: "bg-gray-400/20",
    busy: "bg-amber-400/20",
    calling: "bg-cyan-400/20",
  };

  return (
    <div className="fixed top-[88px] right-4 w-80 bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-2xl p-4 shadow-2xl z-40">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: agent.color + "30" }}
          >
            <Cpu className="w-6 h-6" style={{ color: agent.color }} />
          </div>
          <div>
            <h3 className="font-bold text-white">{agent.name}</h3>
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusBg[agent.status]} ${statusColors[agent.status]}`}
            >
              <Activity className="w-3 h-3" />
              {agent.status}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {agent.description && (
        <p className="text-sm text-gray-400 mb-4">{agent.description}</p>
      )}

      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Capabilities
          </h4>
          <div className="flex flex-wrap gap-1">
            {agent.capabilities.map((cap) => (
              <span
                key={cap}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-lg"
              >
                <Zap className="w-3 h-3" />
                {cap}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-800">
          <div className="text-center p-2 bg-gray-800/50 rounded-lg">
            <div className="text-lg font-bold text-white">
              {Math.round(agent.x)}
            </div>
            <div className="text-xs text-gray-500">X Position</div>
          </div>
          <div className="text-center p-2 bg-gray-800/50 rounded-lg">
            <div className="text-lg font-bold text-white">
              {Math.round(agent.y)}
            </div>
            <div className="text-xs text-gray-500">Y Position</div>
          </div>
        </div>
      </div>
    </div>
  );
}
