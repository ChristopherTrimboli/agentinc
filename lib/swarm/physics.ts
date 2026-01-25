// Force-directed physics simulation for swarm visualization
import type { SwarmAgent, SwarmConnection, PhysicsConfig, Corporation } from "./types";
import { DEFAULT_PHYSICS_CONFIG } from "./types";

// Rope segment for cable physics
export interface RopeSegment {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
}

// Rope between two agents
export interface Rope {
  connectionId: string;
  segments: RopeSegment[];
}

export class PhysicsSimulation {
  private config: PhysicsConfig;
  private width: number;
  private height: number;
  public centerX: number;
  public centerY: number;
  
  // Rope physics for connections
  public ropes: Map<string, Rope> = new Map();
  private readonly ROPE_SEGMENTS = 8;
  private readonly ROPE_GRAVITY = 0.3;
  private readonly ROPE_ITERATIONS = 3;

  constructor(
    width: number,
    height: number,
    config: Partial<PhysicsConfig> = {}
  ) {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.config = { ...DEFAULT_PHYSICS_CONFIG, ...config };
  }

  updateDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
  }

  // Create or update rope for a connection
  private ensureRope(connectionId: string, fromX: number, fromY: number, toX: number, toY: number): Rope {
    let rope = this.ropes.get(connectionId);
    
    if (!rope) {
      // Create new rope with segments
      const segments: RopeSegment[] = [];
      for (let i = 0; i <= this.ROPE_SEGMENTS; i++) {
        const t = i / this.ROPE_SEGMENTS;
        const x = fromX + (toX - fromX) * t;
        const y = fromY + (toY - fromY) * t;
        segments.push({ x, y, oldX: x, oldY: y });
      }
      rope = { connectionId, segments };
      this.ropes.set(connectionId, rope);
    }
    
    return rope;
  }

  // Verlet integration for rope physics
  private tickRope(rope: Rope, fromX: number, fromY: number, toX: number, toY: number): void {
    const segments = rope.segments;
    const segmentLength = Math.sqrt(
      Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2)
    ) / this.ROPE_SEGMENTS;
    
    // Apply verlet integration (velocity from position difference)
    for (let i = 1; i < segments.length - 1; i++) {
      const seg = segments[i];
      const vx = (seg.x - seg.oldX) * 0.98; // Damping
      const vy = (seg.y - seg.oldY) * 0.98;
      
      seg.oldX = seg.x;
      seg.oldY = seg.y;
      
      seg.x += vx;
      seg.y += vy + this.ROPE_GRAVITY; // Gravity sag
    }
    
    // Pin endpoints to agents
    segments[0].x = fromX;
    segments[0].y = fromY;
    segments[0].oldX = fromX;
    segments[0].oldY = fromY;
    
    segments[segments.length - 1].x = toX;
    segments[segments.length - 1].y = toY;
    segments[segments.length - 1].oldX = toX;
    segments[segments.length - 1].oldY = toY;
    
    // Constraint solving - keep segments at fixed distance
    for (let iter = 0; iter < this.ROPE_ITERATIONS; iter++) {
      for (let i = 0; i < segments.length - 1; i++) {
        const s1 = segments[i];
        const s2 = segments[i + 1];
        
        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const diff = (dist - segmentLength) / dist;
        
        // Move segments towards each other
        const offsetX = dx * diff * 0.5;
        const offsetY = dy * diff * 0.5;
        
        // Don't move pinned endpoints
        if (i > 0) {
          s1.x += offsetX;
          s1.y += offsetY;
        }
        if (i < segments.length - 2) {
          s2.x -= offsetX;
          s2.y -= offsetY;
        }
      }
    }
  }

  // Run one tick of the physics simulation
  tick(
    agents: Map<string, SwarmAgent>,
    connections: Map<string, SwarmConnection>,
    corporations: Map<string, Corporation> = new Map()
  ): void {
    const agentArray = Array.from(agents.values());
    const corpArray = Array.from(corporations.values());

    // Keep corporations at center
    for (const corp of corpArray) {
      corp.x = this.centerX;
      corp.y = this.centerY;
      corp.vx = 0;
      corp.vy = 0;
    }

    // Calculate forces for each agent
    for (const agent of agentArray) {
      let fx = 0;
      let fy = 0;

      // Bouncy collision with other agents
      for (const other of agentArray) {
        if (agent.id === other.id) continue;

        const dx = agent.x - other.x;
        const dy = agent.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = (agent.size || 35) + (other.size || 35) + 15;

        if (distance < minDist) {
          // Elastic collision - bounce off each other
          const overlap = minDist - distance;
          const nx = dx / distance;
          const ny = dy / distance;
          
          // Push apart with bounce
          const bounce = 0.8;
          fx += nx * overlap * bounce;
          fy += ny * overlap * bounce;
          
          // Transfer some velocity (elastic collision)
          const relVx = agent.vx - other.vx;
          const relVy = agent.vy - other.vy;
          const relVelAlongNormal = relVx * nx + relVy * ny;
          
          if (relVelAlongNormal < 0) {
            const restitution = 0.6;
            const impulse = -(1 + restitution) * relVelAlongNormal * 0.5;
            fx += nx * impulse;
            fy += ny * impulse;
          }
        } else if (distance < this.config.minDistance * 2.5) {
          // Soft repulsion at longer range
          const force = this.config.repulsionStrength / (distance * distance) * 0.3;
          fx += (dx / distance) * force;
          fy += (dy / distance) * force;
        }
      }

      // Attraction to parent corporation (if any)
      if (agent.corporationId) {
        const corp = corporations.get(agent.corporationId);
        if (corp) {
          const dx = corp.x - agent.x;
          const dy = corp.y - agent.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const idealDist = 160;
          
          // Spring force towards ideal orbit distance
          const displacement = distance - idealDist;
          const springStrength = 0.02;
          fx += (dx / distance) * displacement * springStrength;
          fy += (dy / distance) * displacement * springStrength;
        }
      } else {
        // No corporation - gentle center gravity
        const dxCenter = this.centerX - agent.x;
        const dyCenter = this.centerY - agent.y;
        fx += dxCenter * this.config.centerGravity * 0.5;
        fy += dyCenter * this.config.centerGravity * 0.5;
      }

      // Bouncy collision with corporations
      for (const corp of corpArray) {
        const dx = agent.x - corp.x;
        const dy = agent.y - corp.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = (corp.size || 60) + (agent.size || 35) + 25;

        if (distance < minDist) {
          const overlap = minDist - distance;
          const nx = dx / distance;
          const ny = dy / distance;
          
          // Bounce off corporation
          fx += nx * overlap * 0.6;
          fy += ny * overlap * 0.6;
        }
      }

      // Update velocity with damping
      agent.vx = (agent.vx + fx) * this.config.damping;
      agent.vy = (agent.vy + fy) * this.config.damping;
      
      // Clamp max velocity
      const maxVel = 15;
      const vel = Math.sqrt(agent.vx * agent.vx + agent.vy * agent.vy);
      if (vel > maxVel) {
        agent.vx = (agent.vx / vel) * maxVel;
        agent.vy = (agent.vy / vel) * maxVel;
      }
    }

    // Rope physics for active connections
    for (const connection of connections.values()) {
      const from = agents.get(connection.fromAgentId);
      const to = agents.get(connection.toAgentId);

      if (!from || !to) continue;

      // Create/update rope
      const rope = this.ensureRope(connection.id, from.x, from.y, to.x, to.y);
      this.tickRope(rope, from.x, from.y, to.x, to.y);

      // Gentle attraction for connected agents (rope tension)
      if (connection.status === "active") {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        if (distance > this.config.idealLinkDistance * 1.5) {
          const force = (distance - this.config.idealLinkDistance) * 0.01;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;

          from.vx += fx;
          from.vy += fy;
          to.vx -= fx;
          to.vy -= fy;
        }
      }
    }

    // Clean up ropes for removed connections
    for (const ropeId of this.ropes.keys()) {
      if (!connections.has(ropeId)) {
        this.ropes.delete(ropeId);
      }
    }

    // Update positions
    for (const agent of agentArray) {
      agent.x += agent.vx;
      agent.y += agent.vy;

      // Keep within bounds with bouncy walls
      const padding = 60;
      const bounce = 0.5;
      
      if (agent.x < padding) {
        agent.x = padding;
        agent.vx = Math.abs(agent.vx) * bounce;
      } else if (agent.x > this.width - padding) {
        agent.x = this.width - padding;
        agent.vx = -Math.abs(agent.vx) * bounce;
      }
      
      if (agent.y < padding) {
        agent.y = padding;
        agent.vy = Math.abs(agent.vy) * bounce;
      } else if (agent.y > this.height - padding) {
        agent.y = this.height - padding;
        agent.vy = -Math.abs(agent.vy) * bounce;
      }
    }
  }

  // Initialize agents in a circular layout around their corporation
  initializePositions(
    agents: Map<string, SwarmAgent>,
    corporations: Map<string, Corporation> = new Map()
  ): void {
    // Position corporations at center
    for (const corp of corporations.values()) {
      corp.x = this.centerX;
      corp.y = this.centerY;
      corp.vx = 0;
      corp.vy = 0;
    }

    // Group agents by corporation
    const agentsByCorp = new Map<string | null, SwarmAgent[]>();
    for (const agent of agents.values()) {
      const corpId = agent.corporationId || null;
      if (!agentsByCorp.has(corpId)) {
        agentsByCorp.set(corpId, []);
      }
      agentsByCorp.get(corpId)!.push(agent);
    }

    // Position agents around their corporation
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

      const radius = 180; // Orbit radius
      corpAgents.forEach((agent, i) => {
        const angle = (i / corpAgents.length) * Math.PI * 2 - Math.PI / 2;
        agent.x = cx + Math.cos(angle) * radius;
        agent.y = cy + Math.sin(angle) * radius;
        agent.vx = 0;
        agent.vy = 0;
      });
    }
  }

  // Add some randomness to break symmetry
  jiggle(agents: Map<string, SwarmAgent>, amount: number = 10): void {
    for (const agent of agents.values()) {
      agent.vx += (Math.random() - 0.5) * amount;
      agent.vy += (Math.random() - 0.5) * amount;
    }
  }
}
