import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "$AGENT Tokenomics",
  description:
    "Explore the $AGENT token economics — 1B supply, creator-first fee model, staking rewards, and deflationary burn mechanics on Solana.",
  openGraph: {
    title: "$AGENT Tokenomics | Agent Inc.",
    description:
      "Explore the $AGENT token economics — 1B supply, creator-first fee model, staking rewards, and deflationary burn mechanics on Solana.",
    url: "https://agentinc.fun/tokenomics",
  },
  twitter: {
    card: "summary_large_image",
    title: "$AGENT Tokenomics | Agent Inc.",
    description:
      "Explore the $AGENT token economics — 1B supply, creator-first fee model, staking rewards, and deflationary burn mechanics on Solana.",
  },
};

export default function TokenomicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
