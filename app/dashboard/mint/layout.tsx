import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mint Agent",
  description:
    "Mint a new AI agent with randomized traits and launch a token on Solana via Bags.",
};

export default function DashboardMintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
