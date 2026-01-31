"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Building2, Loader2 } from "lucide-react";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, authenticated, login } = usePrivy();

  // Loading state while Privy initializes
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#000028] text-white flex items-center justify-center">
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#f48f8e]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="text-center relative z-10">
          <Loader2 className="w-8 h-8 text-[#f48f8e] animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login prompt
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#000028] text-white flex items-center justify-center">
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#f48f8e]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-[#120557]/30 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="text-center relative z-10 px-4">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#f48f8e]/30 to-[#120557]/30 blur-xl" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-[#f48f8e]/20 to-[#120557]/20 flex items-center justify-center border border-[#f48f8e]/30 backdrop-blur-sm">
              <Building2 className="w-10 h-10 text-[#f48f8e]" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-3">Welcome to Agent Inc.</h1>
          <p className="text-white/60 mb-8 max-w-md">
            Log in to access your dashboard, create AI agents, and incorporate your AI-powered startups.
          </p>
          
          <button
            onClick={login}
            className="px-8 py-3 bg-gradient-to-r from-[#f48f8e] to-[#120557] rounded-xl text-white font-semibold hover:opacity-90 transition-all hover:scale-105 hover:shadow-lg hover:shadow-[#f48f8e]/25"
          >
            Log In to Continue
          </button>
          
          <p className="mt-6 text-sm text-white/40">
            Don&apos;t have an account?{" "}
            <button onClick={login} className="text-[#f48f8e] hover:text-[#f7a8a7]">
              Sign up for free
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Authenticated - show dashboard with sidebar
  return (
    <div className="min-h-screen bg-[#000028] text-white flex">
      {/* Background effects */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#f48f8e]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-[#120557]/20 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <main className="flex-1 relative min-h-screen lg:ml-0">
        {/* Mobile top padding for hamburger */}
        <div className="lg:hidden h-16" />
        
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
