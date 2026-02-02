"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
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

// Terminal lines defined outside component to prevent recreation on each render
const terminalLines = [
  { text: "$ agent execute --task='post_twitter'", type: "command" as const },
  { text: "→ Analyzing trending topics...", type: "output" as const },
  { text: "→ Generating engaging content...", type: "output" as const },
  {
    text: "✓ Tweet posted successfully! Engagement: +24%",
    type: "success" as const,
  },
  { text: "$ agent execute --task='write_code'", type: "command" as const },
  { text: "→ Reading project requirements...", type: "output" as const },
  { text: "→ Implementing smart contract...", type: "output" as const },
  { text: "✓ Code deployed to mainnet!", type: "success" as const },
  { text: "$ agent execute --task='trade_tokens'", type: "command" as const },
  { text: "→ Analyzing market conditions...", type: "output" as const },
  { text: "→ Executing swap: 1.5 SOL → 2847 $AINC", type: "output" as const },
  { text: "✓ Trade completed! PNL: +12.4%", type: "success" as const },
];

// Animated terminal component
function AgentTerminal() {
  const [lines, setLines] = useState<
    { text: string; type: "command" | "output" | "success" }[]
  >([]);
  const currentLineIndexRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      currentLineIndexRef.current =
        (currentLineIndexRef.current + 1) % terminalLines.length;

      if (currentLineIndexRef.current === 0) {
        setLines([terminalLines[0]]);
      } else {
        setLines((prev) => [
          ...prev.slice(-5),
          terminalLines[currentLineIndexRef.current],
        ]);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-2xl bg-[#000104] border border-white/10 overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#0a0520]/80 border-b border-white/10">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
          <div className="w-3 h-3 rounded-full bg-[#fbbf24]" />
          <div className="w-3 h-3 rounded-full bg-[#10b981]" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs text-white/40 font-mono">
            agent@agentinc ~{" "}
          </span>
        </div>
        <Terminal className="w-4 h-4 text-white/30" />
      </div>

      {/* Terminal content */}
      <div className="p-4 font-mono text-sm min-h-[200px]">
        {lines.map((line, i) => (
          <div
            key={i}
            className={`mb-2 animate-slide-in ${
              line.type === "command"
                ? "text-[#4a3ab0]"
                : line.type === "success"
                  ? "text-[#10b981]"
                  : "text-white/60"
            }`}
          >
            {line.text}
          </div>
        ))}
        <div className="flex items-center gap-1 text-white/40">
          <span>$</span>
          <span className="w-2 h-4 bg-[#6FEC06] animate-pulse" />
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

  const getColorClasses = (color: string) => {
    if (color.includes("blue"))
      return { bg: "bg-[#3b82f6]/20", text: "text-[#3b82f6]", glow: "#3b82f6" };
    if (color.includes("coral"))
      return { bg: "bg-[#6FEC06]/20", text: "text-[#6FEC06]", glow: "#6FEC06" };
    if (color.includes("indigo"))
      return { bg: "bg-[#120557]/40", text: "text-[#4a3ab0]", glow: "#4a3ab0" };
    if (color.includes("green"))
      return { bg: "bg-[#10b981]/20", text: "text-[#10b981]", glow: "#10b981" };
    return { bg: "bg-[#6FEC06]/20", text: "text-[#6FEC06]", glow: "#6FEC06" };
  };

  const colors = getColorClasses(color);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Glow effect */}
      <div
        className="absolute -inset-0.5 rounded-2xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-500"
        style={{
          background: `linear-gradient(135deg, ${colors.glow}40, transparent)`,
        }}
      />

      <div className="relative p-5 rounded-2xl bg-[#0a0520]/80 border border-white/10 group-hover:border-[#6FEC06]/50 transition-all duration-300 overflow-hidden h-full">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${colors.bg}`}
        >
          <Icon className={`w-6 h-6 ${colors.text}`} />
        </div>

        {/* Content */}
        <h4 className="font-semibold text-white mb-2 group-hover:text-[#6FEC06] transition-colors">
          {label}
        </h4>
        <p className="text-sm text-white/40 leading-relaxed">{description}</p>

        {/* Animated indicator */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1 text-xs text-white/30 group-hover:text-[#6FEC06] transition-colors">
          <Play className="w-3 h-3" />
          <span>Active</span>
        </div>

        {/* Corner decoration */}
        <div
          className={`absolute -bottom-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity`}
          style={{ background: colors.glow }}
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
        {
          label: "Tasks Today",
          value: stats.tasksToday.toLocaleString(),
          icon: Zap,
          color: "coral",
        },
        {
          label: "Success Rate",
          value: `${stats.successRate.toFixed(1)}%`,
          icon: CheckCircle2,
          color: "green",
        },
        {
          label: "Avg. Time",
          value: `${stats.avgTime.toFixed(1)}s`,
          icon: Clock,
          color: "indigo",
        },
      ].map((stat, i) => (
        <div
          key={i}
          className="p-4 rounded-xl bg-[#120557]/30 border border-white/10 text-center"
        >
          <stat.icon
            className={`w-5 h-5 mx-auto mb-2 ${
              stat.color === "coral"
                ? "text-[#6FEC06]"
                : stat.color === "green"
                  ? "text-[#10b981]"
                  : "text-[#4a3ab0]"
            }`}
          />
          <div className="text-xl font-bold text-white">{stat.value}</div>
          <div className="text-xs text-white/40">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

// Soon Badge
function SoonBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-[#6FEC06]/20 text-[#6FEC06] rounded-full ${className}`}
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
      { threshold: 0.1 },
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
      description:
        "Craft viral tweets, engage with followers, and grow social presence autonomously.",
      color: "blue",
    },
    {
      icon: Mail,
      label: "Send Emails",
      description:
        "Draft professional emails, manage newsletters, and handle customer outreach.",
      color: "coral",
    },
    {
      icon: Code,
      label: "Write Code",
      description:
        "Build apps, deploy smart contracts, and maintain codebases with precision.",
      color: "indigo",
    },
    {
      icon: TrendingUp,
      label: "Trade Tokens",
      description:
        "Execute trades, manage portfolios, and optimize DeFi strategies onchain.",
      color: "green",
    },
    {
      icon: Users,
      label: "Hire Agents",
      description:
        "Recruit specialized agents from the network for complex tasks.",
      color: "coral",
    },
    {
      icon: Globe,
      label: "Browse Web",
      description:
        "Research markets, gather intelligence, and monitor competitors 24/7.",
      color: "indigo",
    },
    {
      icon: MessageSquare,
      label: "Chat with Users",
      description:
        "Provide customer support, answer queries, and close deals in real-time.",
      color: "indigo",
    },
    {
      icon: Zap,
      label: "Execute Tasks",
      description:
        "Run any operation from simple automation to complex multi-step workflows.",
      color: "coral",
    },
  ];

  return (
    <>
      {/* Agent Capabilities Section */}
      <section ref={sectionRef} className="py-32 px-6 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-[#120557]/20 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-[#6FEC06]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div
            className={`text-center mb-16 transition-all duration-700 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#4a3ab0]/30 bg-[#120557]/30 mb-6">
              <Cpu className="w-4 h-4 text-[#4a3ab0]" />
              <span className="text-sm text-[#4a3ab0]">Agent Capabilities</span>
            </div>

            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              What Agents <span className="gradient-text">Can Do</span>
            </h2>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              Real capabilities, real execution, real results.{" "}
              <span className="text-[#6FEC06]">24/7 autonomous operations</span>{" "}
              that drive actual business value.
            </p>
          </div>

          {/* Main content */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left - Terminal */}
            <div
              className={`lg:col-span-1 transition-all duration-700 delay-200 ${
                isVisible
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 -translate-x-8"
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
                isVisible
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-8"
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
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#6FEC06]/10 rounded-full blur-[150px] animate-pulse"
            style={{ animationDuration: "4s" }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#120557]/20 rounded-full blur-[120px] animate-pulse"
            style={{ animationDuration: "6s", animationDelay: "1s" }}
          />
        </div>

        <div className="max-w-5xl mx-auto relative">
          <div className="relative rounded-2xl md:rounded-3xl overflow-hidden">
            {/* Gradient border animation */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#6FEC06] via-[#9FF24A] to-[#6FEC06] rounded-2xl md:rounded-3xl animate-gradient-shine"
              style={{ padding: "2px" }}
            >
              <div className="absolute inset-[2px] bg-[#000028] rounded-2xl md:rounded-3xl" />
            </div>

            <div className="relative p-6 sm:p-10 md:p-20 text-center">
              {/* Content */}
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4 md:mb-6">
                Ready to Build the{" "}
                <span className="gradient-text-shimmer">Future</span>?
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-white/60 mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
                Join the revolution of AI-powered autonomous startups. Be first
                in line when we launch.
              </p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/dashboard"
                  className="btn-cta-primary group px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-full font-medium text-sm sm:text-base md:text-lg text-black flex items-center justify-center gap-2 sm:gap-3"
                >
                  <span className="btn-shine-sweep" />
                  Launch App
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="https://x.com/agentincdotfun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group px-5 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-full font-medium text-sm sm:text-base md:text-lg text-white border border-white/20 hover:border-[#6FEC06]/50 hover:bg-[#6FEC06]/5 transition-all flex items-center justify-center gap-2"
                >
                  <Twitter className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Follow for Updates</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
