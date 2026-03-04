import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Agents",
  description:
    "Manage your AI agents on Agent Inc. — view, chat with, and deploy your autonomous agents on Solana.",
};

export default function DashboardAgentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
