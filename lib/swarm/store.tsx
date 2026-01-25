"use client";

import { createContext, useContext, useRef, useSyncExternalStore } from "react";
import type { SwarmAgent, SwarmConnection, SwarmEvent, Corporation } from "./types";
import { getAgentColor } from "./types";
import { PhysicsSimulation } from "./physics";
import { swarmEventBus } from "./eventBus";

export interface SwarmStore {
  agents: Map<string, SwarmAgent>;
  corporations: Map<string, Corporation>;
  connections: Map<string, SwarmConnection>;
  events: SwarmEvent[];
  physics: PhysicsSimulation | null;

  // Actions
  addAgent: (agent: Omit<SwarmAgent, "x" | "y" | "color">) => void;
  removeAgent: (id: string) => void;
  updateAgent: (id: string, updates: Partial<SwarmAgent>) => void;
  
  addCorporation: (corp: Omit<Corporation, "x" | "y">) => void;
  updateCorporation: (id: string, updates: Partial<Corporation>) => void;
  
  addConnection: (fromId: string, toId: string, type?: SwarmConnection["type"]) => string;
  updateConnection: (id: string, updates: Partial<SwarmConnection>) => void;
  removeConnection: (id: string) => void;
  
  initPhysics: (width: number, height: number) => void;
  tickPhysics: () => void;
  
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => SwarmStore;
}

function createSwarmStore(): SwarmStore {
  let agents = new Map<string, SwarmAgent>();
  let corporations = new Map<string, Corporation>();
  let connections = new Map<string, SwarmConnection>();
  let events: SwarmEvent[] = [];
  let physics: PhysicsSimulation | null = null;
  let listeners = new Set<() => void>();

  const notify = () => {
    listeners.forEach((l) => l());
  };

  const store: SwarmStore = {
    get agents() {
      return agents;
    },
    get corporations() {
      return corporations;
    },
    get connections() {
      return connections;
    },
    get events() {
      return events;
    },
    get physics() {
      return physics;
    },

    addCorporation: (corpData) => {
      const corp: Corporation = {
        ...corpData,
        x: physics ? physics.centerX : window.innerWidth / 2,
        y: physics ? physics.centerY : window.innerHeight / 2,
      };
      corporations = new Map(corporations);
      corporations.set(corp.id, corp);
      
      // Reinitialize positions to spread out corporations properly
      if (physics) {
        physics.initializePositions(agents, corporations);
        // Force a new Map reference to trigger React updates
        corporations = new Map(corporations);
      }
      
      notify();
    },

    updateCorporation: (id, updates) => {
      const corp = corporations.get(id);
      if (!corp) return;
      
      corporations = new Map(corporations);
      corporations.set(id, { ...corp, ...updates });
      notify();
    },

    addAgent: (agentData) => {
      // Calculate proper initial position
      let x: number;
      let y: number;
      
      if (physics && agentData.corporationId) {
        // If physics exists and agent has a corporation, position it in orbit
        const corp = corporations.get(agentData.corporationId);
        if (corp) {
          // Count how many agents already belong to this corporation
          const corpAgents = Array.from(agents.values()).filter(
            a => a.corporationId === agentData.corporationId
          );
          const index = corpAgents.length;
          const totalAgents = index + 1;
          
          // Position in circular orbit around corporation
          const radius = 220; // Increased from 180 for better spacing
          const angleIncrement = (Math.PI * 2) / totalAgents;
          const angleOffset = angleIncrement / 2; // Offset by half to stagger between cardinal directions
          const angle = index * angleIncrement - Math.PI / 2 + angleOffset;
          x = corp.x + Math.cos(angle) * radius;
          y = corp.y + Math.sin(angle) * radius;
        } else {
          // Corporation not found, use center
          x = physics.centerX;
          y = physics.centerY;
        }
      } else if (physics) {
        // No corporation, position near center
        x = physics.centerX;
        y = physics.centerY;
      } else {
        // No physics yet, use random position (will be corrected when physics inits)
        x = Math.random() * 800;
        y = Math.random() * 600;
      }
      
      const agent: SwarmAgent = {
        ...agentData,
        x,
        y,
        color: agentData.color || getAgentColor(agents.size),
      };
      agents = new Map(agents);
      agents.set(agent.id, agent);
      
      // Recalculate positions for all agents in the same corporation to rebalance
      if (physics && agentData.corporationId) {
        const corp = corporations.get(agentData.corporationId);
        if (corp) {
          const corpAgents = Array.from(agents.values()).filter(
            a => a.corporationId === agentData.corporationId
          );
          const radius = 220; // Increased from 180 for better spacing
          const angleIncrement = (Math.PI * 2) / corpAgents.length;
          const angleOffset = angleIncrement / 2; // Offset by half to stagger between cardinal directions
          corpAgents.forEach((a, i) => {
            const angle = i * angleIncrement - Math.PI / 2 + angleOffset;
            a.x = corp.x + Math.cos(angle) * radius;
            a.y = corp.y + Math.sin(angle) * radius;
          });
        }
      }
      
      swarmEventBus.emit({
        type: "agent_register",
        sourceAgentId: agent.id,
      });
      
      notify();
    },

    removeAgent: (id) => {
      agents = new Map(agents);
      agents.delete(id);
      
      // Remove connections involving this agent
      connections = new Map(connections);
      for (const [connId, conn] of connections) {
        if (conn.fromAgentId === id || conn.toAgentId === id) {
          connections.delete(connId);
        }
      }
      
      swarmEventBus.emit({
        type: "agent_unregister",
        sourceAgentId: id,
      });
      
      notify();
    },

    updateAgent: (id, updates) => {
      const agent = agents.get(id);
      if (!agent) return;
      
      agents = new Map(agents);
      agents.set(id, { ...agent, ...updates });
      notify();
    },

    addConnection: (fromId, toId, type = "request") => {
      const id = crypto.randomUUID();
      const connection: SwarmConnection = {
        id,
        fromAgentId: fromId,
        toAgentId: toId,
        type,
        status: "active",
        startedAt: Date.now(),
        progress: 0,
      };
      
      connections = new Map(connections);
      connections.set(id, connection);
      
      // Update agent statuses
      store.updateAgent(fromId, { status: "calling" });
      store.updateAgent(toId, { status: "busy" });
      
      swarmEventBus.emit({
        type: "agent_call",
        sourceAgentId: fromId,
        targetAgentId: toId,
        payload: { connectionId: id },
      });
      
      notify();
      return id;
    },

    updateConnection: (id, updates) => {
      const conn = connections.get(id);
      if (!conn) return;
      
      connections = new Map(connections);
      connections.set(id, { ...conn, ...updates });
      notify();
    },

    removeConnection: (id) => {
      const conn = connections.get(id);
      if (!conn) return;
      
      connections = new Map(connections);
      connections.delete(id);
      
      // Reset agent statuses if no other active connections
      const fromHasOther = Array.from(connections.values()).some(
        (c) => c.fromAgentId === conn.fromAgentId && c.status === "active"
      );
      const toHasOther = Array.from(connections.values()).some(
        (c) => c.toAgentId === conn.toAgentId && c.status === "active"
      );
      
      if (!fromHasOther) store.updateAgent(conn.fromAgentId, { status: "idle" });
      if (!toHasOther) store.updateAgent(conn.toAgentId, { status: "idle" });
      
      notify();
    },

    initPhysics: (width, height) => {
      physics = new PhysicsSimulation(width, height);
      if (agents.size > 0 || corporations.size > 0) {
        physics.initializePositions(agents, corporations);
      }
      notify();
    },

    tickPhysics: () => {
      if (!physics) return;
      physics.tick(agents, connections, corporations);
      
      // Update connection progress
      connections = new Map(connections);
      for (const [id, conn] of connections) {
        if (conn.status === "active") {
          const newProgress = Math.min(1, conn.progress + 0.02);
          connections.set(id, { ...conn, progress: newProgress });
        }
      }
      
      notify();
    },

    subscribe: (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },

    getSnapshot: () => store,
  };

  return store;
}

const SwarmContext = createContext<SwarmStore | null>(null);

export function SwarmProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<SwarmStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createSwarmStore();
  }

  return (
    <SwarmContext.Provider value={storeRef.current}>
      {children}
    </SwarmContext.Provider>
  );
}

export function useSwarmStore(): SwarmStore {
  const store = useContext(SwarmContext);
  if (!store) {
    throw new Error("useSwarmStore must be used within SwarmProvider");
  }

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  );
}

export function useSwarmActions() {
  const store = useContext(SwarmContext);
  if (!store) {
    throw new Error("useSwarmActions must be used within SwarmProvider");
  }
  
  return {
    addAgent: store.addAgent,
    removeAgent: store.removeAgent,
    updateAgent: store.updateAgent,
    addCorporation: store.addCorporation,
    updateCorporation: store.updateCorporation,
    addConnection: store.addConnection,
    updateConnection: store.updateConnection,
    removeConnection: store.removeConnection,
    initPhysics: store.initPhysics,
    tickPhysics: store.tickPhysics,
  };
}
