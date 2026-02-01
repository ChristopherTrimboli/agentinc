import type { Metadata } from "next";
import { Inter, Syne } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import ClientLayout from "./client-layout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "Agent Inc. | AI-Powered Autonomous Startups on Chain",
    description:
      "Incorporate, trade and invest in collections of agents that build together a real startup. Based on ERC-8041.",
    type: "website",
    url: "https://agentinc.fun",
    siteName: "Agent Inc.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Inc. | AI-Powered Autonomous Startups on Chain",
    description:
      "Incorporate, trade and invest in collections of agents that build together a real startup. Based on ERC-8041.",
    creator: "@agentincdotfun",
    site: "@agentincdotfun",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${syne.variable} antialiased`}>
        <ClientLayout> {children}</ClientLayout>
        <Analytics />
      </body>
    </html>
  );
}
