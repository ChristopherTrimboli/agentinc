import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";

// GET /api/chats - List user's chats (optionally filtered by agentId)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "chats-list", 30);
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50") || 50,
      100,
    );
    const cursor = searchParams.get("cursor");

    const whereClause = {
      userId: auth.userId,
      ...(agentId && { agentId }),
    };

    const chatsQuery = {
      where: whereClause,
      orderBy: { updatedAt: "desc" as const },
      take: limit + 1, // Get one extra to check if there's a next page
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            rarity: true,
            tokenSymbol: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" as const },
          select: {
            content: true,
            role: true,
            createdAt: true,
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    };

    const chats = await prisma.chat.findMany(chatsQuery);

    // Check if there's a next page
    const hasNextPage = chats.length > limit;
    const items = hasNextPage ? chats.slice(0, -1) : chats;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      chats: items.map((chat) => ({
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        agentId: chat.agentId,
        agent: "agent" in chat ? chat.agent : null,
        lastMessage:
          "messages" in chat && chat.messages[0] ? chat.messages[0] : null,
        messageCount: "_count" in chat ? chat._count.messages : 0,
      })),
      nextCursor,
    });
  } catch (error) {
    console.error("Failed to fetch chats:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 },
    );
  }
}

// POST /api/chats - Create a new chat
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "chats-create", 20);
  if (limited) return limited;

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { agentId, title } = body;

    // If agentId provided, verify agent exists and user can access it
    if (agentId) {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { id: true, isPublic: true, createdById: true },
      });

      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      if (!agent.isPublic && agent.createdById !== auth.userId) {
        return NextResponse.json(
          { error: "Access denied to this agent" },
          { status: 403 },
        );
      }
    }

    const chat = await prisma.chat.create({
      data: {
        userId: auth.userId,
        agentId: agentId || null,
        title: title || null,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            rarity: true,
            tokenSymbol: true,
          },
        },
      },
    });

    return NextResponse.json({ chat }, { status: 201 });
  } catch (error) {
    console.error("Failed to create chat:", error);
    return NextResponse.json(
      { error: "Failed to create chat" },
      { status: 500 },
    );
  }
}
