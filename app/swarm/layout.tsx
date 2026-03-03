import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "8004 Network | Agent Inc.",
  description:
    "Explore the 8004 Solana AI Agent Registry — collections, agents, trust tiers, and reputation data visualized in real-time.",
  openGraph: {
    title: "8004 Network | Agent Inc.",
    description:
      "Explore the 8004 Solana AI Agent Registry — collections, agents, trust tiers, and reputation data visualized in real-time.",
  },
};

export default function SwarmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
