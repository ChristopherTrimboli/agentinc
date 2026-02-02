// Simplified layout system for swarm visualization
import type { SwarmAgent, SwarmConnection, Corporation } from "./types";

export class PhysicsSimulation {
  private width: number;
  private height: number;
  public centerX: number;
  public centerY: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
  }

  updateDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
  }

  // Simplified tick - just maintain staggered positions
  tick(
    agents: Map<string, SwarmAgent>,
    connections: Map<string, SwarmConnection>,
    corporations: Map<string, Corporation> = new Map(),
  ): void {
    const corpArray = Array.from(corporations.values());
    const agentInc = corpArray.find((c) => c.name === "Agent Inc.");

    // Position corporations in fixed positions
    const corpRadius = 550; // Distance from center to other corporations

    // Keep "Agent Inc." at center
    if (agentInc) {
      agentInc.x = this.centerX;
      agentInc.y = this.centerY;
    }

    // Position other corporations in orbit
    const otherCorps = corpArray.filter((c) => c.name !== "Agent Inc.");
    otherCorps.forEach((corp, i) => {
      const angle = (i / otherCorps.length) * Math.PI * 2 - Math.PI / 2;
      corp.x = this.centerX + Math.cos(angle) * corpRadius;
      corp.y = this.centerY + Math.sin(angle) * corpRadius;
    });

    // Position agents in orbit around their corporation
    const agentsByCorp = new Map<string | null, SwarmAgent[]>();
    for (const agent of agents.values()) {
      const corpId = agent.corporationId || null;
      if (!agentsByCorp.has(corpId)) {
        agentsByCorp.set(corpId, []);
      }
      agentsByCorp.get(corpId)!.push(agent);
    }

    for (const [corpId, corpAgents] of agentsByCorp) {
      let cx = this.centerX;
      let cy = this.centerY;

      if (corpId) {
        const corp = corporations.get(corpId);
        if (corp) {
          cx = corp.x;
          cy = corp.y;
        }
      }

      // Skip if no agents to position
      if (corpAgents.length === 0) continue;

      const agentOrbitRadius = 220;
      const angleIncrement = (Math.PI * 2) / corpAgents.length;
      const angleOffset = angleIncrement / 2;

      corpAgents.forEach((agent, i) => {
        const angle = i * angleIncrement - Math.PI / 2 + angleOffset;
        agent.x = cx + Math.cos(angle) * agentOrbitRadius;
        agent.y = cy + Math.sin(angle) * agentOrbitRadius;
      });
    }
  }

  // Initialize positions - same logic as tick
  initializePositions(
    agents: Map<string, SwarmAgent>,
    corporations: Map<string, Corporation> = new Map(),
  ): void {
    this.tick(agents, new Map(), corporations);
  }
}
