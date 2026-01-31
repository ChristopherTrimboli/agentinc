"use client";

import { useState, useEffect } from "react";
import { usePrivy, useIdentityToken } from "@privy-io/react-auth";
import Link from "next/link";
import {
  Bot,
  Building2,
  Sparkles,
  Network,
  TrendingUp,
  Users,
  Coins,
  ArrowRight,
} from "lucide-react";

interface Stats {
  agentCount: number;
  corporationCount: number;
}

export default function DashboardPage() {
  const { user } = usePrivy();
  const { identityToken } = useIdentityToken();
  const [stats, setStats] = useState<Stats>({ agentCount: 0, corporationCount: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!identityToken) {
        setIsLoading(false);
        return;
      }

      try {
        const [agentsRes, corpsRes] = await Promise.all([
          fetch("/api/agents", {
            headers: { "privy-id-token": identityToken },
          }),
          fetch("/api/swarm/corporations"),
        ]);

        const agentsData = agentsRes.ok ? await agentsRes.json() : { agents: [] };
        const corpsData = corpsRes.ok ? await corpsRes.json() : { corporations: [] };

        setStats({
          agentCount: agentsData.agents?.length || 0,
          corporationCount: corpsData.corporations?.length || 0,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [identityToken]);

  const quickActions = [
    {
      title: "Mint Agent",
      description: "Create a unique AI agent with randomized traits",
      href: "/dashboard/mint",
      icon: Sparkles,
      gradient: "from-[#f48f8e] to-[#120557]",
    },
    {
      title: "Incorporate",
      description: "Launch your AI corporation on Solana",
      href: "/dashboard/incorporate",
      icon: Building2,
      gradient: "from-[#4a3ab0] to-[#120557]",
    },
    {
      title: "View Network",
      description: "Explore the agent swarm visualization",
      href: "/dashboard/network",
      icon: Network,
      gradient: "from-[#10b981] to-[#059669]",
    },
  ];

  const statsCards = [
    {
      label: "Your Agents",
      value: stats.agentCount,
      icon: Bot,
      color: "coral",
    },
    {
      label: "Corporations",
      value: stats.corporationCount,
      icon: Building2,
      color: "indigo",
    },
    {
      label: "Network Agents",
      value: "128+",
      icon: Users,
      color: "green",
    },
    {
      label: "Total Volume",
      value: "$2.4M+",
      icon: Coins,
      color: "coral",
    },
  ];

  const userEmail = user?.email?.address || user?.linkedAccounts?.find(
    (acc) => acc.type === "email"
  )?.address;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back{userEmail ? `, ${userEmail.split("@")[0]}` : ""}!
        </h1>
        <p className="text-white/60">
          Here&apos;s what&apos;s happening with your AI agents and corporations.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="p-5 rounded-2xl bg-[#0a0520]/50 border border-white/10 animate-pulse">
              <div className="h-8 w-8 rounded-lg bg-[#120557]/50 mb-3" />
              <div className="h-8 w-16 rounded bg-[#120557]/50 mb-1" />
              <div className="h-4 w-24 rounded bg-[#120557]/50" />
            </div>
          ))
        ) : (
          statsCards.map((stat, i) => {
            const Icon = stat.icon;
            const colorClasses = {
              coral: "bg-[#f48f8e]/20 text-[#f48f8e]",
              indigo: "bg-[#120557]/40 text-[#4a3ab0]",
              green: "bg-[#10b981]/20 text-[#10b981]",
            };
            
            return (
              <div
                key={i}
                className="p-5 rounded-2xl bg-[#0a0520]/50 border border-white/10 hover:border-white/20 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl ${colorClasses[stat.color as keyof typeof colorClasses]} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold mb-1">{stat.value}</p>
                <p className="text-sm text-white/40">{stat.label}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <Link
                key={i}
                href={action.href}
                className="group relative p-6 rounded-2xl bg-[#0a0520]/50 border border-white/10 hover:border-white/20 transition-all overflow-hidden"
              >
                {/* Gradient hover effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
                
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="font-semibold mb-1 flex items-center gap-2">
                  {action.title}
                  <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </h3>
                <p className="text-sm text-white/60">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent activity placeholder */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="rounded-2xl bg-[#0a0520]/50 border border-white/10 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#120557]/30 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-white/30" />
          </div>
          <h3 className="font-semibold mb-2">No recent activity</h3>
          <p className="text-sm text-white/40 mb-4">
            Start by minting your first AI agent or incorporating a corporation.
          </p>
          <Link
            href="/dashboard/mint"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#f48f8e] to-[#120557] rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" />
            Mint Your First Agent
          </Link>
        </div>
      </div>
    </div>
  );
}
