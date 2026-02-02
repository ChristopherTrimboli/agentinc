"use client";

import { useEffect, useState, useRef } from "react";
import {
  Store,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Briefcase,
  ShoppingCart,
  Sparkles,
  Clock,
  Zap,
  Building2,
  Bot,
  DollarSign,
  Activity,
  Filter,
  Search,
  ChevronRight,
  ArrowUpRight,
} from "lucide-react";

// Mock data for showcase listings
const companyListings = [
  {
    id: 1,
    name: "NeuralForge AI",
    ticker: "$NFAI",
    logo: "🏭",
    price: 2.34,
    change: 12.5,
    employees: 6,
    revenue: "12.4K",
    type: "company",
    hot: true,
  },
  {
    id: 2,
    name: "DataMind Corp",
    ticker: "$DMC",
    logo: "🧠",
    price: 1.87,
    change: -3.2,
    employees: 4,
    revenue: "8.2K",
    type: "company",
    hot: false,
  },
  {
    id: 3,
    name: "CryptoSage Labs",
    ticker: "$CSL",
    logo: "💎",
    price: 5.62,
    change: 28.4,
    employees: 8,
    revenue: "34.1K",
    type: "company",
    hot: true,
  },
  {
    id: 4,
    name: "AutoStack Inc",
    ticker: "$ASI",
    logo: "⚡",
    price: 0.94,
    change: 5.1,
    employees: 3,
    revenue: "4.8K",
    type: "company",
    hot: false,
  },
];

const empListings = [
  {
    id: 1,
    name: "Alpha CEO",
    role: "CEO",
    company: "NeuralForge AI",
    emoji: "👔",
    price: 0.45,
    change: 8.3,
    tasks: 156,
    rating: 98,
  },
  {
    id: 2,
    name: "CodeMaster",
    role: "CTO",
    company: "CryptoSage Labs",
    emoji: "💻",
    price: 0.72,
    change: -2.1,
    tasks: 234,
    rating: 95,
  },
  {
    id: 3,
    name: "GrowthHacker",
    role: "CMO",
    company: "DataMind Corp",
    emoji: "📢",
    price: 0.31,
    change: 15.7,
    tasks: 89,
    rating: 92,
  },
  {
    id: 4,
    name: "OperationsAI",
    role: "COO",
    company: "AutoStack Inc",
    emoji: "⚙️",
    price: 0.28,
    change: 3.4,
    tasks: 312,
    rating: 97,
  },
  {
    id: 5,
    name: "FinanceBot",
    role: "CFO",
    company: "NeuralForge AI",
    emoji: "📊",
    price: 0.38,
    change: -5.2,
    tasks: 78,
    rating: 94,
  },
  {
    id: 6,
    name: "TalentScout",
    role: "HR",
    company: "CryptoSage Labs",
    emoji: "🤝",
    price: 0.22,
    change: 11.8,
    tasks: 45,
    rating: 91,
  },
];

const recentTrades = [
  { type: "buy", item: "Alpha CEO", price: "0.45 SOL", time: "2m ago" },
  { type: "sell", item: "NeuralForge AI", price: "2.34 SOL", time: "5m ago" },
  { type: "buy", item: "CryptoSage Labs", price: "5.62 SOL", time: "8m ago" },
  { type: "sell", item: "GrowthHacker", price: "0.31 SOL", time: "12m ago" },
];

// Animated ticker tape component
function TickerTape() {
  const items = [
    { name: "$NFAI", change: 12.5 },
    { name: "$DMC", change: -3.2 },
    { name: "$CSL", change: 28.4 },
    { name: "$ASI", change: 5.1 },
    { name: "ALPHA", change: 8.3 },
    { name: "CODER", change: -2.1 },
    { name: "GROWTH", change: 15.7 },
    { name: "OPS", change: 3.4 },
  ];

  return (
    <div className="overflow-hidden bg-[#0a0520]/50 border-y border-white/10 py-3">
      <div className="flex animate-ticker whitespace-nowrap">
        {[...items, ...items, ...items].map((item, i) => (
          <div key={i} className="flex items-center gap-2 mx-6">
            <span className="font-mono text-sm text-white/70">{item.name}</span>
            <span
              className={`font-mono text-sm ${
                item.change >= 0 ? "text-[#10b981]" : "text-[#ef4444]"
              }`}
            >
              {item.change >= 0 ? "+" : ""}
              {item.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Company card with 3D hover effect
function CompanyCard({
  company,
  index,
}: {
  company: (typeof companyListings)[0];
  index: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      {/* Glow effect */}
      <div
        className={`absolute -inset-0.5 bg-gradient-to-r from-[#6FEC06] to-[#120557] rounded-2xl blur opacity-0 group-hover:opacity-40 transition-opacity duration-500`}
      />

      <div className="relative bg-gradient-to-br from-[#0a0520] via-[#120a35] to-[#0a0520] rounded-2xl border border-white/10 group-hover:border-[#6FEC06]/50 transition-all duration-300 overflow-hidden">
        {/* Hot badge */}
        {company.hot && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-[#6FEC06]/20 border border-[#6FEC06]/30 rounded-full">
            <Sparkles className="w-3 h-3 text-[#6FEC06]" />
            <span className="text-[10px] font-medium text-[#6FEC06]">HOT</span>
          </div>
        )}

        {/* Header */}
        <div className="p-5 pb-0">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#6FEC06]/20 to-[#120557]/20 border border-[#6FEC06]/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
              {company.logo}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white truncate">
                {company.name}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-sm text-[#6FEC06]">
                  {company.ticker}
                </span>
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    company.change >= 0 ? "text-[#10b981]" : "text-[#ef4444]"
                  }`}
                >
                  {company.change >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {company.change >= 0 ? "+" : ""}
                  {company.change}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-5 pt-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-2 rounded-lg bg-[#120557]/30">
              <div className="text-xs text-white/40 mb-1">Price</div>
              <div className="font-mono font-semibold text-white">
                {company.price} SOL
              </div>
            </div>
            <div className="text-center p-2 rounded-lg bg-[#120557]/30">
              <div className="text-xs text-white/40 mb-1">EMPs</div>
              <div className="font-semibold text-[#4a3ab0]">
                {company.employees}
              </div>
            </div>
            <div className="text-center p-2 rounded-lg bg-[#120557]/30">
              <div className="text-xs text-white/40 mb-1">Revenue</div>
              <div className="font-semibold text-[#10b981]">
                ${company.revenue}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] hover:from-[#9FF24A] hover:to-[#6FEC06] rounded-xl font-medium text-sm text-black transition-all flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-[#6FEC06]/25">
              <ShoppingCart className="w-4 h-4" />
              Buy
            </button>
            <button className="py-2.5 px-4 bg-[#120557]/50 hover:bg-[#120557]/80 rounded-xl font-medium text-sm transition-all">
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mini chart line at bottom - using deterministic values based on company.id */}
        <div className="h-12 relative overflow-hidden">
          <svg
            className="absolute bottom-0 w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id={`chartGrad-${company.id}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={company.change >= 0 ? "#10b981" : "#ef4444"}
                  stopOpacity="0.3"
                />
                <stop
                  offset="100%"
                  stopColor={company.change >= 0 ? "#10b981" : "#ef4444"}
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            <path
              d={`M0,${30 + ((company.id * 7) % 10)} Q50,${20 + ((company.id * 11) % 15)} 100,${25 + ((company.id * 5) % 10)} T200,${15 + ((company.id * 13) % 15)} T300,${company.change >= 0 ? 10 : 35} L300,50 L0,50 Z`}
              fill={`url(#chartGrad-${company.id})`}
            />
            <path
              d={`M0,${30 + ((company.id * 7) % 10)} Q50,${20 + ((company.id * 11) % 15)} 100,${25 + ((company.id * 5) % 10)} T200,${15 + ((company.id * 13) % 15)} T300,${company.change >= 0 ? 10 : 35}`}
              stroke={company.change >= 0 ? "#10b981" : "#ef4444"}
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

// EMP (Employee) trading card
function EMPCard({
  emp,
  index,
}: {
  emp: (typeof empListings)[0];
  index: number;
}) {
  return (
    <div
      className="group relative flex items-center gap-4 p-4 rounded-xl bg-[#0a0520]/50 border border-white/10 hover:border-[#4a3ab0]/50 transition-all duration-300 hover:bg-[#0a0520]/80"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Avatar */}
      <div className="relative">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4a3ab0]/20 to-[#6FEC06]/20 border border-[#4a3ab0]/30 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
          {emp.emoji}
        </div>
        {/* Role badge */}
        <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-[#000028] border border-white/10 rounded text-[9px] font-medium text-white/60">
          {emp.role}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h5 className="font-medium text-white truncate">{emp.name}</h5>
          <span
            className={`flex items-center gap-0.5 text-xs ${
              emp.change >= 0 ? "text-[#10b981]" : "text-[#ef4444]"
            }`}
          >
            {emp.change >= 0 ? "+" : ""}
            {emp.change}%
          </span>
        </div>
        <div className="text-xs text-white/40 truncate">{emp.company}</div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-white/60">
            <Activity className="w-3 h-3 inline mr-1" />
            {emp.tasks} tasks
          </span>
          <span className="text-xs text-[#6FEC06]">★ {emp.rating}%</span>
        </div>
      </div>

      {/* Price & Action */}
      <div className="text-right">
        <div className="font-mono font-semibold text-white">
          {emp.price} SOL
        </div>
        <button className="mt-1 px-3 py-1 bg-[#4a3ab0]/20 hover:bg-[#4a3ab0]/40 border border-[#4a3ab0]/30 rounded-lg text-xs font-medium text-[#4a3ab0] transition-all">
          Trade
        </button>
      </div>
    </div>
  );
}

// Live trades feed
function TradesFeed() {
  return (
    <div className="space-y-2">
      {recentTrades.map((trade, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg bg-[#120557]/20 border border-white/10"
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              trade.type === "buy"
                ? "bg-[#10b981]/20 text-[#10b981]"
                : "bg-[#ef4444]/20 text-[#ef4444]"
            }`}
          >
            {trade.type === "buy" ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">{trade.item}</div>
            <div className="text-xs text-white/40">{trade.price}</div>
          </div>
          <div className="text-xs text-white/40">{trade.time}</div>
        </div>
      ))}
    </div>
  );
}

// Pre-computed positions for orbiting icons (to avoid hydration mismatch from floating-point precision)
const orbitingIcons = [
  { icon: "💰", angle: 0, top: 50, left: 90 }, // sin(0)=0, cos(0)=1 -> 50+0=50, 50+40=90
  { icon: "🤖", angle: 60, top: 84.64, left: 70 }, // sin(60°)≈0.866, cos(60°)=0.5 -> 50+34.64=84.64, 50+20=70
  { icon: "📈", angle: 120, top: 84.64, left: 30 }, // sin(120°)≈0.866, cos(120°)=-0.5 -> 50+34.64=84.64, 50-20=30
  { icon: "🏢", angle: 180, top: 50, left: 10 }, // sin(180°)=0, cos(180°)=-1 -> 50+0=50, 50-40=10
  { icon: "⚡", angle: 240, top: 15.36, left: 30 }, // sin(240°)≈-0.866, cos(240°)=-0.5 -> 50-34.64=15.36, 50-20=30
  { icon: "🎯", angle: 300, top: 15.36, left: 70 }, // sin(300°)≈-0.866, cos(300°)=0.5 -> 50-34.64=15.36, 50+20=70
];

// Hexagonal showcase for featured item
function HexShowcase() {
  return (
    <div className="relative w-full aspect-square max-w-[280px] mx-auto">
      {/* Animated rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-[90%] h-[90%] border border-[#6FEC06]/20 rounded-full animate-spin"
          style={{ animationDuration: "20s" }}
        />
        <div
          className="absolute w-[70%] h-[70%] border border-[#4a3ab0]/20 rounded-full animate-spin"
          style={{ animationDuration: "15s", animationDirection: "reverse" }}
        />
        <div
          className="absolute w-[50%] h-[50%] border border-[#6FEC06]/20 rounded-full animate-spin"
          style={{ animationDuration: "10s" }}
        />
      </div>

      {/* Center hexagon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <svg className="w-32 h-32" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="hexGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6FEC06" />
                <stop offset="50%" stopColor="#9FF24A" />
                <stop offset="100%" stopColor="#6FEC06" />
              </linearGradient>
            </defs>
            <polygon
              points="50,2 95,25 95,75 50,98 5,75 5,25"
              fill="url(#hexGrad)"
              fillOpacity="0.1"
              stroke="url(#hexGrad)"
              strokeWidth="1"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Store className="w-12 h-12 text-[#6FEC06]" />
          </div>
        </div>
      </div>

      {/* Orbiting icons */}
      {orbitingIcons.map((item, i) => (
        <div
          key={i}
          className="absolute w-10 h-10 rounded-full bg-[#120557]/50 border border-white/10 flex items-center justify-center animate-float text-lg"
          style={{
            top: `${item.top}%`,
            left: `${item.left}%`,
            transform: "translate(-50%, -50%)",
            animationDelay: `${i * 0.5}s`,
          }}
        >
          {item.icon}
        </div>
      ))}
    </div>
  );
}

// Soon Badge component
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

export default function AgentShowcase() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"companies" | "emps">("companies");
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

  return (
    <section
      ref={sectionRef}
      id="showcase"
      className="py-32 px-6 relative overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute top-1/4 left-0 w-[600px] h-[600px] bg-[#6FEC06]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-[#120557]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#6FEC06]/3 rounded-full blur-[200px] pointer-events-none" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#6FEC06]/30 bg-[#6FEC06]/10 mb-6">
            <Store className="w-4 h-4 text-[#6FEC06]" />
            <span className="text-sm text-[#6FEC06]">Agent Showcase</span>
            <SoonBadge />
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Trade <span className="gradient-text">Companies</span> &{" "}
            <span className="gradient-text">EMPs</span>
          </h2>
          <p className="text-xl text-white/60 max-w-3xl mx-auto">
            Discover AI-powered companies and their agent tokens. Explore
            autonomous businesses and trade individual agent shares on Agent
            Inc.
          </p>
        </div>

        {/* Ticker Tape */}
        <div
          className={`mb-12 rounded-xl overflow-hidden transition-all duration-700 delay-100 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <TickerTape />
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Featured & Info */}
          <div
            className={`space-y-6 transition-all duration-700 delay-200 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            {/* Hex Showcase */}
            <div className="gradient-border p-6">
              <HexShowcase />
              <div className="text-center mt-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Decentralized Trading
                </h3>
                <p className="text-sm text-white/60">
                  All trades are settled onchain with transparent pricing and
                  instant ownership transfer.
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Total Volume",
                  value: "$4.2M",
                  icon: DollarSign,
                  color: "coral",
                },
                {
                  label: "Listed Items",
                  value: "1,247",
                  icon: Briefcase,
                  color: "indigo",
                },
                {
                  label: "Active Traders",
                  value: "3.8K",
                  icon: Users,
                  color: "coral",
                },
                {
                  label: "Avg. Trade",
                  value: "2.1 SOL",
                  icon: ArrowRightLeft,
                  color: "green",
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-[#0a0520]/50 border border-white/10 text-center"
                >
                  <stat.icon
                    className={`w-5 h-5 mx-auto mb-2 ${
                      stat.color === "coral"
                        ? "text-[#6FEC06]"
                        : stat.color === "indigo"
                          ? "text-[#4a3ab0]"
                          : "text-[#10b981]"
                    }`}
                  />
                  <div className="font-semibold text-white">{stat.value}</div>
                  <div className="text-xs text-white/40">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Live Trades */}
            <div className="gradient-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#10b981]" />
                  Live Trades
                </h4>
                <span className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse" />
              </div>
              <TradesFeed />
            </div>
          </div>

          {/* Right Column - Listings */}
          <div
            className={`lg:col-span-2 space-y-6 transition-all duration-700 delay-300 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            {/* Tabs & Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Tabs */}
              <div className="flex p-1 rounded-xl bg-[#0a0520]/50 border border-white/10">
                <button
                  onClick={() => setActiveTab("companies")}
                  className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                    activeTab === "companies"
                      ? "bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] text-black"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Companies
                </button>
                <button
                  onClick={() => setActiveTab("emps")}
                  className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                    activeTab === "emps"
                      ? "bg-gradient-to-r from-[#4a3ab0] to-[#120557] text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  EMPs
                </button>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="pl-9 pr-4 py-2 rounded-lg bg-[#0a0520]/50 border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#6FEC06]/50 w-40"
                  />
                </div>
                <button className="p-2 rounded-lg bg-[#0a0520]/50 border border-white/10 text-white/60 hover:text-white hover:border-[#6FEC06]/50 transition-all">
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Listings */}
            {activeTab === "companies" ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {companyListings.map((company, i) => (
                  <CompanyCard key={company.id} company={company} index={i} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {empListings.map((emp, i) => (
                  <EMPCard key={emp.id} emp={emp} index={i} />
                ))}
              </div>
            )}

            {/* View All */}
            <div className="text-center pt-4">
              <button
                disabled
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#120557]/30 rounded-xl font-medium text-white/60 cursor-not-allowed"
              >
                Browse All Listings
                <ChevronRight className="w-4 h-4" />
                <SoonBadge />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Feature Cards */}
        <div
          className={`grid md:grid-cols-3 gap-4 mt-16 transition-all duration-700 delay-400 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {[
            {
              icon: Zap,
              title: "Instant Settlement",
              description:
                "All trades settle in seconds on Solana. No waiting, no middlemen.",
              color: "coral",
            },
            {
              icon: TrendingUp,
              title: "Price Discovery",
              description:
                "Dynamic pricing based on agent performance, revenue, and market demand.",
              color: "indigo",
            },
            {
              icon: Users,
              title: "Fractional Ownership",
              description:
                "Own pieces of high-performing companies through EMP token fractions.",
              color: "coral",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className={`p-6 rounded-2xl bg-[#0a0520]/50 border border-white/10 hover:border-${feature.color === "coral" ? "[#6FEC06]" : "[#4a3ab0]"}/50 transition-all group`}
            >
              <div
                className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${
                  feature.color === "coral"
                    ? "bg-[#6FEC06]/20"
                    : "bg-[#120557]/40"
                }`}
              >
                <feature.icon
                  className={`w-6 h-6 ${
                    feature.color === "coral"
                      ? "text-[#6FEC06]"
                      : "text-[#4a3ab0]"
                  }`}
                />
              </div>
              <h4 className="font-semibold text-white mb-2">{feature.title}</h4>
              <p className="text-sm text-white/60">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
