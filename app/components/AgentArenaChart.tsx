"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";

interface AgentData {
  id: string;
  name: string;
  avatar: string;
  color: string;
  pnl: number;
  trend: "up" | "down";
  position: number;
  priceHistory: number[];
}

const initialAgents: AgentData[] = [
  {
    id: "1",
    name: "Alpha.ai",
    avatar: "🤖",
    color: "#6FEC06", // Coral
    pnl: 247.5,
    trend: "up",
    position: 1,
    priceHistory: [100, 115, 108, 125, 142, 138, 155, 148, 165, 172, 185, 195],
  },
  {
    id: "2",
    name: "Sigma.ai",
    avatar: "🧠",
    color: "#4a3ab0", // Indigo light
    pnl: 182.3,
    trend: "up",
    position: 2,
    priceHistory: [100, 95, 110, 105, 118, 132, 128, 145, 155, 150, 168, 175],
  },
  {
    id: "3",
    name: "Delta.ai",
    avatar: "⚡",
    color: "#9FF24A", // Coral light
    pnl: -45.2,
    trend: "down",
    position: 3,
    priceHistory: [100, 108, 102, 98, 92, 105, 95, 88, 82, 78, 85, 75],
  },
  {
    id: "4",
    name: "Omega.ai",
    avatar: "🔥",
    color: "#10b981", // Green
    pnl: 89.7,
    trend: "up",
    position: 4,
    priceHistory: [100, 98, 105, 112, 108, 115, 125, 120, 132, 140, 148, 155],
  },
];

export default function AgentArenaChart() {
  const [agents, setAgents] = useState<AgentData[]>(initialAgents);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    value: number;
    agent: string;
  } | null>(null);
  const chartRef = useRef<SVGSVGElement>(null);

  // Animate price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prevAgents) =>
        prevAgents.map((agent) => {
          const change = (Math.random() - 0.5) * 15;
          const lastPrice = agent.priceHistory[agent.priceHistory.length - 1];
          const newPrice = Math.max(20, lastPrice + change);
          const newHistory = [...agent.priceHistory.slice(1), newPrice];
          const newPnl = agent.pnl + change * 0.1;

          return {
            ...agent,
            priceHistory: newHistory,
            pnl: newPnl,
            trend: change > 0 ? "up" : "down",
          };
        }),
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const chartWidth = 600;
  const chartHeight = 300;
  const padding = 40;

  // Memoize expensive calculations
  const { minPrice, maxPrice } = useMemo(() => {
    const allPrices = agents.flatMap((a) => a.priceHistory);
    return {
      minPrice: Math.min(...allPrices) * 0.9,
      maxPrice: Math.max(...allPrices) * 1.1,
    };
  }, [agents]);

  const getX = useCallback(
    (index: number) => padding + (index / 11) * (chartWidth - padding * 2),
    [],
  );

  const getY = useCallback(
    (price: number) =>
      chartHeight -
      padding -
      ((price - minPrice) / (maxPrice - minPrice)) *
        (chartHeight - padding * 2),
    [minPrice, maxPrice],
  );

  const createPath = useCallback(
    (prices: number[]) => {
      return prices
        .map((price, i) => {
          const x = getX(i);
          const y = getY(price);
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ");
    },
    [getX, getY],
  );

  // Create smooth area path for gradient fill
  const createAreaPath = useCallback(
    (prices: number[]) => {
      const linePath = createPath(prices);
      const lastX = getX(prices.length - 1);
      const firstX = getX(0);
      return `${linePath} L ${lastX} ${chartHeight - padding} L ${firstX} ${chartHeight - padding} Z`;
    },
    [createPath, getX],
  );

  return (
    <div className="relative">
      {/* Chart Container */}
      <div className="gradient-border p-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-[#6FEC06]/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Chart Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Q1 2026 Agent Arena
            </h3>
            <p className="text-sm text-white/60">
              Live PNL Performance Tracking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10b981]/20 text-[#10b981] rounded-full text-xs font-medium">
              <span className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
              Live
            </span>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="relative">
          <svg
            ref={chartRef}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-auto"
            style={{ maxHeight: "300px" }}
          >
            <defs>
              {agents.map((agent) => (
                <linearGradient
                  key={`gradient-${agent.id}`}
                  id={`area-gradient-${agent.id}`}
                  x1="0%"
                  y1="0%"
                  x2="0%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={agent.color} stopOpacity="0.3" />
                  <stop
                    offset="100%"
                    stopColor={agent.color}
                    stopOpacity="0.02"
                  />
                </linearGradient>
              ))}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map((i) => {
              const y = padding + (i / 4) * (chartHeight - padding * 2);
              return (
                <g key={`grid-${i}`}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={chartWidth - padding}
                    y2={y}
                    stroke="rgba(111, 236, 6, 0.1)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding - 8}
                    y={y + 4}
                    fill="rgba(255, 255, 255, 0.4)"
                    fontSize="10"
                    textAnchor="end"
                  >
                    {Math.round(maxPrice - (i / 4) * (maxPrice - minPrice))}
                  </text>
                </g>
              );
            })}

            {/* X-axis labels */}
            {["Jan", "Feb", "Mar"].map((month, i) => (
              <text
                key={month}
                x={padding + (i * 5 + 2) * ((chartWidth - padding * 2) / 11)}
                y={chartHeight - 15}
                fill="rgba(255, 255, 255, 0.4)"
                fontSize="10"
                textAnchor="middle"
              >
                {month}
              </text>
            ))}

            {/* Area fills */}
            {agents.map((agent) => (
              <path
                key={`area-${agent.id}`}
                d={createAreaPath(agent.priceHistory)}
                fill={`url(#area-gradient-${agent.id})`}
                opacity={
                  selectedAgent === null || selectedAgent === agent.id ? 1 : 0.2
                }
                className="transition-opacity duration-300"
              />
            ))}

            {/* Price lines */}
            {agents.map((agent) => (
              <path
                key={`line-${agent.id}`}
                d={createPath(agent.priceHistory)}
                fill="none"
                stroke={agent.color}
                strokeWidth={selectedAgent === agent.id ? 3 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={selectedAgent === agent.id ? "url(#glow)" : ""}
                opacity={
                  selectedAgent === null || selectedAgent === agent.id ? 1 : 0.3
                }
                className="transition-all duration-300"
              />
            ))}

            {/* Agent avatars at current position */}
            {agents.map((agent) => {
              const currentPrice =
                agent.priceHistory[agent.priceHistory.length - 1];
              const x = getX(agent.priceHistory.length - 1);
              const y = getY(currentPrice);

              return (
                <g
                  key={`avatar-${agent.id}`}
                  className="cursor-pointer transition-transform duration-300"
                  onMouseEnter={() => setSelectedAgent(agent.id)}
                  onMouseLeave={() => setSelectedAgent(null)}
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                >
                  {/* Glow ring */}
                  <circle
                    cx={0}
                    cy={0}
                    r={selectedAgent === agent.id ? 22 : 18}
                    fill={agent.color}
                    opacity={0.2}
                    className="transition-all duration-300"
                  />
                  {/* Agent circle */}
                  <circle
                    cx={0}
                    cy={0}
                    r={16}
                    fill="#000028"
                    stroke={agent.color}
                    strokeWidth={2}
                  />
                  {/* Avatar */}
                  <text
                    x={0}
                    y={5}
                    fontSize="14"
                    textAnchor="middle"
                    className="select-none"
                  >
                    {agent.avatar}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Hover tooltip */}
          {hoveredPoint && (
            <div
              className="absolute bg-[#000028] border border-[#6FEC06]/30 rounded-lg px-3 py-2 text-sm pointer-events-none z-10"
              style={{
                left: hoveredPoint.x,
                top: hoveredPoint.y - 50,
              }}
            >
              <div className="text-white/60">{hoveredPoint.agent}</div>
              <div className="text-white font-semibold">
                ${hoveredPoint.value.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Agent Legend / Leaderboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[...agents]
            .sort((a, b) => b.pnl - a.pnl)
            .map((agent, index) => (
              <div
                key={agent.id}
                className={`relative p-3 rounded-xl bg-[#120557]/30 border transition-all duration-300 cursor-pointer ${
                  selectedAgent === agent.id
                    ? "border-[#6FEC06]/50 bg-[#6FEC06]/10"
                    : "border-white/10 hover:border-white/20"
                }`}
                onMouseEnter={() => setSelectedAgent(agent.id)}
                onMouseLeave={() => setSelectedAgent(null)}
              >
                {/* Rank badge */}
                <div
                  className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0
                      ? "bg-[#fbbf24] text-black"
                      : index === 1
                        ? "bg-gray-400 text-black"
                        : index === 2
                          ? "bg-[#cd7f32] text-white"
                          : "bg-[#120557] text-white/60"
                  }`}
                >
                  {index + 1}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${agent.color}20` }}
                  >
                    {agent.avatar}
                  </div>
                  <div className="text-sm font-medium text-white truncate">
                    {agent.name}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">PNL</span>
                  <span
                    className={`text-sm font-semibold ${
                      agent.pnl >= 0 ? "text-[#10b981]" : "text-[#ef4444]"
                    }`}
                  >
                    {agent.pnl >= 0 ? "+" : ""}
                    {agent.pnl.toFixed(1)}%
                  </span>
                </div>

                {/* Mini trend indicator */}
                <div className="mt-2 flex items-center gap-1">
                  <div
                    className={`w-0 h-0 border-l-[4px] border-r-[4px] border-transparent ${
                      agent.trend === "up"
                        ? "border-b-[6px] border-b-[#10b981]"
                        : "border-t-[6px] border-t-[#ef4444]"
                    }`}
                  />
                  <span
                    className={`text-xs ${
                      agent.trend === "up" ? "text-[#10b981]" : "text-[#ef4444]"
                    }`}
                  >
                    {agent.trend === "up" ? "Bullish" : "Bearish"}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Perpetual Futures Trading Panel */}
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        {/* Long Position Card */}
        <div className="gradient-border p-4 group hover:border-[#10b981]/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#10b981]/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-[#10b981]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  Long Position
                </div>
                <div className="text-xs text-white/60">Bet agent goes up</div>
              </div>
            </div>
            <span className="text-xs text-white/40">Up to 10x</span>
          </div>
          <button
            disabled
            className="w-full py-2.5 bg-[#10b981]/20 text-[#10b981] rounded-lg font-medium text-sm hover:bg-[#10b981]/30 transition-colors flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
          >
            Open Long
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider bg-[#6FEC06]/20 text-[#6FEC06] rounded-full">
              Soon
            </span>
          </button>
        </div>

        {/* Short Position Card */}
        <div className="gradient-border p-4 group hover:border-[#ef4444]/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#ef4444]/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-[#ef4444]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
                  />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  Short Position
                </div>
                <div className="text-xs text-white/60">Bet agent goes down</div>
              </div>
            </div>
            <span className="text-xs text-white/40">Up to 10x</span>
          </div>
          <button
            disabled
            className="w-full py-2.5 bg-[#ef4444]/20 text-[#ef4444] rounded-lg font-medium text-sm hover:bg-[#ef4444]/30 transition-colors flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
          >
            Open Short
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider bg-[#6FEC06]/20 text-[#6FEC06] rounded-full">
              Soon
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
