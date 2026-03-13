"use client";

import { useState, useEffect } from "react";
import { Check, ExternalLink, ShieldCheck, Loader2 } from "lucide-react";
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
  chatPath?: string;
  creatorAddress?: string;
}

type RegistrationStatus = "pending" | "registered" | "failed";

const POLL_INTERVAL = 3000;
const POLL_MAX = 20;

export function MintSuccessScreen({
  launchResult,
  agentName,
  agentTraits,
  tokenSymbol,
  imageUrl,
  onMintAnother,
  chatPath,
  creatorAddress,
}: MintSuccessScreenProps) {
  const router = useRouter();
  const chatUrl =
    chatPath ||
    `/dashboard/chat?agent=${launchResult.tokenMint || launchResult.agentId}`;

  const [regStatus, setRegStatus] = useState<RegistrationStatus>("pending");
  const [regAsset, setRegAsset] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (cancelled || attempts >= POLL_MAX) {
        if (!cancelled) setRegStatus("failed");
        return;
      }
      attempts++;
      try {
        const res = await fetch(`/api/agents/${launchResult.agentId}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data.agent?.erc8004Asset) {
            setRegStatus("registered");
            setRegAsset(data.agent.erc8004Asset);
            return;
          }
        }
      } catch {
        /* continue */
      }
      if (!cancelled) {
        timer = setTimeout(poll, POLL_INTERVAL);
      }
    }

    timer = setTimeout(poll, POLL_INTERVAL);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [launchResult.agentId]);

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
            creatorAddress={
              creatorAddress || launchResult.signature.slice(0, 44)
            }
            description=""
            tokenSymbol={tokenSymbol}
          />
        </div>

        <div className="bg-[#0a0520]/60 rounded-2xl p-6 mb-8 text-left border border-white/10 max-w-lg mx-auto space-y-4">
          <div>
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

          {/* 8004 Registration Status */}
          <div>
            <p className="text-white/40 uppercase tracking-wider text-xs font-semibold mb-2">
              8004 Identity
            </p>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-[#120557]/50 border-[#6FEC06]/20">
              {regStatus === "pending" && (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#6FEC06]/60 shrink-0" />
                  <span className="text-sm text-white/50">
                    Registering on 8004 network...
                  </span>
                </>
              )}
              {regStatus === "registered" && (
                <>
                  <ShieldCheck className="w-4 h-4 text-[#6FEC06] shrink-0" />
                  <span className="font-mono text-sm text-white/70 truncate flex-1">
                    {regAsset}
                  </span>
                </>
              )}
              {regStatus === "failed" && (
                <>
                  <ShieldCheck className="w-4 h-4 text-white/30 shrink-0" />
                  <span className="text-sm text-white/40">
                    Registration pending — register from agent page
                  </span>
                </>
              )}
            </div>
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
