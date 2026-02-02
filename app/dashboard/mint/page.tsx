"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMintAgent } from "@/lib/hooks/useMintAgent";
import { MintWizard } from "@/components/mint";

export default function DashboardMintPage() {
  const { user } = usePrivy();
  const mint = useMintAgent({ user });

  return (
    <MintWizard
      mint={mint}
      chatPath={`/dashboard/chat?agent=${mint.launchResult?.agentId || ""}`}
    />
  );
}
