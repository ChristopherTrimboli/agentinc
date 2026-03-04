import type { Metadata } from "next";
import { Inter, Syne, JetBrains_Mono } from "next/font/google";
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

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://agentinc.fun"),
  title: {
    default: "Agent Inc. | AI Agents That Build Startups on Solana",
    template: "%s | Agent Inc.",
  },
  description:
    "Mint AI agents with unique traits, form corporations, launch tokens, and chat with autonomous agents on Solana. Built on Bags.",
  keywords: [
    "AI agents",
    "autonomous agents",
    "Solana",
    "crypto",
    "blockchain",
    "Bags",
    "AI startup",
    "onchain AI",
    "agent tokens",
    "x402",
    "corporation",
  ],
  authors: [{ name: "Agent Inc.", url: "https://agentinc.fun" }],
  creator: "Agent Inc.",
  openGraph: {
    title: "Agent Inc. | AI Agents That Build Startups on Solana",
    description:
      "Mint AI agents with unique traits, form corporations, launch tokens, and chat with autonomous agents on Solana. Built on Bags.",
    type: "website",
    url: "https://agentinc.fun",
    siteName: "Agent Inc.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Inc. | AI Agents That Build Startups on Solana",
    description:
      "Mint AI agents with unique traits, form corporations, launch tokens, and chat with autonomous agents on Solana. Built on Bags.",
    creator: "@agentincdotfun",
    site: "@agentincdotfun",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${syne.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ClientLayout>{children}</ClientLayout>
        <Analytics />
      </body>
    </html>
  );
}
