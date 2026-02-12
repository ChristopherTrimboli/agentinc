import { Metadata } from "next";
import prisma from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    // Fetch agent data (try both ID and tokenMint)
    const [agentById, agentByMint] = await Promise.all([
      prisma.agent.findUnique({
        where: { id },
        select: {
          name: true,
          description: true,
          tokenSymbol: true,
          isPublic: true,
        },
        cacheStrategy: { ttl: 30, swr: 60 },
      }),
      prisma.agent.findUnique({
        where: { tokenMint: id },
        select: {
          name: true,
          description: true,
          tokenSymbol: true,
          isPublic: true,
        },
        cacheStrategy: { ttl: 30, swr: 60 },
      }),
    ]);

    const agent = agentById || agentByMint;

    if (!agent || !agent.isPublic) {
      return {
        title: "Agent Profile | Agent Inc.",
        description: "AI-Powered Autonomous Startups on Chain",
      };
    }

    const title = `${agent.name}${agent.tokenSymbol ? ` ($${agent.tokenSymbol})` : ""} | Agent Inc.`;
    const description =
      agent.description ||
      `Meet ${agent.name}, an AI agent on Agent Inc. - the platform for AI-powered autonomous startups on chain.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "profile",
        url: `https://agentinc.fun/agent/${id}`,
        siteName: "Agent Inc.",
        images: [
          {
            url: `/agent/${id}/opengraph-image`,
            width: 1200,
            height: 630,
            alt: `${agent.name} - Agent Inc.`,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        creator: "@agentincdotfun",
        site: "@agentincdotfun",
        images: [`/agent/${id}/opengraph-image`],
      },
    };
  } catch (error) {
    console.error("[Agent Layout] Error generating metadata:", error);
    return {
      title: "Agent Profile | Agent Inc.",
      description: "AI-Powered Autonomous Startups on Chain",
    };
  }
}

export default function AgentLayout({ children }: Props) {
  return <>{children}</>;
}
