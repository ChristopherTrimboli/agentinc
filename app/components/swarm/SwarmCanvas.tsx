"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { SwarmAgent, SwarmConnection, Corporation } from "@/lib/swarm/types";
import type { PhysicsSimulation } from "@/lib/swarm/physics";

interface SwarmCanvasProps {
  agents: Map<string, SwarmAgent>;
  corporations: Map<string, Corporation>;
  connections: Map<string, SwarmConnection>;
  physics?: PhysicsSimulation | null;
  onTick?: () => void;
  onAgentClick?: (agent: SwarmAgent) => void;
  onAgentHover?: (agent: SwarmAgent | null) => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const GRID_SIZE = 50;
const GRID_COLOR = 0x1a1a2e;
const GRID_COLOR_MAJOR = 0x252540;

// Draw grid background
function drawGrid(graphics: Graphics, width: number, height: number, scale: number) {
  graphics.clear();
  
  // Extend grid beyond visible area for panning
  const padding = 2000;
  const startX = -padding;
  const startY = -padding;
  const endX = width / scale + padding;
  const endY = height / scale + padding;
  
  // Draw minor grid lines
  for (let x = startX; x <= endX; x += GRID_SIZE) {
    const isMajor = Math.round(x) % (GRID_SIZE * 5) === 0;
    graphics.moveTo(x, startY);
    graphics.lineTo(x, endY);
    graphics.stroke({ 
      width: isMajor ? 1 : 0.5, 
      color: isMajor ? GRID_COLOR_MAJOR : GRID_COLOR, 
      alpha: isMajor ? 0.6 : 0.4 
    });
  }
  
  for (let y = startY; y <= endY; y += GRID_SIZE) {
    const isMajor = Math.round(y) % (GRID_SIZE * 5) === 0;
    graphics.moveTo(startX, y);
    graphics.lineTo(endX, y);
    graphics.stroke({ 
      width: isMajor ? 1 : 0.5, 
      color: isMajor ? GRID_COLOR_MAJOR : GRID_COLOR, 
      alpha: isMajor ? 0.6 : 0.4 
    });
  }
  
  // Draw center cross for reference
  graphics.moveTo(-20, 0);
  graphics.lineTo(20, 0);
  graphics.moveTo(0, -20);
  graphics.lineTo(0, 20);
  graphics.stroke({ width: 2, color: 0x3b3b5c, alpha: 0.5 });
}

// Check WebGPU support
async function checkWebGPUSupport(): Promise<{ supported: boolean; adapter: GPUAdapter | null }> {
  try {
    if (!navigator.gpu) {
      console.log("[Swarm] WebGPU not available in this browser");
      return { supported: false, adapter: null };
    }
    
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.log("[Swarm] WebGPU adapter not available");
      return { supported: false, adapter: null };
    }
    
    console.log("[Swarm] WebGPU supported");
    return { supported: true, adapter };
  } catch (err) {
    console.error("[Swarm] WebGPU check failed:", err);
    return { supported: false, adapter: null };
  }
}

// Check WebGL support with detailed logging (fallback)
function checkWebGLSupport(): { supported: boolean; version: string; error?: string } {
  try {
    const canvas = document.createElement("canvas");
    
    // Try WebGL2 first
    const gl2 = canvas.getContext("webgl2");
    if (gl2) {
      console.log("[Swarm] WebGL2 supported");
      return { supported: true, version: "webgl2" };
    }
    
    // Fall back to WebGL1
    const gl1 = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl1) {
      console.log("[Swarm] WebGL1 supported");
      return { supported: true, version: "webgl1" };
    }
    
    console.warn("[Swarm] No WebGL context available");
    return { supported: false, version: "none", error: "No WebGL context" };
  } catch (err) {
    console.error("[Swarm] WebGL check failed:", err);
    return { supported: false, version: "none", error: String(err) };
  }
}

export default function SwarmCanvas({
  agents,
  corporations,
  connections,
  physics,
  onTick,
  onAgentClick,
  onAgentHover,
}: SwarmCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const gridRef = useRef<Graphics | null>(null);
  const corporationGraphicsRef = useRef<Map<string, Container>>(new Map());
  const agentGraphicsRef = useRef<Map<string, Container>>(new Map());
  const connectionGraphicsRef = useRef<Graphics | null>(null);
  
  // Store refs for animation loop access
  const agentsRef = useRef(agents);
  const corporationsRef = useRef(corporations);
  const connectionsRef = useRef(connections);
  
  // Keep refs updated
  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { corporationsRef.current = corporations; }, [corporations]);
  useEffect(() => { connectionsRef.current = connections; }, [connections]);
  useEffect(() => { physicsRef.current = physics || null; }, [physics]);
  
  // Store physics ref for rope access
  const physicsRef = useRef<PhysicsSimulation | null>(physics || null);
  
  // Draw all connection lines - called every frame
  const drawConnections = useCallback((graphics: Graphics) => {
    graphics.clear();
    const time = Date.now() / 1000;
    const currentAgents = agentsRef.current;
    const currentCorps = corporationsRef.current;
    const currentConnections = connectionsRef.current;
    const physics = physicsRef.current;

    // Draw corporation bubbles and rope connections to agents
    for (const [corpId, corp] of currentCorps) {
      const corpColor = parseInt(corp.color?.replace("#", "") || "8b5cf6", 16);
      
      // Get agents belonging to this corporation
      const corpAgents = Array.from(currentAgents.values()).filter(a => a.corporationId === corpId);
      
      if (corpAgents.length > 0) {
        // Calculate bubble radius based on agent positions
        let maxDist = 0;
        for (const agent of corpAgents) {
          const dx = agent.x - corp.x;
          const dy = agent.y - corp.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + (agent.size || 35) + 40;
          maxDist = Math.max(maxDist, dist);
        }
        
        // Smooth bubble radius with breathing effect
        const breathe = Math.sin(time * 0.8) * 8;
        const bubbleRadius = Math.max(maxDist, 180) + breathe;
        
        // Draw bubble fill (very subtle)
        graphics.circle(corp.x, corp.y, bubbleRadius);
        graphics.fill({ color: corpColor, alpha: 0.02 });
        
        // Draw smooth bubble border
        graphics.circle(corp.x, corp.y, bubbleRadius);
        graphics.stroke({ width: 2, color: corpColor, alpha: 0.15 });
        
        // Draw inner glow ring
        graphics.circle(corp.x, corp.y, bubbleRadius - 15);
        graphics.stroke({ width: 1, color: corpColor, alpha: 0.08 });
        
        // Draw rope lines from corporation center to each agent
        for (const agent of corpAgents) {
          const agentColor = parseInt(agent.color?.replace("#", "") || "8b5cf6", 16);
          
          const dx = agent.x - corp.x;
          const dy = agent.y - corp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Calculate catenary sag for rope effect
          const sag = Math.min(dist * 0.15, 40);
          const midX = (corp.x + agent.x) / 2;
          const midY = (corp.y + agent.y) / 2 + sag;
          
          // Draw rope as quadratic bezier curve
          graphics.moveTo(corp.x, corp.y);
          graphics.quadraticCurveTo(midX, midY, agent.x, agent.y);
          graphics.stroke({ width: 2, color: agentColor, alpha: 0.2 });
          
          // Animated pulse traveling along the rope curve
          const pulseCount = 2;
          for (let i = 0; i < pulseCount; i++) {
            const t = ((time * 0.3 + i / pulseCount) % 1);
            // Quadratic bezier interpolation
            const px = (1-t)*(1-t)*corp.x + 2*(1-t)*t*midX + t*t*agent.x;
            const py = (1-t)*(1-t)*corp.y + 2*(1-t)*t*midY + t*t*agent.y;
            const pulseAlpha = Math.sin(t * Math.PI) * 0.6;
            
            graphics.circle(px, py, 3);
            graphics.fill({ color: agentColor, alpha: pulseAlpha });
          }
          
          // Small dot at connection point on agent
          graphics.circle(agent.x, agent.y, 4);
          graphics.fill({ color: agentColor, alpha: 0.3 });
        }
      }
    }

    // Draw agent-to-agent rope connections
    for (const connection of currentConnections.values()) {
      const fromAgent = currentAgents.get(connection.fromAgentId);
      const toAgent = currentAgents.get(connection.toAgentId);

      if (!fromAgent || !toAgent) continue;

      // Line color based on status
      let color = 0x8b5cf6;
      let alpha = 0.8;
      if (connection.status === "completed") {
        color = 0x10b981;
        alpha = 0.6;
      } else if (connection.status === "failed") {
        color = 0xef4444;
        alpha = 0.6;
      }

      // Get rope segments from physics if available
      const rope = physics?.ropes.get(connection.id);
      
      if (rope && rope.segments.length > 1) {
        // Draw rope using physics segments
        const segments = rope.segments;
        const progress = connection.progress;
        const visibleSegments = Math.ceil(segments.length * progress);
        
        // Draw the rope path through segments
        graphics.moveTo(segments[0].x, segments[0].y);
        for (let i = 1; i < visibleSegments && i < segments.length; i++) {
          // Smooth curve through segment points using catmull-rom-like interpolation
          const prev = segments[Math.max(0, i - 1)];
          const curr = segments[i];
          const next = segments[Math.min(segments.length - 1, i + 1)];
          
          // Control point for smooth curve
          const cpX = curr.x;
          const cpY = curr.y;
          
          graphics.lineTo(cpX, cpY);
        }
        graphics.stroke({ width: 2.5, color, alpha });
        
        // Glow effect
        graphics.moveTo(segments[0].x, segments[0].y);
        for (let i = 1; i < visibleSegments && i < segments.length; i++) {
          graphics.lineTo(segments[i].x, segments[i].y);
        }
        graphics.stroke({ width: 5, color, alpha: alpha * 0.2 });

        // Animated particles traveling along the rope
        if (connection.status === "active") {
          for (let i = 0; i < 3; i++) {
            const t = ((time * 0.5 + i / 3) % 1) * progress;
            const segIndex = t * (segments.length - 1);
            const segFloor = Math.floor(segIndex);
            const segFrac = segIndex - segFloor;
            
            if (segFloor < segments.length - 1) {
              const s1 = segments[segFloor];
              const s2 = segments[segFloor + 1];
              const px = s1.x + (s2.x - s1.x) * segFrac;
              const py = s1.y + (s2.y - s1.y) * segFrac;
              
              graphics.circle(px, py, 4);
              graphics.fill({ color: 0x06b6d4, alpha: 0.9 });
            }
          }
        }

        // Arrow head at the end
        if (visibleSegments >= 2) {
          const lastIdx = Math.min(visibleSegments - 1, segments.length - 1);
          const prevIdx = Math.max(0, lastIdx - 1);
          const endX = segments[lastIdx].x;
          const endY = segments[lastIdx].y;
          const angle = Math.atan2(
            segments[lastIdx].y - segments[prevIdx].y,
            segments[lastIdx].x - segments[prevIdx].x
          );
          const arrowSize = 10;
          
          graphics.moveTo(endX, endY);
          graphics.lineTo(
            endX - arrowSize * Math.cos(angle - Math.PI / 6),
            endY - arrowSize * Math.sin(angle - Math.PI / 6)
          );
          graphics.moveTo(endX, endY);
          graphics.lineTo(
            endX - arrowSize * Math.cos(angle + Math.PI / 6),
            endY - arrowSize * Math.sin(angle + Math.PI / 6)
          );
          graphics.stroke({ width: 2, color, alpha });
        }
      } else {
        // Fallback: simple catenary curve if no physics rope yet
        const progress = connection.progress;
        const dx = toAgent.x - fromAgent.x;
        const dy = toAgent.y - fromAgent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const sag = Math.min(dist * 0.12, 35);
        
        const endX = fromAgent.x + dx * progress;
        const endY = fromAgent.y + dy * progress;
        const midX = fromAgent.x + dx * progress * 0.5;
        const midY = fromAgent.y + dy * progress * 0.5 + sag * progress;
        
        graphics.moveTo(fromAgent.x, fromAgent.y);
        graphics.quadraticCurveTo(midX, midY, endX, endY);
        graphics.stroke({ width: 2.5, color, alpha });
        
        // Arrow head
        const angle = Math.atan2(dy, dx);
        const arrowSize = 10;
        
        graphics.moveTo(endX, endY);
        graphics.lineTo(
          endX - arrowSize * Math.cos(angle - Math.PI / 6),
          endY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        graphics.moveTo(endX, endY);
        graphics.lineTo(
          endX - arrowSize * Math.cos(angle + Math.PI / 6),
          endY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        graphics.stroke({ width: 2, color, alpha });
      }
    }
  }, []);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });

  // Initialize PixiJS
  useEffect(() => {
    if (!containerRef.current) return;

    const init = async () => {
      // Check WebGPU support first, then fall back to WebGL
      const webgpuCheck = await checkWebGPUSupport();
      console.log("[Swarm] WebGPU check result:", webgpuCheck);
      
      const webglCheck = checkWebGLSupport();
      console.log("[Swarm] WebGL check result:", webglCheck);

      const app = new Application();
      
      try {
        // Prefer WebGPU if available, fall back to WebGL
        const preference = webgpuCheck.supported ? "webgpu" : "webgl";
        console.log(`[Swarm] Initializing PixiJS with ${preference} renderer...`);
        
        await app.init({
          background: 0x030712,
          resizeTo: containerRef.current!,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          preference: preference,
        });
        console.log(`[Swarm] PixiJS initialized successfully with ${preference}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error("[Swarm] Failed to initialize PixiJS:", errorMsg);
        
        // Provide helpful error message
        if (errorMsg.includes("Canvas") || errorMsg.includes("WebGL")) {
          setError(`Graphics initialization failed: ${errorMsg}. Check browser://gpu in Brave for WebGL status.`);
        } else {
          setError(`Failed to initialize visualization: ${errorMsg}`);
        }
        setIsLoading(false);
        return;
      }

      containerRef.current!.appendChild(app.canvas);
      appRef.current = app;

      // Create world container for zoom/pan
      const world = new Container();
      app.stage.addChild(world);
      worldRef.current = world;

      // Create grid background (behind everything)
      const grid = new Graphics();
      world.addChild(grid);
      gridRef.current = grid;
      
      // Draw initial grid
      drawGrid(grid, app.screen.width, app.screen.height, 1);

      // Create connection layer (behind agents)
      const connectionGraphics = new Graphics();
      world.addChild(connectionGraphics);
      connectionGraphicsRef.current = connectionGraphics;

      // Update dimensions
      setDimensions({
        width: app.screen.width,
        height: app.screen.height,
      });

      setIsLoading(false);

      // Animation loop - redraw connections every frame
      app.ticker.add(() => {
        onTick?.();
        
        // Redraw connections every frame for smooth lines
        const graphics = connectionGraphicsRef.current;
        if (graphics) {
          drawConnections(graphics);
        }
      });

      // Handle resize
      const handleResize = () => {
        setDimensions({
          width: app.screen.width,
          height: app.screen.height,
        });
        // Redraw grid on resize
        if (gridRef.current) {
          drawGrid(gridRef.current, app.screen.width, app.screen.height, world.scale.x);
        }
      };

      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        app.destroy(true, { children: true });
      };
    };

    const cleanup = init();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [drawConnections]);

  // Create/update corporation graphics
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    const existingIds = new Set(corporationGraphicsRef.current.keys());
    const newIds = new Set(corporations.keys());

    // Remove corporations that no longer exist
    for (const id of existingIds) {
      if (!newIds.has(id)) {
        const container = corporationGraphicsRef.current.get(id);
        if (container) {
          worldRef.current?.removeChild(container);
          container.destroy({ children: true });
          corporationGraphicsRef.current.delete(id);
        }
      }
    }

    // Create or update corporations
    for (const [id, corp] of corporations) {
      let container = corporationGraphicsRef.current.get(id);

      if (!container) {
        // Create new corporation graphics
        container = new Container();

        // Corporation circle with gradient effect
        const circle = new Graphics();
        const size = corp.size || 60;
        const color = parseInt(corp.color?.replace("#", "") || "8b5cf6", 16);

        // Outer glow ring
        circle.circle(0, 0, size + 15);
        circle.fill({ color, alpha: 0.15 });
        
        // Middle ring
        circle.circle(0, 0, size + 8);
        circle.fill({ color, alpha: 0.25 });

        // Main circle
        circle.circle(0, 0, size);
        circle.fill({ color, alpha: 0.9 });

        // Inner highlight
        circle.circle(-size * 0.15, -size * 0.15, size * 0.25);
        circle.fill({ color: 0xffffff, alpha: 0.3 });

        container.addChild(circle);

        // Corporation name
        const textStyle = new TextStyle({
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 16,
          fontWeight: "bold",
          fill: 0xffffff,
          align: "center",
        });
        const nameText = new Text({ text: corp.name, style: textStyle });
        nameText.anchor.set(0.5, 0.5);
        nameText.y = size + 30;
        container.addChild(nameText);

        // Logo/emoji in center if present
        if (corp.logo) {
          const logoStyle = new TextStyle({
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: size * 0.6,
            align: "center",
          });
          const logoText = new Text({ text: corp.logo, style: logoStyle });
          logoText.anchor.set(0.5, 0.5);
          container.addChild(logoText);
        }

        worldRef.current?.addChild(container);
        corporationGraphicsRef.current.set(id, container);
      }

      // Update position
      container.x = corp.x;
      container.y = corp.y;

      // Animate glow
      const circle = container.children[0] as Graphics;
      if (circle) {
        const size = corp.size || 60;
        const color = parseInt(corp.color?.replace("#", "") || "8b5cf6", 16);
        const pulse = (Math.sin(Date.now() / 1000) + 1) / 2;

        circle.clear();

        // Pulsing outer glow
        circle.circle(0, 0, size + 15 + pulse * 5);
        circle.fill({ color, alpha: 0.1 + pulse * 0.1 });
        
        // Middle ring
        circle.circle(0, 0, size + 8);
        circle.fill({ color, alpha: 0.25 });

        // Main circle
        circle.circle(0, 0, size);
        circle.fill({ color, alpha: 0.9 });

        // Inner highlight
        circle.circle(-size * 0.15, -size * 0.15, size * 0.25);
        circle.fill({ color: 0xffffff, alpha: 0.3 });
      }
    }
  }, [corporations]);

  // Create/update agent graphics
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    const existingIds = new Set(agentGraphicsRef.current.keys());
    const newIds = new Set(agents.keys());

    // Remove agents that no longer exist
    for (const id of existingIds) {
      if (!newIds.has(id)) {
        const container = agentGraphicsRef.current.get(id);
        if (container) {
          worldRef.current?.removeChild(container);
          container.destroy({ children: true });
          agentGraphicsRef.current.delete(id);
        }
      }
    }

    // Create or update agents
    for (const [id, agent] of agents) {
      let container = agentGraphicsRef.current.get(id);

      if (!container) {
        // Create new agent graphics
        container = new Container();
        container.eventMode = "static";
        container.cursor = "pointer";

        // Agent circle
        const circle = new Graphics();
        const size = agent.size || 35;
        const color = parseInt(agent.color?.replace("#", "") || "8b5cf6", 16);

        // Outer glow
        circle.circle(0, 0, size + 8);
        circle.fill({ color, alpha: 0.2 });

        // Main circle
        circle.circle(0, 0, size);
        circle.fill({ color, alpha: 0.9 });

        // Inner highlight
        circle.circle(-size * 0.2, -size * 0.2, size * 0.3);
        circle.fill({ color: 0xffffff, alpha: 0.3 });

        container.addChild(circle);

        // Agent name
        const textStyle = new TextStyle({
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 12,
          fontWeight: "bold",
          fill: 0xffffff,
          align: "center",
        });
        const text = new Text({ text: agent.name, style: textStyle });
        text.anchor.set(0.5, 0.5);
        text.y = (agent.size || 35) + 20;
        container.addChild(text);

        // Event handlers
        container.on("pointerdown", () => onAgentClick?.(agent));
        container.on("pointerover", () => onAgentHover?.(agent));
        container.on("pointerout", () => onAgentHover?.(null));

        worldRef.current?.addChild(container);
        agentGraphicsRef.current.set(id, container);
      }

      // Update position
      container.x = agent.x;
      container.y = agent.y;

      // Update visual based on status
      const circle = container.children[0] as Graphics;
      if (circle) {
        const size = agent.size || 35;
        const baseColor = parseInt(agent.color?.replace("#", "") || "8b5cf6", 16);

        circle.clear();

        // Pulsing glow for active agents
        if (agent.status === "calling" || agent.status === "busy") {
          const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
          const glowSize = size + 12 + pulse * 8;
          circle.circle(0, 0, glowSize);
          circle.fill({
            color: agent.status === "calling" ? 0x06b6d4 : 0x8b5cf6,
            alpha: 0.3 + pulse * 0.2,
          });
        } else {
          circle.circle(0, 0, size + 8);
          circle.fill({ color: baseColor, alpha: 0.2 });
        }

        // Main circle
        circle.circle(0, 0, size);
        circle.fill({ color: baseColor, alpha: 0.9 });

        // Inner highlight
        circle.circle(-size * 0.2, -size * 0.2, size * 0.3);
        circle.fill({ color: 0xffffff, alpha: 0.3 });

        // Status indicator
        if (agent.status !== "idle") {
          const statusColor = agent.status === "calling" ? 0x06b6d4 : 0xf59e0b;
          circle.circle(size * 0.6, -size * 0.6, 8);
          circle.fill({ color: statusColor });
          circle.stroke({ width: 2, color: 0x030712 });
        }
      }
    }
  }, [agents, onAgentClick, onAgentHover]);

  // Handle zoom
  const handleZoom = useCallback((delta: number, centerX?: number, centerY?: number) => {
    const world = worldRef.current;
    const app = appRef.current;
    if (!world || !app) return;

    const oldZoom = world.scale.x;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldZoom + delta));
    
    if (newZoom === oldZoom) return;

    // Zoom towards center of screen or mouse position
    const cx = centerX ?? app.screen.width / 2;
    const cy = centerY ?? app.screen.height / 2;

    // Calculate the world position under the cursor before zoom
    const worldX = (cx - world.x) / oldZoom;
    const worldY = (cy - world.y) / oldZoom;

    // Apply new zoom
    world.scale.set(newZoom);

    // Adjust position to keep the point under cursor stationary
    world.x = cx - worldX * newZoom;
    world.y = cy - worldY * newZoom;

    setZoom(newZoom);
  }, []);

  // Reset zoom
  const handleResetZoom = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    
    world.scale.set(1);
    world.x = 0;
    world.y = 0;
    setZoom(1);
  }, []);

  // Mouse wheel zoom and pan handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      handleZoom(delta, x, y);
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Left click to drag/pan
      if (e.button === 0) {
        setIsPanning(true);
        lastPanPos.current = { x: e.clientX, y: e.clientY };
        container.style.cursor = "grabbing";
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      
      const world = worldRef.current;
      if (!world) return;

      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      
      world.x += dx;
      world.y += dy;
      
      lastPanPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
        container.style.cursor = "";
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    
    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleZoom, isPanning]);

  return (
    <div className="w-full h-full relative">
      {/* Always render the canvas container so the ref is captured */}
      <div
        ref={containerRef}
        className={`w-full h-full cursor-grab ${isLoading || error ? "invisible" : ""}`}
      />
      
      {/* Zoom controls */}
      {!isLoading && !error && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            onClick={() => handleZoom(ZOOM_STEP)}
            className="p-2 bg-gray-900/90 backdrop-blur-lg border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5 text-gray-300" />
          </button>
          <div className="px-2 py-1 bg-gray-900/90 backdrop-blur-lg border border-gray-700 rounded-lg text-center">
            <span className="text-xs text-gray-400">{Math.round(zoom * 100)}%</span>
          </div>
          <button
            onClick={() => handleZoom(-ZOOM_STEP)}
            className="p-2 bg-gray-900/90 backdrop-blur-lg border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5 text-gray-300" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 bg-gray-900/90 backdrop-blur-lg border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
            title="Reset zoom"
          >
            <Maximize2 className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-2xl border border-gray-800">
          <div className="text-center p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Visualization Error</h3>
            <p className="text-gray-400 text-sm max-w-md mb-4">{error}</p>
            <div className="text-xs text-gray-500 bg-gray-800/50 rounded-lg p-3 text-left max-w-md">
              <p className="font-semibold mb-1">Troubleshooting for Brave on Linux:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open <code className="bg-gray-700 px-1 rounded">brave://gpu</code> to check WebGL status</li>
                <li>Try <code className="bg-gray-700 px-1 rounded">brave://flags/#use-angle</code> → set to &quot;OpenGL&quot;</li>
                <li>Ensure GPU drivers are up to date</li>
                <li>Try disabling hardware acceleration then re-enabling it</li>
              </ol>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
