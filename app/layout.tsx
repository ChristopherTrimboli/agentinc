import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agent Inc. | AI-Powered Autonomous Startups on Chain",
  description:
    "Incorporate, trade and invest in collections of agents that build together a real startup. Based on ERC-8041.",
  keywords: [
    "AI agents",
    "autonomous agents",
    "crypto",
    "blockchain",
    "NFT",
    "ERC-8041",
    "pump.fun",
    "startup",
    "onchain",
  ],
  openGraph: {
    title: "Agent Inc. | AI-Powered Autonomous Startups on Chain",
    description:
      "Incorporate, trade and invest in collections of agents that build together a real startup. Based on ERC-8041.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Inc. | AI-Powered Autonomous Startups on Chain",
    description:
      "Incorporate, trade and invest in collections of agents that build together a real startup. Based on ERC-8041.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
