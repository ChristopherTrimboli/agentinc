import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPrivyClient } from "@/lib/auth/verifyRequest";

// Helper to verify auth and get user ID
async function verifyAuth(req: NextRequest): Promise<string | null> {
  const idToken = req.headers.get("privy-id-token");
  if (!idToken) return null;

  try {
    const privy = getPrivyClient();
    const privyUser = await privy.users().get({ id_token: idToken });
    return privyUser.id;
  } catch {
    return null;
  }
}

type RouteContext = {
  params: Promise<{ chatId: string }>;
};

// POST /api/chats/[chatId]/messages - Add messages to a chat (bulk)
export async function POST(req: NextRequest, context: RouteContext) {
  const { chatId } = await context.params;
  console.log("[ChatMessages API] POST - Adding messages to chat:", chatId);

  const userId = await verifyAuth(req);

  if (!userId) {
    console.log("[ChatMessages API] POST - Unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify chat ownership
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { userId: true, title: true },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 },
      );
    }

    // Validate and prepare messages
    interface ValidMessage {
      chatId: string;
      role: string;
      content: string;
      parts?: object;
    }

    const validMessages: ValidMessage[] = messages.map(
      (msg: { role: string; content: string; parts?: unknown }) => {
        if (!msg.role || !["user", "assistant", "system"].includes(msg.role)) {
          throw new Error("Invalid message role");
        }
        if (typeof msg.content !== "string") {
          throw new Error("Message content must be a string");
        }
        const result: ValidMessage = {
          chatId,
          role: msg.role,
          content: msg.content,
        };
        // Only add parts if it's a valid object
        if (msg.parts && typeof msg.parts === "object") {
          result.parts = msg.parts as object;
        }
        return result;
      },
    );

    // Create messages
    await prisma.chatMessage.createMany({
      data: validMessages,
    });

    // Auto-generate title from first user message if chat has no title
    if (!chat.title && messages.length > 0) {
      const firstUserMessage = messages.find(
        (m: { role: string }) => m.role === "user",
      );
      if (firstUserMessage) {
        const autoTitle = firstUserMessage.content
          .slice(0, 50)
          .replace(/\n/g, " ")
          .trim();
        if (autoTitle) {
          await prisma.chat.update({
            where: { id: chatId },
            data: {
              title:
                autoTitle + (firstUserMessage.content.length > 50 ? "..." : ""),
            },
          });
        }
      }
    }

    // Update chat's updatedAt
    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, count: validMessages.length });
  } catch (error) {
    console.error("Failed to add messages:", error);
    const message =
      error instanceof Error ? error.message : "Failed to add messages";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/chats/[chatId]/messages - Clear all messages from a chat
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { chatId } = await context.params;
  const userId = await verifyAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify chat ownership
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { userId: true },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    if (chat.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete all messages
    await prisma.chatMessage.deleteMany({
      where: { chatId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to clear messages:", error);
    return NextResponse.json(
      { error: "Failed to clear messages" },
      { status: 500 },
    );
  }
}
