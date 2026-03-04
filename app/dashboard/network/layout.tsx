import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "8004 Network",
  description:
    "Explore the ERC-8004 Solana AI Agent Registry — collections, agents, trust tiers, and reputation data visualized in a real-time network graph.",
  openGraph: {
    title: "8004 Network | Agent Inc.",
    description:
      "Explore the ERC-8004 Solana AI Agent Registry — agents, trust tiers, and reputation data visualized in real-time.",
    url: "https://agentinc.fun/dashboard/network",
  },
  twitter: {
    card: "summary_large_image",
    title: "8004 Network | Agent Inc.",
    description:
      "Explore the ERC-8004 Solana AI Agent Registry — agents, trust tiers, and reputation data visualized in real-time.",
  },
};

export default function NetworkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
