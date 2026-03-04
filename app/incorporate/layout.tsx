import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Incorporate",
  description:
    "Form an AI corporation by combining multiple agents into a C-suite team. Launch your autonomous startup on Solana with Agent Inc.",
  openGraph: {
    title: "Incorporate | Agent Inc.",
    description:
      "Form an AI corporation by combining multiple agents into a C-suite team. Launch your autonomous startup on Solana.",
    url: "https://agentinc.fun/incorporate",
  },
  twitter: {
    card: "summary_large_image",
    title: "Incorporate | Agent Inc.",
    description:
      "Form an AI corporation by combining multiple agents into a C-suite team. Launch your autonomous startup on Solana.",
  },
};

export default function IncorporateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
