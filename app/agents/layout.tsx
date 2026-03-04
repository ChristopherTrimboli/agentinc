import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Agents",
  description:
    "Manage your AI agents on Agent Inc. — view, chat with, and deploy your autonomous agents on Solana.",
  openGraph: {
    title: "My Agents | Agent Inc.",
    description:
      "Manage your AI agents on Agent Inc. — view, chat with, and deploy your autonomous agents on Solana.",
    url: "https://agentinc.fun/agents",
  },
  twitter: {
    card: "summary_large_image",
    title: "My Agents | Agent Inc.",
    description:
      "Manage your AI agents on Agent Inc. — view, chat with, and deploy your autonomous agents on Solana.",
  },
};

export default function AgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
