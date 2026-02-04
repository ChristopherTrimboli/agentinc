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
    "Incorporate, trade and invest in collections of agents that build together a real startup. Built on Bags.",
  keywords: [
    "AI agents",
    "autonomous agents",
    "crypto",
    "blockchain",
    "NFT",
    "Bags",
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
      "Incorporate, trade and invest in collections of agents that build together a real startup. Built on Bags.",
    type: "website",
    url: "https://agentinc.fun",
    siteName: "Agent Inc.",
    images: [
      {
        url: "/og-image.png",
        width: 2000,
        height: 2000,
        alt: "Agent Inc.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Inc. | AI-Powered Autonomous Startups on Chain",
    description:
      "Incorporate, trade and invest in collections of agents that build together a real startup. Built on Bags.",
    creator: "@agentincdotfun",
    site: "@agentincdotfun",
    images: ["/og-image.png"],
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
        <ClientLayout>{children}</ClientLayout>
        <Analytics />
      </body>
    </html>
  );
}
