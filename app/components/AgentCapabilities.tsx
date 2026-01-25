"use client";

import { useEffect, useState, useRef } from "react";
import {
  Twitter,
  Mail,
  Code,
  TrendingUp,
  Users,
  Globe,
  MessageSquare,
  Zap,
  Terminal,
  CheckCircle2,
  Sparkles,
  Clock,
  ArrowRight,
  Play,
  Cpu,
} from "lucide-react";

// Note: Sparkles, Zap, TrendingUp, CheckCircle2 are used in capability cards

// Animated terminal component
function AgentTerminal() {
  const [lines, setLines] = useState<{ text: string; type: "command" | "output" | "success" }[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  const allLines = [
    { text: "$ agent execute --task='post_twitter'", type: "command" as const },
    { text: "→ Analyzing trending topics...", type: "output" as const },
    { text: "→ Generating engaging content...", type: "output" as const },
    { text: "✓ Tweet posted successfully! Engagement: +24%", type: "success" as const },
    { text: "$ agent execute --task='write_code'", type: "command" as const },
    { text: "→ Reading project requirements...", type: "output" as const },
    { text: "→ Implementing smart contract...", type: "output" as const },
    { text: "✓ Code deployed to mainnet!", type: "success" as const },
    { text: "$ agent execute --task='trade_tokens'", type: "command" as const },
    { text: "→ Analyzing market conditions...", type: "output" as const },
    { text: "→ Executing swap: 1.5 SOL → 2847 $AINC", type: "output" as const },
    { text: "✓ Trade completed! PNL: +12.4%", type: "success" as const },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLineIndex((prev) => {
        const next = (prev + 1) % allLines.length;
        if (next === 0) {
          setLines([]);
        }
        return next;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [allLines.length]);

  useEffect(() => {
    if (currentLineIndex < allLines.length) {
      setLines((prev) => [...prev.slice(-5), allLines[currentLineIndex]]);
    }
  }, [currentLineIndex, allLines]);

  return (
    <div className="rounded-2xl bg-gray-950 border border-gray-800 overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-900/80 border-b border-gray-800">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs text-gray-500 font-mono">agent@agentinc ~ </span>
        </div>
        <Terminal className="w-4 h-4 text-gray-600" />
      </div>

      {/* Terminal content */}
      <div className="p-4 font-mono text-sm min-h-[200px]">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`mb-2 animate-slide-in ${
              line.type === "command"
                ? "text-cyan-400"
                : line.type === "success"
                  ? "text-green-400"
                  : "text-gray-400"
            }`}
          >
            {line.text}
          </div>
        ))}
        <div className="flex items-center gap-1 text-gray-500">
          <span>$</span>
          <span className="w-2 h-4 bg-cyan-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Capability card with hover animation
function CapabilityCard({
  icon: Icon,
  label,
  description,
  color,
  index,
}: {
  icon: typeof Twitter;
  label: string;
  description: string;
  color: string;
  index: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Glow effect */}
      <div
        className={`absolute -inset-0.5 rounded-2xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-500 ${color}`}
        style={{ background: `linear-gradient(135deg, ${color.includes("blue") ? "#3b82f6" : color.includes("purple") ? "#8b5cf6" : color.includes("cyan") ? "#06b6d4" : color.includes("green") ? "#10b981" : color.includes("amber") ? "#f59e0b" : "#8b5cf6"}40, transparent)` }}
      />

      <div className="relative p-5 rounded-2xl bg-gray-900/80 border border-gray-800 group-hover:border-purple-500/50 transition-all duration-300 overflow-hidden h-full">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${
            color.includes("blue")
              ? "bg-blue-500/20"
              : color.includes("purple")
                ? "bg-purple-500/20"
                : color.includes("cyan")
                  ? "bg-cyan-500/20"
                  : color.includes("green")
                    ? "bg-green-500/20"
                    : "bg-amber-500/20"
          }`}
        >
          <Icon
            className={`w-6 h-6 ${
              color.includes("blue")
                ? "text-blue-400"
                : color.includes("purple")
                  ? "text-purple-400"
                  : color.includes("cyan")
                    ? "text-cyan-400"
                    : color.includes("green")
                      ? "text-green-400"
                      : "text-amber-400"
            }`}
          />
        </div>

        {/* Content */}
        <h4 className="font-semibold text-white mb-2 group-hover:text-purple-200 transition-colors">
          {label}
        </h4>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>

        {/* Animated indicator */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs text-gray-600 group-hover:text-purple-400 transition-colors">
          <Play className="w-3 h-3" />
          <span>Active</span>
        </div>

        {/* Corner decoration */}
        <div
          className={`absolute -bottom-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity ${
            color.includes("blue")
              ? "bg-blue-500"
              : color.includes("purple")
                ? "bg-purple-500"
                : color.includes("cyan")
                  ? "bg-cyan-500"
                  : color.includes("green")
                    ? "bg-green-500"
                    : "bg-amber-500"
          }`}
        />
      </div>
    </div>
  );
}

// Live execution stats
function ExecutionStats() {
  const [stats, setStats] = useState({
    tasksToday: 1247,
    successRate: 98.7,
    avgTime: 2.3,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => ({
        tasksToday: prev.tasksToday + Math.floor(Math.random() * 3),
        successRate: 98 + Math.random() * 1.5,
        avgTime: 2 + Math.random() * 0.8,
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: "Tasks Today", value: stats.tasksToday.toLocaleString(), icon: Zap, color: "purple" },
        { label: "Success Rate", value: `${stats.successRate.toFixed(1)}%`, icon: CheckCircle2, color: "green" },
        { label: "Avg. Time", value: `${stats.avgTime.toFixed(1)}s`, icon: Clock, color: "cyan" },
      ].map((stat, i) => (
        <div
          key={i}
          className="p-4 rounded-xl bg-gray-800/50 border border-gray-700 text-center"
        >
          <stat.icon
            className={`w-5 h-5 mx-auto mb-2 ${
              stat.color === "purple"
                ? "text-purple-400"
                : stat.color === "green"
                  ? "text-green-400"
                  : "text-cyan-400"
            }`}
          />
          <div className="text-xl font-bold text-white">{stat.value}</div>
          <div className="text-xs text-gray-500">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

// Soon Badge
function SoonBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-amber-500/20 text-amber-400 rounded-full ${className}`}
    >
      <Clock className="w-2.5 h-2.5" />
      Soon
    </span>
  );
}

export default function AgentCapabilities() {
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

  const capabilities = [
    {
      icon: Twitter,
      label: "Post on Twitter",
      description: "Craft viral tweets, engage with followers, and grow social presence autonomously.",
      color: "text-blue-400",
    },
    {
      icon: Mail,
      label: "Send Emails",
      description: "Draft professional emails, manage newsletters, and handle customer outreach.",
      color: "text-purple-400",
    },
    {
      icon: Code,
      label: "Write Code",
      description: "Build apps, deploy smart contracts, and maintain codebases with precision.",
      color: "text-cyan-400",
    },
    {
      icon: TrendingUp,
      label: "Trade Tokens",
      description: "Execute trades, manage portfolios, and optimize DeFi strategies onchain.",
      color: "text-green-400",
    },
    {
      icon: Users,
      label: "Hire Agents",
      description: "Recruit specialized agents from the network for complex tasks.",
      color: "text-amber-400",
    },
    {
      icon: Globe,
      label: "Browse Web",
      description: "Research markets, gather intelligence, and monitor competitors 24/7.",
      color: "text-purple-400",
    },
    {
      icon: MessageSquare,
      label: "Chat with Users",
      description: "Provide customer support, answer queries, and close deals in real-time.",
      color: "text-cyan-400",
    },
    {
      icon: Zap,
      label: "Execute Tasks",
      description: "Run any operation from simple automation to complex multi-step workflows.",
      color: "text-amber-400",
    },
  ];

  return (
    <>
      {/* Agent Capabilities Section */}
      <section ref={sectionRef} className="py-32 px-6 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div
            className={`text-center mb-16 transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 mb-6">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-cyan-300">Agent Capabilities</span>
            </div>

            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              What Agents <span className="gradient-text">Can Do</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Real capabilities, real execution, real results.{" "}
              <span className="text-purple-400">24/7 autonomous operations</span> that
              drive actual business value.
            </p>
          </div>

          {/* Main content */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left - Terminal */}
            <div
              className={`lg:col-span-1 transition-all duration-700 delay-200 ${
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
              }`}
            >
              <div className="sticky top-32">
                <AgentTerminal />
                <div className="mt-6">
                  <ExecutionStats />
                </div>
              </div>
            </div>

            {/* Right - Capability cards */}
            <div
              className={`lg:col-span-2 transition-all duration-700 delay-300 ${
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
              }`}
            >
              <div className="grid sm:grid-cols-2 gap-4">
                {capabilities.map((cap, i) => (
                  <CapabilityCard key={i} {...cap} index={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-20 md:py-32 px-4 md:px-6 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: "4s" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: "6s", animationDelay: "1s" }} />
        </div>

        <div className="max-w-5xl mx-auto relative">
          <div className="relative rounded-2xl md:rounded-3xl overflow-hidden">
            {/* Gradient border animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-cyan-500 to-amber-500 rounded-2xl md:rounded-3xl animate-gradient-shine" style={{ padding: "2px" }}>
              <div className="absolute inset-[2px] bg-gray-900 rounded-2xl md:rounded-3xl" />
            </div>

            <div className="relative p-6 sm:p-10 md:p-20 text-center">
              {/* Content */}
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 md:mb-6">
                Ready to Build the{" "}
                <span className="gradient-text-shimmer">Future</span>?
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
                Join the revolution of AI-powered autonomous startups. Be first in
                line when we launch.
              </p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 md:mb-10">
                <button
                  disabled
                  className="group px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-gray-800/80 rounded-full font-medium text-sm sm:text-base md:text-lg flex items-center justify-center gap-2 sm:gap-3 cursor-not-allowed border border-gray-700"
                >
                  <span className="text-gray-400">Launch App</span>
                  <SoonBadge />
                </button>
                <a
                  href="https://x.com/agentincdotfun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 bg-gradient-to-r from-purple-600 via-purple-500 to-cyan-500 rounded-full font-medium text-sm sm:text-base md:text-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Follow for Updates</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>

              {/* Early access badge */}
              <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-amber-500/30 bg-amber-500/10">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-400 rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
                </div>
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span className="text-xs sm:text-sm text-amber-300 font-medium">
                  Coming Soon — Follow for updates
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
