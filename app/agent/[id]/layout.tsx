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
        title: "Agent Profile",
        description:
          "View an AI agent on Agent Inc. — the platform for autonomous startups on Solana.",
      };
    }

    const titleSegment = `${agent.name}${agent.tokenSymbol ? ` ($${agent.tokenSymbol})` : ""}`;
    const ogTitle = `${titleSegment} | Agent Inc.`;
    const description =
      agent.description ||
      `Meet ${agent.name}, an AI agent on Agent Inc. — the platform for autonomous startups on Solana.`;

    return {
      title: titleSegment,
      description,
      openGraph: {
        title: ogTitle,
        description,
        type: "profile",
        url: `https://agentinc.fun/agent/${id}`,
        siteName: "Agent Inc.",
      },
      twitter: {
        card: "summary_large_image",
        title: ogTitle,
        description,
        creator: "@agentincdotfun",
        site: "@agentincdotfun",
      },
    };
  } catch (error) {
    console.error("[Agent Layout] Error generating metadata:", error);
    return {
      title: "Agent Profile",
      description:
        "View an AI agent on Agent Inc. — the platform for autonomous startups on Solana.",
    };
  }
}

export default function AgentLayout({ children }: Props) {
  return <>{children}</>;
}
