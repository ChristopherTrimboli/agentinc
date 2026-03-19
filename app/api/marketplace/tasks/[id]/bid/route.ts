import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import { sendEmail, bidPlacedEmail } from "@/lib/email";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "marketplace-bid", 10);
  if (limited) return limited;

  const { id } = await params;

  try {
    const task = await prisma.marketplaceTask.findUnique({
      where: { id },
      select: {
        status: true,
        posterId: true,
        budgetSol: true,
        title: true,
        tokenMint: true,
        tokenSymbol: true,
        tokenFeesClaimed: true,
        featuredImage: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.status !== "open") {
      return NextResponse.json(
        { error: "Task is not open for bids" },
        { status: 400 },
      );
    }
    if (task.posterId === auth.userId) {
      return NextResponse.json(
        { error: "Cannot bid on your own task" },
        { status: 400 },
      );
    }

    const body = await req.json();
    if (
      typeof body.amountSol !== "number" ||
      isNaN(body.amountSol) ||
      body.amountSol <= 0
    ) {
      return NextResponse.json(
        { error: "Bid amount must be a positive number" },
        { status: 400 },
      );
    }
    const budgetSol = Number(task.budgetSol);
    if (budgetSol > 0 && body.amountSol > budgetSol) {
      return NextResponse.json(
        { error: "Bid exceeds task budget" },
        { status: 400 },
      );
    }
    if (body.message !== undefined && body.message !== null) {
      if (typeof body.message !== "string" || body.message.length > 5000) {
        return NextResponse.json(
          { error: "Message must be a string of 5000 chars or less" },
          { status: 400 },
        );
      }
    }
    if (body.estimatedTime !== undefined && body.estimatedTime !== null) {
      if (
        typeof body.estimatedTime !== "string" ||
        body.estimatedTime.length > 200
      ) {
        return NextResponse.json(
          { error: "estimatedTime must be a string of 200 chars or less" },
          { status: 400 },
        );
      }
    }

    // Check for any existing bid (schema enforces @@unique([taskId, bidderId]))
    const existingBid = await prisma.marketplaceBid.findFirst({
      where: { taskId: id, bidderId: auth.userId },
    });
    if (existingBid) {
      return NextResponse.json(
        {
          error:
            existingBid.status === "pending"
              ? "You already have a pending bid on this task"
              : "You have already bid on this task",
        },
        { status: 409 },
      );
    }

    const bid = await prisma.marketplaceBid.create({
      data: {
        taskId: id,
        bidderId: auth.userId,
        amountSol: body.amountSol,
        message: body.message ?? null,
        estimatedTime: body.estimatedTime ?? null,
      },
    });

    // Notify poster via email (fire-and-forget)
    prisma.user
      .findUnique({
        where: { id: task.posterId },
        select: { email: true },
      })
      .then((poster) => {
        if (poster?.email) {
          const { subject, html } = bidPlacedEmail({
            taskTitle: task.title,
            taskId: id,
            budgetSol: Number(task.budgetSol),
            creatorFees: Number(task.tokenFeesClaimed),
            tokenMint: task.tokenMint,
            tokenSymbol: task.tokenSymbol,
            featuredImage: task.featuredImage,
            bidAmountSol: body.amountSol,
            bidMessage: body.message,
            bidEstimatedTime: body.estimatedTime,
          });
          sendEmail({ to: poster.email, subject, html });
        }
      })
      .catch(() => {});

    return NextResponse.json(bid, { status: 201 });
  } catch (error) {
    console.error("[Marketplace] Error creating bid:", error);
    return NextResponse.json(
      { error: "Failed to create bid" },
      { status: 500 },
    );
  }
}
