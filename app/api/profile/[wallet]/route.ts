import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { isValidPublicKey } from "@/lib/utils/validation";

type RouteContext = {
  params: Promise<{ wallet: string }>;
};

interface CommunityMessageResult {
  content: string;
  isVip: boolean;
  createdAt: Date;
  agent: {
    id: string;
    name: string;
    imageUrl: string | null;
    tokenMint: string | null;
    tokenSymbol: string | null;
  };
}

interface ActivityItem {
  type: "agent_created" | "agent_launched" | "community_message";
  createdAt: Date;
  agentId?: string;
  agentName?: string;
  agentImageUrl?: string | null;
  tokenMint?: string | null;
  tokenSymbol?: string | null;
  content?: string;
  isVip?: boolean;
}

// GET /api/profile/[wallet] - public creator profile data by wallet
export async function GET(_req: NextRequest, context: RouteContext) {
  const { wallet } = await context.params;

  if (!wallet || !isValidPublicKey(wallet)) {
    return NextResponse.json(
      { error: "Invalid wallet address" },
      { status: 400 },
    );
  }

  try {
    const normalizedWallet = wallet.trim();
    const cacheStrategy = { ttl: 30, swr: 60 };

    const walletRecord = await prisma.userWallet.findFirst({
      where: { address: normalizedWallet },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            createdAt: true,
            twitterUsername: true,
            activeWalletId: true,
          },
        },
      },
      cacheStrategy,
    });

    if (!walletRecord) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const userId = walletRecord.userId;

    // withAccelerate() overrides findMany's type inference for nested relations;
    // an explicit return type annotation is required here.
    // withAccelerate() v3 drops the select generic from findMany's return type;
    // cast is safe because the select is correct at runtime.
    const communityMessagesPromise = prisma.agentChatMessage.findMany({
      where: { walletAddress: normalizedWallet },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        content: true,
        isVip: true,
        createdAt: true,
        agent: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            tokenMint: true,
            tokenSymbol: true,
          },
        },
      },
      cacheStrategy,
    }) as unknown as Promise<CommunityMessageResult[]>;

    const [
      publicAgents,
      totalAgents,
      totalPublicAgents,
      mintedAgents,
      chatSessions,
      totalCommunityMessages,
      recentCommunityMessages,
      recentAgentLaunches,
      walletsCount,
    ] = await Promise.all([
      prisma.agent.findMany({
        where: {
          createdById: userId,
          isPublic: true,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          rarity: true,
          tokenMint: true,
          tokenSymbol: true,
          createdAt: true,
          launchedAt: true,
        },
        take: 30,
        cacheStrategy,
      }),
      prisma.agent.count({
        where: { createdById: userId },
        cacheStrategy,
      }),
      prisma.agent.count({
        where: { createdById: userId, isPublic: true },
        cacheStrategy,
      }),
      prisma.agent.count({
        where: { createdById: userId, isMinted: true },
        cacheStrategy,
      }),
      prisma.chat.count({
        where: { userId },
        cacheStrategy,
      }),
      prisma.agentChatMessage.count({
        where: { walletAddress: normalizedWallet },
        cacheStrategy,
      }),
      communityMessagesPromise,
      prisma.agent.findMany({
        where: {
          createdById: userId,
          isPublic: true,
          launchedAt: { not: null },
        },
        orderBy: { launchedAt: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          imageUrl: true,
          tokenMint: true,
          tokenSymbol: true,
          launchedAt: true,
        },
        cacheStrategy,
      }),
      prisma.userWallet.count({
        where: { userId },
        cacheStrategy,
      }),
    ]);

    const activity: ActivityItem[] = [
      ...publicAgents.map((agent) => ({
        type: "agent_created" as const,
        createdAt: agent.createdAt,
        agentId: agent.id,
        agentName: agent.name,
        agentImageUrl: agent.imageUrl,
        tokenMint: agent.tokenMint,
        tokenSymbol: agent.tokenSymbol,
      })),
      ...recentAgentLaunches
        .filter((agent) => agent.launchedAt)
        .map((agent) => ({
          type: "agent_launched" as const,
          createdAt: agent.launchedAt!,
          agentId: agent.id,
          agentName: agent.name,
          agentImageUrl: agent.imageUrl,
          tokenMint: agent.tokenMint,
          tokenSymbol: agent.tokenSymbol,
        })),
      ...recentCommunityMessages.map((message) => ({
        type: "community_message" as const,
        createdAt: message.createdAt,
        agentId: message.agent.id,
        agentName: message.agent.name,
        agentImageUrl: message.agent.imageUrl,
        tokenMint: message.agent.tokenMint,
        tokenSymbol: message.agent.tokenSymbol,
        content: message.content,
        isVip: message.isVip,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 40);

    return NextResponse.json({
      profile: {
        walletAddress: normalizedWallet,
        userSince: walletRecord.user.createdAt,
        twitterUsername: walletRecord.user.twitterUsername,
        isActiveWallet: walletRecord.user.activeWalletId === walletRecord.id,
        walletsCount,
      },
      stats: {
        totalAgents,
        publicAgents: totalPublicAgents,
        mintedAgents,
        chatSessions,
        totalCommunityMessages,
      },
      agents: publicAgents,
      recentCommunityMessages: recentCommunityMessages.map((message) => ({
        content: message.content,
        isVip: message.isVip,
        createdAt: message.createdAt,
        agent: message.agent,
      })),
      activity,
    });
  } catch (error) {
    console.error("[Profile API] Failed to fetch profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}
