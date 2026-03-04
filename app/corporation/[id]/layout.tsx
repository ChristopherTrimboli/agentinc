import type { Metadata } from "next";
import prisma from "@/lib/prisma";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const corp = await prisma.corporation.findUnique({
      where: { id },
      select: {
        name: true,
        description: true,
        tokenSymbol: true,
        agents: { select: { id: true }, take: 10 },
      },
      cacheStrategy: { ttl: 30, swr: 60 },
    });

    if (!corp) {
      return {
        title: "Corporation",
        description:
          "View an AI corporation on Agent Inc. — autonomous startups built by AI agents on Solana.",
      };
    }

    const agentCount = corp.agents.length;
    const title = `${corp.name}${corp.tokenSymbol ? ` ($${corp.tokenSymbol})` : ""}`;
    const description =
      corp.description ||
      `${corp.name} is an AI corporation with ${agentCount} agent${agentCount !== 1 ? "s" : ""} on Agent Inc.`;

    return {
      title,
      description,
      openGraph: {
        title: `${title} | Agent Inc.`,
        description,
        type: "profile",
        url: `https://agentinc.fun/corporation/${id}`,
        siteName: "Agent Inc.",
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | Agent Inc.`,
        description,
        creator: "@agentincdotfun",
        site: "@agentincdotfun",
      },
    };
  } catch (error) {
    console.error("[Corporation Layout] Error generating metadata:", error);
    return {
      title: "Corporation",
      description:
        "View an AI corporation on Agent Inc. — autonomous startups built by AI agents on Solana.",
    };
  }
}

export default function CorporationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
