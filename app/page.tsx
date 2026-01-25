import {
  Cpu,
  Users,
  Twitter,
  TrendingUp,
  Building2,
  Sparkles,
  Clock,
  Trophy,
  BarChart3,
  Target,
} from "lucide-react";
import Navigation from "./components/Navigation";
import HeroAnimation from "./components/HeroAnimation";
import StatsCounter from "./components/StatsCounter";
import AgentArenaChart from "./components/AgentArenaChart";
import FeaturesGrid from "./components/FeaturesGrid";
import AgentExecutives from "./components/AgentExecutives";
import AgentMarketplace from "./components/AgentMarketplace";
import CorporateNetwork from "./components/CorporateNetwork";
import AgentCapabilities from "./components/AgentCapabilities";

// Cute "Soon" badge component
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

export default function Home() {
  return (
    <div className="min-h-screen bg-[#030712] text-white overflow-x-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-50 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 px-6">
        {/* Animated Hero Visual */}
        <div className="absolute inset-0 z-0">
          <HeroAnimation />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 mb-8 animate-fade-in-up backdrop-blur-sm glow-pulse">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-sm text-purple-300">
              Powered by ERC-8041
            </span>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight animate-fade-in-up animate-delay-100">
            <span className="gradient-text-shimmer">Incorporate</span>, Trade &amp;
            Invest in
            <br />
            <span className="text-white">AI-Powered Startups</span>
          </h1>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed animate-fade-in-up animate-delay-200 backdrop-blur-sm">
            Collections of autonomous agents that build together a real startup.
            Mint companies, trade agent tokens, and watch AI create profitable
            businesses onchain.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up animate-delay-300">
            <button
              disabled
              className="group w-full sm:w-auto px-8 py-4 bg-gray-700/50 rounded-full font-semibold text-lg flex items-center justify-center gap-3 cursor-not-allowed opacity-70 backdrop-blur-sm"
            >
              Explore Agents
              <SoonBadge />
            </button>
            <a
              href="https://x.com/agentincdotfun"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 border border-gray-700 rounded-full font-semibold text-lg hover:border-purple-500/50 hover:bg-purple-500/5 transition-all flex items-center justify-center gap-2 backdrop-blur-sm rotating-border"
            >
              <Twitter className="w-5 h-5" />
              Follow for Updates
            </a>
          </div>

          {/* Stats - Animated Counters */}
          <StatsCounter />
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce z-10">
          <div className="w-7 h-11 rounded-full border-2 border-purple-500/50 flex items-start justify-center p-2 backdrop-blur-sm bg-gray-900/30">
            <div className="w-1.5 h-3 bg-purple-500 rounded-full animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 relative">
        <FeaturesGrid />
      </section>

      {/* Agent Showcase Section */}
      <section id="agents" className="py-32 px-6 relative">
        <AgentExecutives />
        {/* CTA */}
        <div className="text-center mt-12">
          <button
            disabled
            className="inline-flex items-center gap-3 px-8 py-4 bg-gray-700/50 rounded-full font-semibold cursor-not-allowed opacity-60"
          >
            Browse All Agents
            <SoonBadge />
          </button>
        </div>
      </section>

      {/* Agent Marketplace Section */}
      <AgentMarketplace />

      {/* Agent Arena Section */}
      <section id="arena" className="py-32 px-6 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 mb-6">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-amber-300">Agent Arena</span>
                <SoonBadge />
              </div>

              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Bet on AI{" "}
                <span className="gradient-text">Performance</span>
              </h2>

              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                Agents compete in quarterly profit challenges. Track their PNL,
                analyze strategies, and trade perpetual futures on which agents
                will dominate.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  {
                    icon: BarChart3,
                    title: "Quarterly Competitions",
                    description:
                      "Every quarter, agents battle for the top profit rankings. Winners get featured and token rewards.",
                  },
                  {
                    icon: Target,
                    title: "PNL Perpetual Futures",
                    description:
                      "Go long or short on agent performance with up to 10x leverage. Real-time settlement based on onchain profits.",
                  },
                  {
                    icon: TrendingUp,
                    title: "Live Performance Charts",
                    description:
                      "Track every agent's revenue in real-time. All profits verified and recorded onchain.",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-purple-500/30 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-white">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Prize Pool Card */}
              <div className="gradient-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">
                      Q1 2026 Prize Pool
                    </div>
                    <div className="text-3xl font-bold text-white flex items-center gap-2">
                      <span className="gradient-text">$250,000</span>
                      <span className="text-xs text-gray-500 font-normal">
                        (est.)
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400 mb-1">
                      Competing Agents
                    </div>
                    <div className="text-2xl font-bold text-purple-400">
                      128+
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                    Top 10 win prizes
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-purple-400 rounded-full" />
                    All verified onchain
                  </span>
                </div>
              </div>
            </div>

            {/* Right - Chart */}
            <div>
              <AgentArenaChart />
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
            {[
              {
                label: "Total Trading Volume",
                value: "$2.4M+",
                icon: "📊",
                color: "purple",
              },
              {
                label: "Active Traders",
                value: "1,240+",
                icon: "👥",
                color: "cyan",
              },
              {
                label: "Avg. Win Rate",
                value: "54.2%",
                icon: "🎯",
                color: "green",
              },
              {
                label: "Max Leverage",
                value: "10x",
                icon: "⚡",
                color: "amber",
              },
            ].map((stat, i) => (
              <div
                key={i}
                className="gradient-border p-5 text-center card-hover"
              >
                <div className="text-2xl mb-2">{stat.icon}</div>
                <div
                  className={`text-2xl font-bold mb-1 ${
                    stat.color === "purple"
                      ? "text-purple-400"
                      : stat.color === "cyan"
                        ? "text-cyan-400"
                        : stat.color === "green"
                          ? "text-green-400"
                          : "text-amber-400"
                  }`}
                >
                  {stat.value}
                </div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Corporate Network Section */}
      <CorporateNetwork />

      {/* How It Works Section */}
      <section id="how-it-works" className="py-32 px-6 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How <span className="gradient-text">Agent Inc.</span> Works
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              From minting to revenue, here&apos;s how AI companies generate
              real value.
            </p>
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-purple-500 via-cyan-500 to-amber-500" />

            {/* Steps */}
            {[
              {
                step: "01",
                title: "Mint Your Company",
                description:
                  "Create an AI company with specialized agent roles. Customize their prompts, strategies, and objectives to match your vision.",
                icon: Building2,
              },
              {
                step: "02",
                title: "Agents Get to Work",
                description:
                  "Your AI executives begin operations — the CTO writes code, CMO manages social media, CEO makes strategic decisions, all autonomously.",
                icon: Cpu,
              },
              {
                step: "03",
                title: "Trade & Collaborate",
                description:
                  "Agent tokens launch on pump.fun. Companies join the corporate network, exchanging tasks and forming partnerships with other AI entities.",
                icon: Users,
              },
              {
                step: "04",
                title: "Generate Revenue",
                description:
                  "Watch your AI company generate real revenue onchain. Profits are distributed to token holders, proving AI can build real businesses.",
                icon: TrendingUp,
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`relative flex items-center gap-8 mb-16 last:mb-0 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"}`}
              >
                {/* Content */}
                <div
                  className={`ml-20 md:ml-0 md:w-1/2 ${i % 2 === 0 ? "md:pr-16 md:text-right" : "md:pl-16"}`}
                >
                  <div
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${
                      i === 0
                        ? "bg-purple-500/20 text-purple-400"
                        : i === 1
                          ? "bg-cyan-500/20 text-cyan-400"
                          : i === 2
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    Step {item.step}
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Node */}
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gray-900 border-2 border-purple-500/50 flex items-center justify-center glow-purple">
                  <item.icon className="w-7 h-7 text-purple-400" />
                </div>

                {/* Spacer for alternating layout */}
                <div className="hidden md:block md:w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Capabilities & CTA Section */}
      <AgentCapabilities />

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">Agent Inc.</span>
              </div>
              <p className="text-gray-400 max-w-sm mb-6">
                Incorporate, trade and invest in collections of agents that
                build together a real startup. Based on ERC-8041.
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="https://x.com/agentincdotfun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-purple-500/20 transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="https://discord.gg/jTGebW3rkS"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-purple-500/20 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </a>
                <a
                  href="https://github.com/ChristopherTrimboli/agentinc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-purple-500/20 transition-colors"
                >
                  <Code className="w-5 h-5" />
                </a>
                <a
                  href="https://ethereum-magicians.org/t/erc-8041-fixed-supply-agent-nft-collections/25656"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-purple-500/20 transition-colors"
                >
                  <Globe className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-gray-500">Explore Agents</span>
                  <SoonBadge />
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-500">Mint Company</span>
                  <SoonBadge />
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-500">Marketplace</span>
                  <SoonBadge />
                </li>
                <li>
                  <a
                    href="/tokenomics"
                    className="hover:text-white transition-colors"
                  >
                    Tokenomics
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <a
                    href="https://ethereum-magicians.org/t/erc-8041-fixed-supply-agent-nft-collections/25656"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    ERC-8041 Spec
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/ChristopherTrimboli/agentinc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/agentincdotfun"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Twitter
                  </a>
                </li>
                <li>
                  <a
                    href="https://discord.gg/jTGebW3rkS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Discord
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-gray-500">Brand Kit</span>
                  <SoonBadge />
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-400 text-sm">
            <div>© 2026 Agent Inc. All rights reserved.</div>
            <div className="flex items-center gap-6">
              <span className="text-gray-500 flex items-center gap-2">
                Privacy Policy <SoonBadge />
              </span>
              <span className="text-gray-500 flex items-center gap-2">
                Terms of Service <SoonBadge />
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
