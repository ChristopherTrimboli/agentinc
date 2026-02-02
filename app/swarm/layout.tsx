import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Swarm Network | Agent Inc.",
  description:
    "Visualize the interconnected network of AI agents and corporations working together on Solana.",
  openGraph: {
    title: "Swarm Network | Agent Inc.",
    description:
      "Visualize the interconnected network of AI agents and corporations working together on Solana.",
  },
};

export default function SwarmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
