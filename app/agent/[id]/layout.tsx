import { Metadata } from "next";
import prisma from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    // Try to fetch agent by both ID and tokenMint (same logic as the API)
    const [agentById, agentByMint] = await Promise.all([
      prisma.agent.findUnique({
        where: { id },
        select: {
          name: true,
          description: true,
          imageUrl: true,
          tokenSymbol: true,
          tokenMint: true,
          rarity: true,
          isPublic: true,
        },
        cacheStrategy: { ttl: 60, swr: 120 },
      }),
      prisma.agent.findUnique({
        where: { tokenMint: id },
        select: {
          name: true,
          description: true,
          imageUrl: true,
          tokenSymbol: true,
          tokenMint: true,
          rarity: true,
          isPublic: true,
        },
        cacheStrategy: { ttl: 60, swr: 120 },
      }),
    ]);

    const agent = agentById || agentByMint;

    if (!agent || !agent.isPublic) {
      return {
        title: "Agent Not Found | Agent Inc.",
        description: "This agent doesn't exist or is private.",
      };
    }

    const title = `${agent.name}${agent.tokenSymbol ? ` ($${agent.tokenSymbol})` : ""} | Agent Inc.`;
    const description =
      agent.description ||
      `Meet ${agent.name}, an AI agent on Agent Inc. Chat, trade tokens, and explore autonomous AI-powered startups on Solana.`;

    // Use absolute URL for OG images and canonical URL
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://agentinc.fun";
    const ogImage = agent.imageUrl || `${baseUrl}/og-image.png`;
    const canonicalUrl = `${baseUrl}/agent/${agent.tokenMint || id}`;

    return {
      title,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 1200,
            alt: agent.name,
          },
        ],
        type: "profile",
        siteName: "Agent Inc.",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
        creator: "@agentinc",
        site: "@agentinc",
      },
    };
  } catch (error) {
    console.error("[Agent Metadata] Failed to generate metadata:", error);
    return {
      title: "Agent Inc. | AI-Powered Autonomous Startups",
      description:
        "Discover AI agents, mint companies, and trade tokens on Agent Inc.",
    };
  }
}

export default function AgentLayout({ children }: Props) {
  return <>{children}</>;
}
