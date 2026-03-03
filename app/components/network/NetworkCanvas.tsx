"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type {
  NetworkData,
  NetworkCollection,
  NetworkAgent,
} from "@/lib/network/types";
import {
  TRUST_TIER_COLORS,
  getCollectionColor,
  getCollectionRadius,
  getAgentRadius,
} from "@/lib/network/types";

// ── Constants ────────────────────────────────────────────────────────────────

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.15;
const GRID_SIZE = 60;
const BG = 0x030712;
const GRID_MINOR = 0x111827;
const GRID_MAJOR = 0x1f2937;

const K_REPEL = 120000;
const K_CENTER = 0.004;
const DAMPING = 0.82;
const ALPHA_DECAY = 0.997;
const ALPHA_MIN = 0.005;

const AGENTS_PER_RING = 14;
const RING_GAP = 22;
const ORBIT_SPEED = 0.00015;

// ── Force Simulation Node ────────────────────────────────────────────────────

interface ForceNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  fixed: boolean;
  color: number;
}

interface VisAgent {
  asset: string;
  collId: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  name: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function tickForce(
  nodes: ForceNode[],
  cx: number,
  cy: number,
  alpha: number,
) {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 60);
      const minDist = a.radius + b.radius + 80;
      const force = K_REPEL * ((a.mass + b.mass) / 2) / (dist * dist);
      const extra = dist < minDist ? (minDist - dist) * 2 : 0;
      const fx = (dx / dist) * (force + extra);
      const fy = (dy / dist) * (force + extra);
      if (!a.fixed) { a.vx -= fx; a.vy -= fy; }
      if (!b.fixed) { b.vx += fx; b.vy += fy; }
    }
  }

  for (const n of nodes) {
    if (n.fixed) continue;
    n.vx += (cx - n.x) * K_CENTER;
    n.vy += (cy - n.y) * K_CENTER;
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x += n.vx * alpha;
    n.y += n.vy * alpha;
  }
}

function positionAgents(
  agents: VisAgent[],
  collNode: ForceNode,
  time: number,
) {
  const baseR = collNode.radius + 30;
  const len = agents.length;
  for (let i = 0; i < len; i++) {
    const ring = Math.floor(i / AGENTS_PER_RING);
    const idx = i % AGENTS_PER_RING;
    const inRing = Math.min(AGENTS_PER_RING, len - ring * AGENTS_PER_RING);
    const r = baseR + ring * RING_GAP;
    const dir = ring % 2 === 0 ? 1 : -1;
    const base = (idx / inRing) * Math.PI * 2 - Math.PI / 2;
    const angle = base + time * ORBIT_SPEED * dir;
    agents[i].x = collNode.x + Math.cos(angle) * r;
    agents[i].y = collNode.y + Math.sin(angle) * r;
  }
}

function drawGrid(g: Graphics, w: number, h: number, scale: number) {
  g.clear();
  const pad = 3000;
  const sx = -pad;
  const sy = -pad;
  const ex = w / scale + pad;
  const ey = h / scale + pad;

  for (let x = sx; x <= ex; x += GRID_SIZE) {
    const major = Math.round(x) % (GRID_SIZE * 5) === 0;
    g.moveTo(x, sy);
    g.lineTo(x, ey);
    g.stroke({ width: major ? 1 : 0.5, color: major ? GRID_MAJOR : GRID_MINOR, alpha: major ? 0.5 : 0.3 });
  }
  for (let y = sy; y <= ey; y += GRID_SIZE) {
    const major = Math.round(y) % (GRID_SIZE * 5) === 0;
    g.moveTo(sx, y);
    g.lineTo(ex, y);
    g.stroke({ width: major ? 1 : 0.5, color: major ? GRID_MAJOR : GRID_MINOR, alpha: major ? 0.5 : 0.3 });
  }
}

// ── Props ────────────────────────────────────────────────────────────────────

interface NetworkCanvasProps {
  data: NetworkData;
  searchQuery: string;
  onSelectCollection: (c: NetworkCollection | null) => void;
  onSelectAgent: (a: NetworkAgent | null) => void;
  selectedCollectionId: string | null;
  selectedAgentAsset: string | null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NetworkCanvas({
  data,
  searchQuery,
  onSelectCollection,
  onSelectAgent,
  selectedCollectionId,
  selectedAgentAsset,
}: NetworkCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const worldRef = useRef<Container | null>(null);
  const gridRef = useRef<Graphics | null>(null);
  const connGfxRef = useRef<Graphics | null>(null);
  const highlightGfxRef = useRef<Graphics | null>(null);

  const collContainersRef = useRef(new Map<string, Container>());
  const agentContainersRef = useRef(new Map<string, Container>());

  const forceNodesRef = useRef<ForceNode[]>([]);
  const visAgentsRef = useRef<VisAgent[]>([]);
  const alphaRef = useRef(1);
  const centerRef = useRef({ x: 0, y: 0 });
  const clickedNodeRef = useRef(false);
  const dataRef = useRef(data);
  const selectedCollIdRef = useRef(selectedCollectionId);
  const selectedAgentRef = useRef(selectedAgentAsset);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pixiReady, setPixiReady] = useState(false);
  const [zoom, setZoom] = useState(0.65);
  const [isPanning, setIsPanning] = useState(false);
  const lastPan = useRef({ x: 0, y: 0 });

  // Keep refs current
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { selectedCollIdRef.current = selectedCollectionId; }, [selectedCollectionId]);
  useEffect(() => { selectedAgentRef.current = selectedAgentAsset; }, [selectedAgentAsset]);

  // ── Build force nodes + agent nodes when data changes ──────────────────

  useEffect(() => {
    const app = appRef.current;
    const cx = app ? app.screen.width / 2 : 900;
    const cy = app ? app.screen.height / 2 : 500;
    centerRef.current = { x: cx, y: cy };

    const nodes: ForceNode[] = data.collections.map((coll, i) => {
      const radius = getCollectionRadius(coll.agentCount);
      const color = getCollectionColor(coll.name, coll.isOwn);
      const angle = (i / Math.max(data.collections.length, 1)) * Math.PI * 2;
      const dist = coll.isOwn ? 0 : 450 + Math.random() * 150;
      return {
        id: coll.id,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius,
        mass: 1 + coll.agentCount * 0.3,
        fixed: coll.isOwn,
        color,
      };
    });

    const ownNode = nodes.find((n) => n.fixed);
    if (ownNode) {
      ownNode.x = cx;
      ownNode.y = cy;
    }

    const agents: VisAgent[] = [];
    for (const coll of data.collections) {
      for (const a of coll.agents) {
        agents.push({
          asset: a.asset,
          collId: coll.id,
          x: 0,
          y: 0,
          radius: getAgentRadius(a.qualityScore),
          color: TRUST_TIER_COLORS[a.trustTier] ?? TRUST_TIER_COLORS[0],
          name: a.name || "Agent",
        });
      }
    }

    forceNodesRef.current = nodes;
    visAgentsRef.current = agents;
    alphaRef.current = 1;
  }, [data]);

  // ── Draw connections (called every frame) ──────────────────────────────

  const drawConnections = useCallback(() => {
    const gfx = connGfxRef.current;
    if (!gfx) return;
    gfx.clear();

    const nodes = forceNodesRef.current;
    const agents = visAgentsRef.current;
    const time = Date.now() / 1000;

    // Cluster bubbles around each collection
    for (const node of nodes) {
      const collAgents = agents.filter((a) => a.collId === node.id);
      if (collAgents.length === 0) continue;

      let maxD = 0;
      for (const a of collAgents) {
        const dx = a.x - node.x;
        const dy = a.y - node.y;
        const d = Math.sqrt(dx * dx + dy * dy) + a.radius + 12;
        if (d > maxD) maxD = d;
      }

      const breathe = Math.sin(time * 0.6 + node.x * 0.001) * 6;
      const bubR = Math.max(maxD, node.radius + 50) + breathe;

      gfx.circle(node.x, node.y, bubR);
      gfx.fill({ color: node.color, alpha: 0.018 });
      gfx.circle(node.x, node.y, bubR);
      gfx.stroke({ width: 1.5, color: node.color, alpha: 0.07 });
    }

    // Agent-to-collection lines (very subtle)
    for (const a of agents) {
      const node = nodes.find((n) => n.id === a.collId);
      if (!node) continue;
      gfx.moveTo(node.x, node.y);
      gfx.lineTo(a.x, a.y);
      gfx.stroke({ width: 0.6, color: node.color, alpha: 0.06 });
    }

    // Inter-collection network lines (from each to closest 2)
    if (nodes.length > 1) {
      const ownNode = nodes.find((n) => n.fixed);
      for (const node of nodes) {
        if (node.fixed) continue;
        const target = ownNode || nodes[0];
        const dx = target.x - node.x;
        const dy = target.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const sag = Math.min(dist * 0.06, 25);
        const mx = (node.x + target.x) / 2;
        const my = (node.y + target.y) / 2 + sag;

        gfx.moveTo(node.x, node.y);
        gfx.quadraticCurveTo(mx, my, target.x, target.y);
        gfx.stroke({ width: 1.5, color: node.color, alpha: 0.12 });

        for (let i = 0; i < 2; i++) {
          const t = (time * 0.15 + i / 2) % 1;
          const px = (1 - t) ** 2 * node.x + 2 * (1 - t) * t * mx + t * t * target.x;
          const py = (1 - t) ** 2 * node.y + 2 * (1 - t) * t * my + t * t * target.y;
          gfx.circle(px, py, 2.5);
          gfx.fill({ color: node.color, alpha: Math.sin(t * Math.PI) * 0.4 });
        }
      }
    }
  }, []);

  // ── Draw selection/hover highlights ────────────────────────────────────

  const drawHighlights = useCallback(() => {
    const gfx = highlightGfxRef.current;
    if (!gfx) return;
    gfx.clear();

    const time = Date.now() / 1000;
    const pulse = (Math.sin(time * 3) + 1) / 2;

    const collId = selectedCollIdRef.current;
    if (collId) {
      const node = forceNodesRef.current.find((n) => n.id === collId);
      if (node) {
        gfx.circle(node.x, node.y, node.radius + 20 + pulse * 6);
        gfx.stroke({ width: 2, color: 0xffffff, alpha: 0.3 + pulse * 0.2 });
      }
    }

    const agentAsset = selectedAgentRef.current;
    if (agentAsset) {
      const agent = visAgentsRef.current.find((a) => a.asset === agentAsset);
      if (agent) {
        gfx.circle(agent.x, agent.y, agent.radius + 10 + pulse * 4);
        gfx.stroke({ width: 2, color: 0xffffff, alpha: 0.4 + pulse * 0.3 });
      }
    }
  }, []);

  // ── Initialize PixiJS ──────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;
    let destroyed = false;

    const init = async () => {
      const app = new Application();
      try {
        let pref: "webgpu" | "webgl" = "webgl";
        try {
          if (navigator.gpu && (await navigator.gpu.requestAdapter())) pref = "webgpu";
        } catch { /* fallback */ }

        await app.init({
          background: BG,
          resizeTo: el,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
          preference: pref,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setIsLoading(false);
        return;
      }

      if (destroyed) { app.destroy(true); return; }

      el.appendChild(app.canvas);
      appRef.current = app;

      const world = new Container();
      app.stage.addChild(world);
      worldRef.current = world;

      // Initial zoom
      world.scale.set(0.65);
      world.x = app.screen.width * 0.175;
      world.y = app.screen.height * 0.175;

      const grid = new Graphics();
      world.addChild(grid);
      gridRef.current = grid;
      drawGrid(grid, app.screen.width, app.screen.height, 0.65);

      const connGfx = new Graphics();
      world.addChild(connGfx);
      connGfxRef.current = connGfx;

      const highlightGfx = new Graphics();
      world.addChild(highlightGfx);
      highlightGfxRef.current = highlightGfx;

      centerRef.current = {
        x: app.screen.width / 2 / 0.65,
        y: app.screen.height / 2 / 0.65,
      };

      setIsLoading(false);
      setPixiReady(true);

      // ── Ticker ──

      app.ticker.add(() => {
        const nodes = forceNodesRef.current;
        const agents = visAgentsRef.current;
        const alpha = alphaRef.current;
        const { x: cx, y: cy } = centerRef.current;
        const t = Date.now();

        if (alpha > ALPHA_MIN) {
          tickForce(nodes, cx, cy, alpha);
          alphaRef.current *= ALPHA_DECAY;
        }

        // Position agents around their collection
        for (const node of nodes) {
          const collAgents = agents.filter((a) => a.collId === node.id);
          positionAgents(collAgents, node, t);
        }

        // Update PixiJS container positions
        for (const node of nodes) {
          const c = collContainersRef.current.get(node.id);
          if (c) { c.x = node.x; c.y = node.y; }
        }
        for (const a of agents) {
          const c = agentContainersRef.current.get(a.asset);
          if (c) { c.x = a.x; c.y = a.y; }
        }

        drawConnections();
        drawHighlights();
      });

      // Resize handler
      const onResize = () => {
        const w = app.screen.width;
        const h = app.screen.height;
        const s = world.scale.x;
        centerRef.current = { x: w / 2 / s, y: h / 2 / s };
        if (gridRef.current) drawGrid(gridRef.current, w, h, s);
        alphaRef.current = Math.max(alphaRef.current, 0.1);
      };
      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
        app.destroy(true, { children: true });
      };
    };

    const cleanup = init();
    return () => {
      destroyed = true;
      cleanup.then((fn) => fn?.());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawConnections, drawHighlights]);

  // ── Create / update collection containers ──────────────────────────────

  useEffect(() => {
    const world = worldRef.current;
    if (!world || !appRef.current) return;

    const existing = collContainersRef.current;
    const newIds = new Set(data.collections.map((c) => c.id));

    // Remove stale
    for (const [id, c] of existing) {
      if (!newIds.has(id)) {
        world.removeChild(c);
        c.destroy({ children: true });
        existing.delete(id);
      }
    }

    for (const coll of data.collections) {
      if (existing.has(coll.id)) continue;

      const c = new Container();
      c.eventMode = "static";
      c.cursor = "pointer";

      const radius = getCollectionRadius(coll.agentCount);
      const color = getCollectionColor(coll.name, coll.isOwn);

      const gfx = new Graphics();

      // Outer glow
      gfx.circle(0, 0, radius + 18);
      gfx.fill({ color, alpha: 0.1 });

      // Mid ring
      gfx.circle(0, 0, radius + 8);
      gfx.fill({ color, alpha: 0.2 });

      // Main
      gfx.circle(0, 0, radius);
      gfx.fill({ color, alpha: 0.85 });

      // Highlight
      gfx.circle(-radius * 0.2, -radius * 0.2, radius * 0.35);
      gfx.fill({ color: 0xffffff, alpha: 0.18 });

      c.addChild(gfx);

      // Name
      const nameStyle = new TextStyle({
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 15,
        fontWeight: "bold",
        fill: 0xffffff,
        align: "center",
        dropShadow: { color: 0x000000, alpha: 0.6, blur: 4, distance: 0 },
      });
      const nameTxt = new Text({ text: coll.name, style: nameStyle });
      nameTxt.anchor.set(0.5, 0.5);
      nameTxt.y = radius + 24;
      c.addChild(nameTxt);

      // Agent count badge
      const badgeStyle = new TextStyle({
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 11,
        fill: color,
        align: "center",
      });
      const badgeTxt = new Text({
        text: `${coll.agentCount} agent${coll.agentCount !== 1 ? "s" : ""}`,
        style: badgeStyle,
      });
      badgeTxt.anchor.set(0.5, 0.5);
      badgeTxt.y = radius + 42;
      c.addChild(badgeTxt);

      // If own collection, add a star/home badge
      if (coll.isOwn) {
        const homeStyle = new TextStyle({
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: radius * 0.45,
          align: "center",
        });
        const homeTxt = new Text({ text: "🏠", style: homeStyle });
        homeTxt.anchor.set(0.5, 0.5);
        c.addChild(homeTxt);
      } else if (coll.symbol) {
        const symStyle = new TextStyle({
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: Math.min(14, radius * 0.35),
          fontWeight: "bold",
          fill: 0xffffff,
          align: "center",
        });
        const symTxt = new Text({ text: coll.symbol, style: symStyle });
        symTxt.anchor.set(0.5, 0.5);
        c.addChild(symTxt);
      }

      c.on("pointerdown", () => {
        clickedNodeRef.current = true;
        onSelectAgent(null);
        onSelectCollection(coll);
      });

      world.addChild(c);
      existing.set(coll.id, c);
    }
  }, [data, pixiReady, onSelectCollection, onSelectAgent]);

  // ── Create / update agent containers ───────────────────────────────────

  useEffect(() => {
    const world = worldRef.current;
    if (!world || !appRef.current) return;

    const existing = agentContainersRef.current;
    const allAgents = data.collections.flatMap((c) =>
      c.agents.map((a) => ({ ...a, collId: c.id, collName: c.name, collIsOwn: c.isOwn })),
    );
    const newAssets = new Set(allAgents.map((a) => a.asset));

    // Remove stale
    for (const [asset, c] of existing) {
      if (!newAssets.has(asset)) {
        world.removeChild(c);
        c.destroy({ children: true });
        existing.delete(asset);
      }
    }

    for (const a of allAgents) {
      if (existing.has(a.asset)) continue;

      const c = new Container();
      c.eventMode = "static";
      c.cursor = "pointer";

      const radius = getAgentRadius(a.qualityScore);
      const color = TRUST_TIER_COLORS[a.trustTier] ?? TRUST_TIER_COLORS[0];

      const gfx = new Graphics();
      gfx.circle(0, 0, radius + 4);
      gfx.fill({ color, alpha: 0.15 });
      gfx.circle(0, 0, radius);
      gfx.fill({ color, alpha: 0.9 });
      gfx.circle(-radius * 0.2, -radius * 0.2, radius * 0.3);
      gfx.fill({ color: 0xffffff, alpha: 0.25 });
      c.addChild(gfx);

      // Name label (hidden by default, shown on hover / zoom)
      const labelStyle = new TextStyle({
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 10,
        fill: 0xd1d5db,
        align: "center",
        dropShadow: { color: 0x000000, alpha: 0.8, blur: 3, distance: 0 },
      });
      const label = new Text({ text: a.name || "Agent", style: labelStyle });
      label.anchor.set(0.5, 0.5);
      label.y = radius + 14;
      label.visible = false;
      c.addChild(label);

      c.on("pointerdown", () => {
        clickedNodeRef.current = true;
        onSelectCollection(null);
        const fullAgent = dataRef.current.collections
          .flatMap((col) => col.agents)
          .find((ag) => ag.asset === a.asset);
        onSelectAgent(fullAgent ?? null);
      });

      c.on("pointerover", () => { label.visible = true; });
      c.on("pointerout", () => { label.visible = false; });

      world.addChild(c);
      existing.set(a.asset, c);
    }
  }, [data, pixiReady, onSelectCollection, onSelectAgent]);

  // ── Search highlight (fade non-matching) ───────────────────────────────

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    for (const coll of data.collections) {
      const c = collContainersRef.current.get(coll.id);
      if (!c) continue;
      if (!q) { c.alpha = 1; continue; }
      c.alpha = coll.name.toLowerCase().includes(q) ? 1 : 0.15;
    }
    const allAgents = data.collections.flatMap((col) => col.agents);
    for (const a of allAgents) {
      const c = agentContainersRef.current.get(a.asset);
      if (!c) continue;
      if (!q) { c.alpha = 1; continue; }
      c.alpha = (a.name || "").toLowerCase().includes(q) ? 1 : 0.15;
    }
  }, [searchQuery, data]);

  // ── Zoom handler ───────────────────────────────────────────────────────

  const handleZoom = useCallback(
    (delta: number, cx?: number, cy?: number) => {
      const world = worldRef.current;
      const app = appRef.current;
      if (!world || !app) return;
      const old = world.scale.x;
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, old + delta));
      if (next === old) return;
      const px = cx ?? app.screen.width / 2;
      const py = cy ?? app.screen.height / 2;
      const wx = (px - world.x) / old;
      const wy = (py - world.y) / old;
      world.scale.set(next);
      world.x = px - wx * next;
      world.y = py - wy * next;
      setZoom(next);
    },
    [],
  );

  const handleResetZoom = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    world.scale.set(0.65);
    world.x = (appRef.current?.screen.width ?? 0) * 0.175;
    world.y = (appRef.current?.screen.height ?? 0) * 0.175;
    setZoom(0.65);
    alphaRef.current = 0.3;
  }, []);

  // ── Pan + wheel handlers ───────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const d = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      const r = el.getBoundingClientRect();
      handleZoom(d, e.clientX - r.left, e.clientY - r.top);
    };

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (clickedNodeRef.current) {
        clickedNodeRef.current = false;
        return;
      }
      setIsPanning(true);
      lastPan.current = { x: e.clientX, y: e.clientY };
      el.style.cursor = "grabbing";
    };

    const onMove = (e: MouseEvent) => {
      if (!isPanning) return;
      const world = worldRef.current;
      if (!world) return;
      world.x += e.clientX - lastPan.current.x;
      world.y += e.clientY - lastPan.current.y;
      lastPan.current = { x: e.clientX, y: e.clientY };
    };

    const onUp = () => {
      if (isPanning) {
        setIsPanning(false);
        el.style.cursor = "";
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [handleZoom, isPanning]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="w-full h-full relative">
      <div
        ref={containerRef}
        className={`w-full h-full cursor-grab ${isLoading || error ? "invisible" : ""}`}
      />

      {/* Zoom controls */}
      {!isLoading && !error && (
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
          <button
            onClick={() => handleZoom(ZOOM_STEP)}
            className="p-2 bg-gray-900/90 backdrop-blur-lg border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ZoomIn className="w-5 h-5 text-gray-300" />
          </button>
          <div className="px-2 py-1 bg-gray-900/90 backdrop-blur-lg border border-gray-700 rounded-lg text-center">
            <span className="text-xs text-gray-400">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <button
            onClick={() => handleZoom(-ZOOM_STEP)}
            className="p-2 bg-gray-900/90 backdrop-blur-lg border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ZoomOut className="w-5 h-5 text-gray-300" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 bg-gray-900/90 backdrop-blur-lg border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Maximize2 className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 rounded-2xl">
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Visualization Error</h3>
            <p className="text-gray-400 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
