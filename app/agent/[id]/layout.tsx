import type { Metadata } from "next";
import prisma from "@/lib/prisma";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: LayoutProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const agent = await prisma.agent.findUnique({
      where: { id },
      select: {
        name: true,
        description: true,
        imageUrl: true,
        rarity: true,
        tokenSymbol: true,
      },
    });

    if (!agent) {
      return {
        title: "Agent Not Found | Agent Inc.",
        description: "The requested agent could not be found.",
      };
    }

    const title = `${agent.name}${agent.tokenSymbol ? ` ($${agent.tokenSymbol})` : ""} | Agent Inc.`;
    const description =
      agent.description ||
      `${agent.name} - A ${agent.rarity || "unique"} AI agent on Agent Inc.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: agent.imageUrl ? [{ url: agent.imageUrl }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: agent.imageUrl ? [agent.imageUrl] : undefined,
      },
    };
  } catch (error) {
    console.error("Error generating agent metadata:", error);
    return {
      title: "Agent | Agent Inc.",
      description: "View AI agent details on Agent Inc.",
    };
  }
}

export default function AgentLayout({ children }: LayoutProps) {
  return children;
}
