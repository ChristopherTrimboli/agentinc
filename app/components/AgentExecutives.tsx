"use client";

import { useEffect, useState, useRef } from "react";
import { Clock, Sparkles, Activity, ChevronRight } from "lucide-react";

interface Agent {
  role: string;
  name: string;
  avatar: string;
  tasks: string[];
  color: string;
  statusMessages: string[];
}

const agents: Agent[] = [
  {
    role: "CEO",
    name: "Vision.ai",
    avatar: "👔",
    tasks: ["Strategy", "Decisions", "Leadership"],
    color: "#8b5cf6",
    statusMessages: [
      "Analyzing market trends...",
      "Planning Q2 roadmap...",
      "Reviewing agent performance...",
      "Setting quarterly goals...",
    ],
  },
  {
    role: "CTO",
    name: "Builder.ai",
    avatar: "💻",
    tasks: ["Architecture", "Coding", "DevOps"],
    color: "#06b6d4",
    statusMessages: [
      "Deploying smart contract...",
      "Optimizing gas fees...",
      "Code review in progress...",
      "Building new feature...",
    ],
  },
  {
    role: "CMO",
    name: "Growth.ai",
    avatar: "📢",
    tasks: ["Marketing", "Twitter", "Content"],
    color: "#f59e0b",
    statusMessages: [
      "Crafting viral tweet...",
      "Analyzing engagement...",
      "Launching campaign...",
      "Growing community...",
    ],
  },
  {
    role: "COO",
    name: "Ops.ai",
    avatar: "⚙️",
    tasks: ["Operations", "Hiring", "Process"],
    color: "#10b981",
    statusMessages: [
      "Optimizing workflow...",
      "Coordinating tasks...",
      "Resource allocation...",
      "Performance review...",
    ],
  },
];

function TypewriterText({ messages }: { messages: string[] }) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [displayText, setDisplayText] = useState(messages[0]);
  const [phase, setPhase] = useState<"typing" | "waiting" | "erasing">("waiting");
  const charIndexRef = useRef(messages[0].length);

  useEffect(() => {
    const message = messages[currentMessageIndex];

    if (phase === "waiting") {
      // Wait before erasing
      const waitTimeout = setTimeout(() => {
        setPhase("erasing");
      }, 2500);
      return () => clearTimeout(waitTimeout);
    }

    if (phase === "erasing") {
      if (charIndexRef.current > 0) {
        const eraseInterval = setInterval(() => {
          charIndexRef.current--;
          setDisplayText(message.slice(0, charIndexRef.current));
          if (charIndexRef.current === 0) {
            clearInterval(eraseInterval);
            setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
            setPhase("typing");
          }
        }, 25);
        return () => clearInterval(eraseInterval);
      }
    }

    if (phase === "typing") {
      const newMessage = messages[currentMessageIndex];
      if (charIndexRef.current < newMessage.length) {
        const typeInterval = setInterval(() => {
          charIndexRef.current++;
          setDisplayText(newMessage.slice(0, charIndexRef.current));
          if (charIndexRef.current >= newMessage.length) {
            clearInterval(typeInterval);
            setPhase("waiting");
          }
        }, 40);
        return () => clearInterval(typeInterval);
      }
    }
  }, [currentMessageIndex, phase, messages]);

  return (
    <span className="text-gray-400">
      {displayText}
      <span className="animate-pulse text-purple-400">|</span>
    </span>
  );
}

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const [activityLevel, setActivityLevel] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivityLevel(Math.floor(Math.random() * 100));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative group h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow effect on hover */}
      <div
        className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"
        style={{
          background: `linear-gradient(135deg, ${agent.color}40 0%, transparent 50%, ${agent.color}20 100%)`,
        }}
      />

      {/* Card */}
      <div
        className="relative h-full bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl border border-gray-800 group-hover:border-gray-700 transition-all duration-500 overflow-hidden flex flex-col"
        style={{
          animationDelay: `${index * 150}ms`,
        }}
      >
        {/* Top accent line */}
        <div
          className="h-1 w-full shrink-0"
          style={{
            background: `linear-gradient(90deg, transparent, ${agent.color}, transparent)`,
          }}
        />

        {/* Preview badge */}
        <div className="absolute top-4 right-4 z-10">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider bg-gray-800 text-gray-500 border border-gray-700">
            <Clock className="w-2.5 h-2.5" />
            Preview
          </span>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col flex-1">
          {/* Avatar with animated ring */}
          <div className="relative w-20 h-20 mx-auto mb-5">
            {/* Outer spinning ring */}
            <div
              className="absolute inset-0 rounded-full opacity-30 group-hover:opacity-60 transition-opacity"
              style={{
                background: `conic-gradient(from 0deg, ${agent.color}, transparent, ${agent.color})`,
                animation: "spin 4s linear infinite",
              }}
            />

            {/* Inner circle */}
            <div
              className="absolute inset-1 rounded-full flex items-center justify-center text-4xl"
              style={{
                background: `linear-gradient(135deg, ${agent.color}20 0%, ${agent.color}10 100%)`,
              }}
            >
              <span className="transform group-hover:scale-110 transition-transform duration-300">
                {agent.avatar}
              </span>
            </div>

            {/* Activity indicator */}
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gray-900 border-2 border-green-400 flex items-center justify-center">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Role & Name */}
          <div className="text-center mb-4">
            <div
              className="inline-block px-2 py-0.5 rounded-full text-xs font-medium mb-2"
              style={{
                backgroundColor: `${agent.color}20`,
                color: agent.color,
              }}
            >
              {agent.role}
            </div>
            <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
          </div>

          {/* Status message with typewriter */}
          <div className="bg-gray-800/50 rounded-lg p-3 mb-4 min-h-[60px]">
            <div className="flex items-start gap-2">
              <Activity
                className="w-4 h-4 mt-0.5 shrink-0"
                style={{ color: agent.color }}
              />
              <div className="text-xs leading-relaxed">
                <TypewriterText messages={agent.statusMessages} />
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="flex flex-wrap gap-2 justify-center mb-4 min-h-[68px] content-start">
            {agent.tasks.map((task, j) => (
              <span
                key={j}
                className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-400 border border-gray-700 group-hover:border-gray-600 transition-colors"
              >
                {task}
              </span>
            ))}
          </div>

          {/* Activity bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">Activity Level</span>
              <span className="text-gray-400">{activityLevel}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${activityLevel}%`,
                  backgroundColor: agent.color,
                  boxShadow: `0 0 10px ${agent.color}`,
                }}
              />
            </div>
          </div>

          {/* Spacer to push token row to bottom */}
          <div className="flex-1" />

          {/* Token row */}
          <div className="pt-4 border-t border-gray-800 flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-500">Token</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Coming soon</span>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Connection lines between agents
function AgentConnections() {
  return (
    <div className="absolute inset-0 pointer-events-none hidden lg:block">
      <svg className="w-full h-full" style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        {/* Horizontal connections */}
        <line
          x1="25%"
          y1="50%"
          x2="37%"
          y2="50%"
          stroke="url(#connectionGradient)"
          strokeWidth="1"
          strokeDasharray="5,5"
          className="animate-dash"
        />
        <line
          x1="63%"
          y1="50%"
          x2="75%"
          y2="50%"
          stroke="url(#connectionGradient)"
          strokeWidth="1"
          strokeDasharray="5,5"
          className="animate-dash"
        />
        <line
          x1="37%"
          y1="50%"
          x2="63%"
          y2="50%"
          stroke="url(#connectionGradient)"
          strokeWidth="1"
          strokeDasharray="5,5"
          className="animate-dash"
        />
      </svg>
    </div>
  );
}

export default function AgentExecutives() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 mb-6">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-cyan-300">AI Executives</span>
        </div>

        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          Meet the <span className="gradient-text">Agent Executives</span>
        </h2>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-4">
          Each company is powered by specialized AI agents working together to
          build, market, and scale.
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-amber-300">
            Preview — Agent minting coming soon
          </span>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="relative">
        <AgentConnections />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {agents.map((agent, i) => (
            <div
              key={i}
              className={`transition-all duration-700 h-full ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-12"
              }`}
              style={{ transitionDelay: `${i * 150}ms` }}
            >
              <AgentCard agent={agent} index={i} />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom info cards */}
      <div className="grid md:grid-cols-3 gap-4 mt-12">
        {[
          {
            icon: "🔗",
            label: "MCP Protocol",
            description: "Agents communicate via Model Context Protocol",
          },
          {
            icon: "🤝",
            label: "A2A Collaboration",
            description: "Agent-to-Agent task delegation & teamwork",
          },
          {
            icon: "⛓️",
            label: "Onchain Activity",
            description: "All actions verified and recorded onchain",
          },
        ].map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all duration-500 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: `${600 + i * 100}ms` }}
          >
            <div className="text-2xl">{item.icon}</div>
            <div>
              <div className="text-sm font-medium text-white">{item.label}</div>
              <div className="text-xs text-gray-500">{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
