"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import SwarmCanvas from "../../components/swarm/SwarmCanvas";
import SwarmControls from "../../components/swarm/SwarmControls";
import AgentDetails from "../../components/swarm/AgentDetails";
import {
  SwarmProvider,
  useSwarmStore,
  useSwarmActions,
} from "@/lib/swarm/store";
import { createMockSimulation } from "@/lib/swarm/mockData";
import type { SwarmAgent } from "@/lib/swarm/types";

interface DBCorporation {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  color: string | null;
  size: number;
}

interface DBAgent {
  id: string;
  name: string;
  description: string | null;
  capabilities: string[];
  color: string | null;
  size: number;
  corporationId: string | null;
}

function SwarmVisualization() {
  const store = useSwarmStore();
  const actions = useSwarmActions();

  const [selectedAgent, setSelectedAgent] = useState<SwarmAgent | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<SwarmAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const simulationRef = useRef<{ start: () => void; stop: () => void } | null>(
    null,
  );
  const physicsInitialized = useRef(false);
  const simulationStarted = useRef(false);

  // Initialize physics FIRST, before loading data
  useEffect(() => {
    if (!physicsInitialized.current) {
      // Account for sidebar width on desktop (256px = w-64)
      const sidebarWidth = window.innerWidth >= 1024 ? 256 : 0;
      actions.initPhysics(window.innerWidth - sidebarWidth, window.innerHeight);
      physicsInitialized.current = true;
    }
  }, [actions]);

  // Fetch corporations and agents from the API AFTER physics is ready
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch corporations first
        const corpResponse = await fetch("/api/swarm/corporations");
        const corpData = await corpResponse.json();

        if (corpData.corporations && corpData.corporations.length > 0) {
          corpData.corporations.forEach((corp: DBCorporation) => {
            actions.addCorporation({
              id: corp.id,
              name: corp.name,
              description: corp.description || undefined,
              logo: corp.logo || undefined,
              color: corp.color || undefined,
              size: corp.size,
            });
          });
        }

        // Then fetch agents
        const agentResponse = await fetch("/api/swarm/agents");
        const agentData = await agentResponse.json();

        if (agentData.agents && agentData.agents.length > 0) {
          agentData.agents.forEach((agent: DBAgent) => {
            actions.addAgent({
              id: agent.id,
              name: agent.name,
              description: agent.description || undefined,
              capabilities: agent.capabilities,
              status: "idle",
              size: agent.size,
              color: agent.color || undefined,
              corporationId: agent.corporationId || undefined,
            });
          });
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch data once physics is initialized
    if (
      physicsInitialized.current &&
      store.agents.size === 0 &&
      store.corporations.size === 0
    ) {
      fetchData();
    } else if (store.agents.size > 0 || store.corporations.size > 0) {
      setIsLoading(false);
    }
  }, [
    physicsInitialized.current,
    actions,
    store.agents.size,
    store.corporations.size,
  ]);

  // Create simulation and auto-start it
  useEffect(() => {
    simulationRef.current = createMockSimulation(
      actions.addConnection,
      actions.updateConnection,
      actions.removeConnection,
      () => Array.from(store.agents.keys()),
    );

    return () => {
      simulationRef.current?.stop();
    };
  }, [actions, store.agents]);

  // Auto-start simulation once agents are loaded
  useEffect(() => {
    if (!isLoading && store.agents.size > 0 && !simulationStarted.current) {
      simulationRef.current?.start();
      simulationStarted.current = true;
    }
  }, [isLoading, store.agents.size]);

  // Reset positions
  const handleReset = useCallback(() => {
    const sidebarWidth = window.innerWidth >= 1024 ? 256 : 0;
    actions.initPhysics(window.innerWidth - sidebarWidth, window.innerHeight);
  }, [actions]);

  // Handle agent click
  const handleAgentClick = useCallback((agent: SwarmAgent) => {
    setSelectedAgent(agent);
  }, []);

  // Handle agent hover
  const handleAgentHover = useCallback((agent: SwarmAgent | null) => {
    setHoveredAgent(agent);
  }, []);

  // Physics tick
  const handleTick = useCallback(() => {
    actions.tickPhysics();
  }, [actions]);

  const activeConnections = Array.from(store.connections.values()).filter(
    (c) => c.status === "active",
  ).length;

  return (
    <div className="fixed inset-0 lg:left-64">
      {/* Main canvas - fullscreen */}
      <SwarmCanvas
        agents={store.agents}
        corporations={store.corporations}
        connections={store.connections}
        physics={store.physics}
        onTick={handleTick}
        onAgentClick={handleAgentClick}
        onAgentHover={handleAgentHover}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-2 border-[#6FEC06]/30 border-t-[#6FEC06] rounded-full animate-spin" />
            <p className="text-white/50 text-sm">Loading agents...</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && store.agents.size === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#6FEC06]/10 flex items-center justify-center border border-[#6FEC06]/30">
              <svg
                className="w-8 h-8 text-[#6FEC06]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No Agents Yet
            </h3>
            <p className="text-white/50 text-sm mb-4">
              Create agents to see them interact in the swarm visualization.
            </p>
          </div>
        </div>
      )}

      {/* Agent details panel */}
      <AgentDetails
        agent={selectedAgent || hoveredAgent}
        onClose={() => setSelectedAgent(null)}
      />

      {/* Controls */}
      <SwarmControls
        onReset={handleReset}
        agentCount={store.agents.size}
        connectionCount={activeConnections}
      />
    </div>
  );
}

export default function NetworkPage() {
  return (
    <SwarmProvider>
      <SwarmVisualization />
    </SwarmProvider>
  );
}
