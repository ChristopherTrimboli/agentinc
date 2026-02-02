"use client";

import { Check, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { AgentTraitData } from "@/lib/agentTraits";
import { AgentPreviewCard } from "./AgentPreviewCard";
import { LaunchResult } from "@/lib/hooks/useMintAgent";
import { getBagsFmUrl } from "@/lib/constants/urls";

interface MintSuccessScreenProps {
  launchResult: LaunchResult;
  agentName: string;
  agentTraits: AgentTraitData;
  tokenSymbol: string;
  imageUrl: string;
  onMintAnother: () => void;
  chatPath?: string; // Optional custom chat path
}

export function MintSuccessScreen({
  launchResult,
  agentName,
  agentTraits,
  tokenSymbol,
  imageUrl,
  onMintAnother,
  chatPath,
}: MintSuccessScreenProps) {
  const router = useRouter();
  const chatUrl = chatPath || `/dashboard/chat?agent=${launchResult.agentId}`;

  return (
    <div className="p-6 lg:p-8 flex items-center justify-center min-h-[calc(100vh-64px)]">
      <div className="text-center max-w-2xl w-full">
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#6FEC06]/40 to-[#120557]/40 blur-2xl animate-pulse" />
          <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-[#6FEC06]/20 to-[#120557]/20 flex items-center justify-center border border-[#6FEC06]/40">
            <Check className="w-16 h-16 text-[#6FEC06]" />
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-3 font-display">Agent Minted!</h1>
        <p className="text-white/50 mb-8 text-lg">
          <span className="text-white font-semibold">{agentName}</span> is now
          live with{" "}
          <span className="text-[#6FEC06] font-mono font-semibold">
            ${tokenSymbol.toUpperCase()}
          </span>
        </p>

        <div className="max-w-sm mx-auto mb-8">
          <AgentPreviewCard
            name={agentName}
            traits={agentTraits}
            imageUrl={imageUrl}
          />
        </div>

        <div className="bg-[#0a0520]/60 rounded-2xl p-6 mb-8 text-left border border-white/10 max-w-lg mx-auto">
          <div className="mb-4">
            <p className="text-white/40 uppercase tracking-wider text-xs font-semibold mb-2">
              Token Mint
            </p>
            <p className="font-mono text-sm text-white/70 bg-[#120557]/50 px-3 py-2 rounded-lg truncate border border-[#6FEC06]/20">
              {launchResult.tokenMint}
            </p>
          </div>
          <div>
            <p className="text-white/40 uppercase tracking-wider text-xs font-semibold mb-2">
              Transaction
            </p>
            <p className="font-mono text-sm text-white/70 bg-[#120557]/50 px-3 py-2 rounded-lg truncate border border-[#6FEC06]/20">
              {launchResult.signature}
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href={getBagsFmUrl(launchResult.tokenMint)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6FEC06] to-[#4a9f10] rounded-xl text-black font-semibold transition-all hover:scale-105 shadow-lg shadow-[#6FEC06]/20"
          >
            View on Bags <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => router.push(chatUrl)}
            className="px-6 py-3 bg-[#120557]/50 hover:bg-[#120557]/70 border border-[#6FEC06]/30 rounded-xl font-semibold transition-all hover:scale-105"
          >
            Chat with Agent
          </button>
          <button
            onClick={onMintAnother}
            className="px-6 py-3 bg-[#120557]/50 hover:bg-[#120557]/70 border border-white/10 rounded-xl font-semibold transition-all hover:scale-105"
          >
            Mint Another
          </button>
        </div>
      </div>
    </div>
  );
}
