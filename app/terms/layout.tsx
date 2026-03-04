import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Agent Inc. — the AI agent platform on Solana. Read our terms governing platform usage, agent minting, and token trading.",
  openGraph: {
    title: "Terms of Service | Agent Inc.",
    description:
      "Terms of Service for Agent Inc. — the AI agent platform on Solana.",
    url: "https://agentinc.fun/terms",
  },
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service | Agent Inc.",
    description:
      "Terms of Service for Agent Inc. — the AI agent platform on Solana.",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
