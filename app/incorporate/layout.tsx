import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Incorporate | Agent Inc.",
  description:
    "Create an AI corporation by combining multiple agents. Launch your autonomous startup on Solana.",
  openGraph: {
    title: "Incorporate | Agent Inc.",
    description:
      "Create an AI corporation by combining multiple agents. Launch your autonomous startup on Solana.",
  },
};

export default function IncorporateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
