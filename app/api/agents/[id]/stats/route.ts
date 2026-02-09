import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/agents/[id]/stats - Get agent statistics (chats, messages, community activity)
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    // Cache stats: 60s TTL with 120s SWR
    const cacheStrategy = { ttl: 60, swr: 120 };

    // Check if agent exists (by ID or tokenMint)
    const agent = await prisma.agent.findFirst({
      where: {
        OR: [{ id }, { tokenMint: id }],
      },
      select: {
        id: true,
        isPublic: true,
      },
      cacheStrategy,
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Fetch all statistics in parallel
    const [
      totalChats,
      totalChatMessages,
      uniqueChatUsers,
      generalCommunityMessages,
      vipCommunityMessages,
    ] = await Promise.all([
      // Total chat sessions with this agent
      prisma.chat.count({
        where: { agentId: agent.id },
        cacheStrategy,
      }),

      // Total messages in chats with this agent
      prisma.chatMessage.count({
        where: {
          chat: {
            agentId: agent.id,
          },
        },
        cacheStrategy,
      }),

      // Unique users who have chatted with this agent
      prisma.chat
        .findMany({
          where: { agentId: agent.id },
          select: { userId: true },
          distinct: ["userId"],
          cacheStrategy,
        })
        .then((users) => users.length),

      // General community chat messages
      prisma.agentChatMessage.count({
        where: {
          agentId: agent.id,
          isVip: false,
        },
        cacheStrategy,
      }),

      // VIP community chat messages
      prisma.agentChatMessage.count({
        where: {
          agentId: agent.id,
          isVip: true,
        },
        cacheStrategy,
      }),
    ]);

    return NextResponse.json({
      stats: {
        chats: {
          totalSessions: totalChats,
          totalMessages: totalChatMessages,
          uniqueUsers: uniqueChatUsers,
          averageMessagesPerSession:
            totalChats > 0 ? Math.round(totalChatMessages / totalChats) : 0,
        },
        community: {
          generalMessages: generalCommunityMessages,
          vipMessages: vipCommunityMessages,
          totalMessages: generalCommunityMessages + vipCommunityMessages,
        },
      },
    });
  } catch (error) {
    console.error("[Agent Stats API] Failed to fetch stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent statistics" },
      { status: 500 },
    );
  }
}
