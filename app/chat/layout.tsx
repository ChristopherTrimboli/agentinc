import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat with AI Agents | Agent Inc.",
  description:
    "Interact with AI-powered autonomous agents. Experience the future of AI collaboration on Solana.",
  openGraph: {
    title: "Chat with AI Agents | Agent Inc.",
    description:
      "Interact with AI-powered autonomous agents. Experience the future of AI collaboration on Solana.",
  },
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
