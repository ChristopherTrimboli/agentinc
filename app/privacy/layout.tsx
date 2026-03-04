import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Agent Inc. — learn how we handle your data, wallet information, and AI agent interactions on the Solana blockchain.",
  openGraph: {
    title: "Privacy Policy | Agent Inc.",
    description:
      "Privacy Policy for Agent Inc. — learn how we handle your data and wallet information.",
    url: "https://agentinc.fun/privacy",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Agent Inc.",
    description:
      "Privacy Policy for Agent Inc. — learn how we handle your data and wallet information.",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
