// Event bus for swarm visualization
import type { SwarmEvent, SwarmAgent, SwarmConnection } from "./types";

type EventCallback = (event: SwarmEvent) => void;
type AgentCallback = (agent: SwarmAgent) => void;
type ConnectionCallback = (connection: SwarmConnection) => void;

class SwarmEventBus {
  private eventListeners: Set<EventCallback> = new Set();
  private agentListeners: Set<AgentCallback> = new Set();
  private connectionListeners: Set<ConnectionCallback> = new Set();
  private eventHistory: SwarmEvent[] = [];
  private maxHistory = 1000;

  // Emit a swarm event
  emit(event: Omit<SwarmEvent, "id" | "timestamp">): SwarmEvent {
    const fullEvent: SwarmEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    this.eventHistory.push(fullEvent);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    this.eventListeners.forEach((cb) => cb(fullEvent));
    return fullEvent;
  }

  // Subscribe to events
  onEvent(callback: EventCallback): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  // Agent updates
  emitAgentUpdate(agent: SwarmAgent): void {
    this.agentListeners.forEach((cb) => cb(agent));
  }

  onAgentUpdate(callback: AgentCallback): () => void {
    this.agentListeners.add(callback);
    return () => this.agentListeners.delete(callback);
  }

  // Connection updates
  emitConnectionUpdate(connection: SwarmConnection): void {
    this.connectionListeners.forEach((cb) => cb(connection));
  }

  onConnectionUpdate(callback: ConnectionCallback): () => void {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  // Get event history
  getHistory(): SwarmEvent[] {
    return [...this.eventHistory];
  }

  // Clear all
  clear(): void {
    this.eventHistory = [];
  }
}

// Singleton instance
export const swarmEventBus = new SwarmEventBus();

// Helper to create an agent call event and return connection info
export function emitAgentCall(
  sourceAgentId: string,
  targetAgentId: string,
  payload?: Record<string, unknown>
): { event: SwarmEvent; connectionId: string } {
  const connectionId = crypto.randomUUID();
  const event = swarmEventBus.emit({
    type: "agent_call",
    sourceAgentId,
    targetAgentId,
    payload: { ...payload, connectionId },
  });
  return { event, connectionId };
}

export function emitAgentResponse(
  sourceAgentId: string,
  targetAgentId: string,
  connectionId: string,
  payload?: Record<string, unknown>
): SwarmEvent {
  return swarmEventBus.emit({
    type: "agent_response",
    sourceAgentId,
    targetAgentId,
    payload: { ...payload, connectionId },
  });
}

export function emitAgentError(
  sourceAgentId: string,
  targetAgentId: string,
  connectionId: string,
  error: string
): SwarmEvent {
  return swarmEventBus.emit({
    type: "agent_error",
    sourceAgentId,
    targetAgentId,
    payload: { connectionId, error },
  });
}
