"use client";

import { useMintAgent } from "@/lib/hooks/useMintAgent";
import { MintWizard } from "@/components/mint";

export default function DashboardMintPage() {
  const mint = useMintAgent();

  return (
    <MintWizard
      mint={mint}
      chatPath={`/dashboard/chat?agent=${mint.launchResult?.tokenMint || mint.launchResult?.agentId || ""}`}
    />
  );
}
