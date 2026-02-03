"use client";

import { usePrivy } from "@privy-io/react-auth";
import {
  Building2,
  Store,
  LayoutDashboard,
  Bot,
  Sparkles,
  Network,
  MessageSquare,
  ChevronLeft,
} from "lucide-react";

// Skeleton sidebar that mirrors the real sidebar structure
function SidebarSkeleton() {
  // Deterministic widths to avoid hydration mismatch (no Math.random())
  const navItems = [
    { icon: Store, width: 75 },
    { icon: LayoutDashboard, width: 70 },
    { icon: Bot, width: 85 },
    { icon: Sparkles, width: 68 },
    { icon: Building2, width: 78 },
    { icon: Network, width: 65 },
    { icon: MessageSquare, width: 82 },
  ];

  return (
    <>
      {/* Sidebar skeleton */}
      <aside className="fixed top-0 left-0 z-50 h-full w-64 bg-[#000028]/95 backdrop-blur-xl border-r border-white/10 flex flex-col -translate-x-full lg:translate-x-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6FEC06]/30 to-[#120557]/30 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-white/30" />
          </div>
          <div className="h-5 w-24 bg-white/10 rounded animate-pulse" />
        </div>

        {/* Navigation skeleton */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              >
                <Icon className="w-5 h-5 text-white/20 flex-shrink-0" />
                <div
                  className="h-4 bg-white/10 rounded animate-pulse"
                  style={{ width: `${item.width}%` }}
                />
              </div>
            );
          })}
        </nav>

        {/* Collapse toggle skeleton */}
        <div className="hidden lg:flex items-center justify-center p-2 mx-3 mb-2">
          <ChevronLeft className="w-5 h-5 text-white/20" />
        </div>

        {/* User section skeleton */}
        <div className="p-3 border-t border-white/10">
          <div className="h-10 bg-white/10 rounded-xl animate-pulse" />
        </div>
      </aside>

      {/* Spacer */}
      <div className="hidden lg:block flex-shrink-0 w-64" />
    </>
  );
}

// Skeleton dashboard content (explore style)
function DashboardSkeleton() {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden">
      {/* Ticker skeleton */}
      <div className="bg-[#0a0520]/80 border-b border-white/10 py-2 w-full max-w-full overflow-hidden">
        <div className="flex gap-8 px-4 overflow-hidden">
          {Array(8)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <div className="w-5 h-5 rounded-full bg-white/10 animate-pulse" />
                <div className="h-4 w-12 bg-white/10 rounded animate-pulse" />
                <div className="h-4 w-14 bg-white/5 rounded animate-pulse" />
              </div>
            ))}
        </div>
      </div>

      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-6 w-32 bg-[#6FEC06]/20 rounded-full animate-pulse mb-4" />
          <div className="h-10 w-80 bg-white/10 rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-96 bg-white/5 rounded animate-pulse" />
        </div>

        {/* Controls skeleton */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 h-12 bg-[#0a0520]/80 border border-white/10 rounded-xl animate-pulse" />
          <div className="h-12 w-48 bg-[#0a0520]/80 border border-white/10 rounded-xl animate-pulse" />
          <div className="h-12 w-24 bg-[#0a0520]/80 border border-white/10 rounded-xl animate-pulse" />
        </div>

        {/* Table skeleton */}
        <div className="rounded-2xl bg-[#0a0520]/50 border border-white/10 overflow-hidden">
          <div className="flex gap-8 px-4 py-4 border-b border-white/10">
            <div className="h-4 w-8 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
          </div>
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-8 px-4 py-4 border-b border-white/5"
              >
                <div className="h-4 w-8 bg-white/5 rounded animate-pulse" />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 animate-pulse" />
                  <div>
                    <div className="h-4 w-24 bg-white/10 rounded animate-pulse mb-1" />
                    <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-4 w-16 bg-[#6FEC06]/10 rounded animate-pulse" />
                <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
                <div className="h-5 w-16 bg-white/5 rounded-full animate-pulse" />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// Lazy load the real sidebar only when authenticated
import dynamic from "next/dynamic";
const Sidebar = dynamic(() => import("../components/Sidebar"), {
  ssr: false,
  loading: () => <SidebarSkeleton />,
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, authenticated, login } = usePrivy();

  // Loading state while Privy initializes - show blurred skeleton dashboard
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#000028] text-white flex relative overflow-hidden">
        {/* Background effects */}
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#6FEC06]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-[#120557]/20 rounded-full blur-[100px] pointer-events-none" />

        {/* Skeleton layout with blur */}
        <div className="flex w-full filter blur-[2px] opacity-60 overflow-hidden">
          <SidebarSkeleton />
          <main className="flex-1 relative min-h-screen lg:ml-0 min-w-0 overflow-x-hidden">
            <div className="lg:hidden h-16" />
            <div className="relative z-10 overflow-x-hidden">
              <DashboardSkeleton />
            </div>
          </main>
        </div>

        {/* Loading indicator overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6FEC06]/30 to-[#120557]/30 flex items-center justify-center mb-3 animate-pulse">
              <Building2 className="w-6 h-6 text-[#6FEC06]" />
            </div>
            <div className="flex gap-1">
              <span
                className="w-2 h-2 bg-[#6FEC06] rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-2 h-2 bg-[#6FEC06] rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-2 h-2 bg-[#6FEC06] rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - show login prompt
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#000028] text-white flex items-center justify-center">
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#6FEC06]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-[#120557]/30 rounded-full blur-[100px] pointer-events-none" />

        <div className="text-center relative z-10 px-4">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#6FEC06]/30 to-[#120557]/30 blur-xl" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[#6FEC06]/20 to-[#120557]/20 flex items-center justify-center border border-[#6FEC06]/30 backdrop-blur-sm">
              <Building2 className="w-10 h-10 text-[#6FEC06]" />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-3">Welcome to Agent Inc.</h1>
          <p className="text-white/60 mb-8 max-w-md">
            Log in to access your dashboard, create AI agents, and incorporate
            your AI-powered startups.
          </p>

          <button
            onClick={login}
            className="px-8 py-3 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-xl text-black font-semibold hover:opacity-90 transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#6FEC06]/25"
          >
            Log In to Continue
          </button>

          <p className="mt-6 text-sm text-white/40">
            Don&apos;t have an account?{" "}
            <button
              onClick={login}
              className="text-[#6FEC06] hover:text-[#9FF24A]"
            >
              Sign up for free
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Authenticated - show dashboard with sidebar
  return (
    <div className="h-screen bg-[#000028] text-white flex overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#6FEC06]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-[#120557]/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 relative h-full lg:ml-0 min-w-0 overflow-hidden flex flex-col">
        {/* Mobile top padding for hamburger */}
        <div className="lg:hidden h-16 shrink-0" />

        <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
