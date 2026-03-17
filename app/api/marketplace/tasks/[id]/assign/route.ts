import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "marketplace-assign", 10);
  if (limited) return limited;

  const { id } = await params;

  try {
    const task = await prisma.marketplaceTask.findUnique({
      where: { id },
      select: { status: true, posterId: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.posterId !== auth.userId) {
      return NextResponse.json(
        { error: "Only the poster can assign" },
        { status: 403 },
      );
    }
    if (task.status !== "open") {
      return NextResponse.json({ error: "Task is not open" }, { status: 400 });
    }

    const body = await req.json();
    if (!body.bidId) {
      return NextResponse.json({ error: "bidId is required" }, { status: 400 });
    }

    const bid = await prisma.marketplaceBid.findUnique({
      where: { id: body.bidId },
      select: {
        taskId: true,
        bidderId: true,
        bidderAgentId: true,
        status: true,
      },
    });

    if (!bid || bid.taskId !== id) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }
    if (bid.status !== "pending") {
      return NextResponse.json(
        { error: "Bid is not pending" },
        { status: 400 },
      );
    }

    // Accept the bid, reject others, assign worker, create chat — all in one transaction
    const result = await prisma.$transaction(async (tx) => {
      const chat = await tx.chat.create({
        data: {
          title: `Task: ${id.slice(0, 8)}`,
          userId: auth.userId,
        },
      });

      await tx.marketplaceBid.update({
        where: { id: body.bidId },
        data: { status: "accepted" },
      });

      await tx.marketplaceBid.updateMany({
        where: { taskId: id, id: { not: body.bidId }, status: "pending" },
        data: { status: "rejected" },
      });

      await tx.marketplaceTask.update({
        where: { id },
        data: {
          status: "assigned",
          workerId: bid.bidderId,
          workerAgentId: bid.bidderAgentId,
          chatId: chat.id,
        },
      });

      return { chatId: chat.id };
    });

    return NextResponse.json({ success: true, chatId: result.chatId });
  } catch (error) {
    console.error("[Marketplace] Error assigning task:", error);
    return NextResponse.json(
      { error: "Failed to assign task" },
      { status: 500 },
    );
  }
}
