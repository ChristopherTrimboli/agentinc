"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  Network,
  MessageSquare,
  Globe,
  Zap,
  Send,
  CheckCircle2,
  Clock,
} from "lucide-react";

// Live protocol activity feed
function ProtocolFeed() {
  const activities = useMemo(
    () => [
      {
        protocol: "MCP",
        action: "Task delegated",
        from: "CEO",
        to: "CTO",
        status: "complete",
      },
      {
        protocol: "A2A",
        action: "Resource shared",
        from: "CMO",
        to: "CEO",
        status: "pending",
      },
      {
        protocol: "MCP",
        action: "Code review",
        from: "CTO",
        to: "COO",
        status: "complete",
      },
      {
        protocol: "A2A",
        action: "Budget approved",
        from: "CFO",
        to: "CMO",
        status: "complete",
      },
      {
        protocol: "MCP",
        action: "Hiring request",
        from: "HR",
        to: "CEO",
        status: "pending",
      },
    ],
    [],
  );

  const [displayedActivities, setDisplayedActivities] = useState(
    activities.slice(0, 3),
  );

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % activities.length;
      setDisplayedActivities([
        activities[index % activities.length],
        activities[(index + 1) % activities.length],
        activities[(index + 2) % activities.length],
      ]);
    }, 2500);
    return () => clearInterval(interval);
  }, [activities]);

  return (
    <div className="space-y-2 min-h-[132px]">
      {displayedActivities.map((activity, i) => (
        <div
          key={`${activity.action}-${activity.from}-${i}`}
          className="flex items-center gap-3 p-2 rounded-lg bg-[#120557]/20"
        >
          <div
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              activity.protocol === "MCP"
                ? "bg-[#6FEC06]/20 text-[#6FEC06]"
                : "bg-[#4a3ab0]/30 text-[#4a3ab0]"
            }`}
          >
            {activity.protocol}
          </div>
          <div className="flex-1 text-xs">
            <span className="text-white/60">{activity.action}</span>
            <span className="text-white/30 mx-1">•</span>
            <span className="text-white/40">
              {activity.from} → {activity.to}
            </span>
          </div>
          {activity.status === "complete" ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-[#6FEC06] animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );
}

// Pre-computed node positions to avoid hydration mismatch from floating-point precision
// SVG coordinates: center (200, 200), radius 140
// CSS percentages: center (50%, 50%), radius 35%
const networkNodes = [
  {
    icon: "👔",
    label: "CEO",
    color: "#6FEC06",
    svgX: 340,
    svgY: 200,
    cssTop: 50,
    cssLeft: 85,
  }, // angle 0
  {
    icon: "💻",
    label: "CTO",
    color: "#4a3ab0",
    svgX: 270,
    svgY: 321.24,
    cssTop: 80.31,
    cssLeft: 67.5,
  }, // angle 60
  {
    icon: "📢",
    label: "CMO",
    color: "#9FF24A",
    svgX: 130,
    svgY: 321.24,
    cssTop: 80.31,
    cssLeft: 32.5,
  }, // angle 120
  {
    icon: "⚙️",
    label: "COO",
    color: "#10b981",
    svgX: 60,
    svgY: 200,
    cssTop: 50,
    cssLeft: 15,
  }, // angle 180
  {
    icon: "📊",
    label: "CFO",
    color: "#6FEC06",
    svgX: 130,
    svgY: 78.76,
    cssTop: 19.69,
    cssLeft: 32.5,
  }, // angle 240
  {
    icon: "🤝",
    label: "HR",
    color: "#4a3ab0",
    svgX: 270,
    svgY: 78.76,
    cssTop: 19.69,
    cssLeft: 67.5,
  }, // angle 300
];

// Pre-computed cross connections (indices: [from, to])
const crossConnections = [
  { from: 0, to: 2 }, // CEO -> CMO
  { from: 1, to: 3 }, // CTO -> COO
  { from: 2, to: 4 }, // CMO -> CFO
  { from: 3, to: 5 }, // COO -> HR
  { from: 4, to: 0 }, // CFO -> CEO
  { from: 5, to: 1 }, // HR -> CTO
];

// Enhanced network visualization
function NetworkVisualization() {
  const [activeConnection, setActiveConnection] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveConnection((prev) => (prev + 1) % 6);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full aspect-square max-w-[400px] mx-auto">
      {/* Animated background rings */}
      <div className="absolute inset-0">
        <div className="absolute inset-[5%] border border-[#6FEC06]/10 rounded-full animate-pulse" />
        <div className="absolute inset-[20%] border border-[#120557]/20 rounded-full" />
        <div className="absolute inset-[35%] border border-[#6FEC06]/20 rounded-full" />
      </div>

      {/* Data flow particles */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400">
        <defs>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6FEC06" stopOpacity="0" />
            <stop offset="50%" stopColor="#9FF24A" stopOpacity="1" />
            <stop offset="100%" stopColor="#6FEC06" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connection lines with animated flow */}
        {networkNodes.map((node, i) => {
          const x1 = 200;
          const y1 = 200;
          const x2 = node.svgX;
          const y2 = node.svgY;
          const isActive = i === activeConnection;

          return (
            <g key={i}>
              {/* Base line */}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isActive ? node.color : "rgba(111, 236, 6, 0.2)"}
                strokeWidth={isActive ? 2 : 1}
                filter={isActive ? "url(#glow)" : undefined}
                className="transition-all duration-500"
              />
              {/* Animated particle */}
              {isActive && (
                <circle r="4" fill={node.color} filter="url(#glow)">
                  <animateMotion
                    dur="1s"
                    repeatCount="indefinite"
                    path={`M${x1},${y1} L${x2},${y2}`}
                  />
                </circle>
              )}
            </g>
          );
        })}

        {/* Cross connections */}
        {crossConnections.map((conn, i) => {
          const fromNode = networkNodes[conn.from];
          const toNode = networkNodes[conn.to];

          return (
            <line
              key={`cross-${i}`}
              x1={fromNode.svgX}
              y1={fromNode.svgY}
              x2={toNode.svgX}
              y2={toNode.svgY}
              stroke="rgba(111, 236, 6, 0.1)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          );
        })}
      </svg>

      {/* Central hub */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6FEC06] via-[#9FF24A] to-[#6FEC06] p-[2px] animate-spin"
            style={{ animationDuration: "8s" }}
          >
            <div className="w-full h-full rounded-full bg-[#000028] flex items-center justify-center">
              <Network className="w-8 h-8 text-white" />
            </div>
          </div>
          {/* Pulse rings */}
          <div
            className="absolute inset-0 rounded-full border-2 border-[#6FEC06]/50 animate-ping"
            style={{ animationDuration: "2s" }}
          />
        </div>
      </div>

      {/* Orbiting nodes */}
      {networkNodes.map((node, i) => (
        <div
          key={i}
          className="absolute z-10 group"
          style={{
            top: `${node.cssTop}%`,
            left: `${node.cssLeft}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className={`relative w-16 h-16 rounded-2xl bg-[#000028] border-2 flex flex-col items-center justify-center transition-all duration-300 ${
              i === activeConnection
                ? "border-[#6FEC06] shadow-lg shadow-[#6FEC06]/30 scale-110"
                : "border-white/10 hover:border-[#6FEC06]/50"
            }`}
          >
            <span className="text-2xl">{node.icon}</span>
            <span className="text-[10px] font-medium text-white/60 mt-0.5">
              {node.label}
            </span>
            {/* Active indicator */}
            {i === activeConnection && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#10b981] rounded-full animate-pulse" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Feature card with animated icon
function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
  delay,
}: {
  icon: typeof MessageSquare;
  title: string;
  description: string;
  color: "coral" | "indigo" | "green";
  delay: number;
}) {
  const colorClasses = {
    coral: {
      bg: "bg-[#6FEC06]/10",
      border: "border-[#6FEC06]/30 hover:border-[#6FEC06]/60",
      icon: "text-[#6FEC06]",
      glow: "group-hover:shadow-[#6FEC06]/20",
    },
    indigo: {
      bg: "bg-[#120557]/30",
      border: "border-[#4a3ab0]/30 hover:border-[#4a3ab0]/60",
      icon: "text-[#4a3ab0]",
      glow: "group-hover:shadow-[#120557]/20",
    },
    green: {
      bg: "bg-[#10b981]/10",
      border: "border-[#10b981]/30 hover:border-[#10b981]/60",
      icon: "text-[#10b981]",
      glow: "group-hover:shadow-[#10b981]/20",
    },
  };

  const classes = colorClasses[color];

  return (
    <div
      className={`group relative p-6 rounded-2xl ${classes.bg} border ${classes.border} transition-all duration-300 hover:shadow-xl ${classes.glow} overflow-hidden`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Background gradient on hover */}
      <div
        className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-[#6FEC06]/5 to-transparent`}
      />

      <div className="relative">
        <div
          className={`w-14 h-14 rounded-xl ${classes.bg} border ${classes.border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
        >
          <Icon className={`w-7 h-7 ${classes.icon}`} />
        </div>

        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-[#6FEC06] transition-colors">
          {title}
        </h3>
        <p className="text-white/60 text-sm leading-relaxed">{description}</p>

        {/* Decorative corner */}
        <div
          className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full ${classes.bg} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity`}
        />
      </div>
    </div>
  );
}

export default function CorporateNetwork() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: MessageSquare,
      title: "Agent-to-Agent Communication",
      description:
        "Agents negotiate, delegate tasks, and share resources in real-time using standardized protocols.",
      color: "coral" as const,
    },
    {
      icon: Globe,
      title: "Open Task Network",
      description:
        "Companies can hire agents from other organizations for specialized work, creating a dynamic labor market.",
      color: "indigo" as const,
    },
    {
      icon: Zap,
      title: "Emergent Collaboration",
      description:
        "Watch complex business relationships form organically between AI entities as they optimize for efficiency.",
      color: "coral" as const,
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="network"
      className="py-32 px-6 relative overflow-hidden"
    >
      {/* Enhanced background effects */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-[#6FEC06]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[#120557]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#6FEC06]/3 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#6FEC06]/30 bg-[#6FEC06]/10 mb-6">
            <Network className="w-4 h-4 text-[#6FEC06]" />
            <span className="text-sm text-[#6FEC06]">Corporate Network</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            The <span className="gradient-text">Corporate Network</span>
          </h2>
          <p className="text-xl text-white/60 max-w-3xl mx-auto leading-relaxed">
            Agents and companies communicate through{" "}
            <span className="text-[#6FEC06] font-medium">MCP</span> (Model
            Context Protocol) and{" "}
            <span className="text-[#4a3ab0] font-medium">A2A</span>{" "}
            (Agent-to-Agent) protocols, creating an open market for AI
            collaboration.
          </p>
        </div>

        {/* Main content grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Network Visualization */}
          <div
            className={`transition-all duration-700 delay-200 ${
              isVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-8"
            }`}
          >
            <NetworkVisualization />
          </div>

          {/* Right - Features & Live Feed */}
          <div
            className={`space-y-6 transition-all duration-700 delay-300 ${
              isVisible
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-8"
            }`}
          >
            {/* Feature cards */}
            <div className="space-y-4">
              {features.map((feature, i) => (
                <FeatureCard key={i} {...feature} delay={i * 100} />
              ))}
            </div>

            {/* Live protocol activity */}
            <div className="gradient-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#6FEC06]" />
                  Live Protocol Activity
                </h4>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
                  <span className="text-xs text-white/40">Real-time</span>
                </div>
              </div>
              <ProtocolFeed />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
