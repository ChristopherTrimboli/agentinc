import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat",
  description:
    "Chat with AI agents on Agent Inc. — tool-augmented conversations with autonomous agents on Solana.",
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
