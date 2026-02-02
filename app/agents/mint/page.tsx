"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Sparkles } from "lucide-react";
import Navigation from "../../components/Navigation";
import { useMintAgent } from "@/lib/hooks/useMintAgent";
import { MintWizard } from "@/components/mint";

export default function MintAgentPage() {
  const { ready, authenticated, login, user } = usePrivy();
  const mint = useMintAgent({ user });

  // Login screen for unauthenticated users
  if (ready && !authenticated) {
    return (
      <div className="h-screen bg-[#030712] text-white overflow-hidden">
        <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-500/8 rounded-full blur-[120px] pointer-events-none" />
        <Navigation />
        <main className="h-[calc(100vh-72px)] mt-[72px] flex items-center justify-center px-4">
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/30 to-cyan-500/30 blur-xl animate-pulse" />
              <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center border border-purple-500/30 backdrop-blur-sm">
                <Sparkles className="w-12 h-12 text-purple-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-3 tracking-tight">
              Mint Your Agent
            </h1>
            <p className="text-gray-400 mb-8 text-base max-w-md mx-auto">
              Create a unique AI agent with randomized traits and launch its
              token on Solana
            </p>
            <button
              onClick={login}
              className="group relative px-8 py-4 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
            >
              Log In to Start
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Main mint wizard (wrapped with navigation for public page)
  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-500/6 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[400px] bg-cyan-500/4 rounded-full blur-[120px] pointer-events-none" />
      
      <Navigation />
      
      <main className="pt-[72px]">
        <MintWizard mint={mint} chatPath={`/chat?agent=${mint.launchResult?.agentId || ""}`} />
      </main>
    </div>
  );
}
