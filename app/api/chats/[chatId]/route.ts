import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuthUserId } from "@/lib/auth/verifyRequest";

type RouteContext = {
  params: Promise<{ chatId: string }>;
};

// GET /api/chats/[chatId] - Get a specific chat with all messages
export async function GET(req: NextRequest, context: RouteContext) {
  const { chatId } = await context.params;
  const userId = await verifyAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            rarity: true,
            tokenSymbol: true,
            personality: true,
            description: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            parts: true,
            createdAt: true,
          },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Verify ownership
    if (chat.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ chat });
  } catch (error) {
    console.error("Failed to fetch chat:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 },
    );
  }
}

// PATCH /api/chats/[chatId] - Update chat (e.g., title)
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { chatId } = await context.params;
  const userId = await verifyAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify ownership
    const existingChat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { userId: true },
    });

    if (!existingChat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (existingChat.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { title } = body;

    const chat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        ...(title !== undefined && { title: title?.trim() || null }),
      },
    });

    return NextResponse.json({ chat });
  } catch (error) {
    console.error("Failed to update chat:", error);
    return NextResponse.json(
      { error: "Failed to update chat" },
      { status: 500 },
    );
  }
}

// DELETE /api/chats/[chatId] - Delete a chat
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { chatId } = await context.params;
  const userId = await verifyAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify ownership
    const existingChat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { userId: true },
    });

    if (!existingChat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (existingChat.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.chat.delete({
      where: { id: chatId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete chat:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 },
    );
  }
}
