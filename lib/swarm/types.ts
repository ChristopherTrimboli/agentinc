// Swarm visualization types

export interface Corporation {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  color?: string;
  size?: number;
  // Position in the visualization
  x: number;
  y: number;
}

export interface SwarmAgent {
  id: string;
  name: string;
  description?: string;
  capabilities: string[];
  status: "idle" | "busy" | "calling";
  corporationId?: string;
  // Position in the visualization
  x: number;
  y: number;
  // Visual properties
  color?: string;
  size?: number;
}

export interface SwarmConnection {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: "request" | "response" | "tool_call";
  status: "active" | "completed" | "failed";
  label?: string;
  startedAt: number;
  completedAt?: number;
  // Animation progress 0-1
  progress: number;
}

export interface SwarmEvent {
  id: string;
  type: "agent_call" | "agent_response" | "agent_error" | "agent_register" | "agent_unregister";
  sourceAgentId: string;
  targetAgentId?: string;
  payload?: Record<string, unknown>;
  timestamp: number;
}

export interface SwarmState {
  agents: Map<string, SwarmAgent>;
  connections: Map<string, SwarmConnection>;
  events: SwarmEvent[];
}

// Agent colors palette
export const AGENT_COLORS = [
  "#8B5CF6", // purple
  "#06B6D4", // cyan
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#EC4899", // pink
  "#6366F1", // indigo
  "#14B8A6", // teal
];

export function getAgentColor(index: number): string {
  return AGENT_COLORS[index % AGENT_COLORS.length];
}
