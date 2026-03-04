import type { Metadata } from "next";
import prisma from "@/lib/prisma";

interface Props {
  params: Promise<{ wallet: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { wallet } = await params;

  try {
    const shortWallet = `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;

    const agentCount = await prisma.agent.count({
      where: {
        owner: {
          wallets: {
            some: { address: wallet },
          },
        },
        isPublic: true,
      },
      cacheStrategy: { ttl: 30, swr: 60 },
    });

    const title = `Profile ${shortWallet}`;
    const description =
      agentCount > 0
        ? `Solana wallet ${shortWallet} owns ${agentCount} AI agent${agentCount !== 1 ? "s" : ""} on Agent Inc.`
        : `View wallet ${shortWallet} on Agent Inc. — AI-powered autonomous startups on Solana.`;

    return {
      title,
      description,
      openGraph: {
        title: `${title} | Agent Inc.`,
        description,
        type: "profile",
        url: `https://agentinc.fun/profile/${wallet}`,
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
    console.error("[Profile Layout] Error generating metadata:", error);
    return {
      title: "Profile",
      description:
        "View a user profile on Agent Inc. — AI-powered autonomous startups on Solana.",
    };
  }
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
