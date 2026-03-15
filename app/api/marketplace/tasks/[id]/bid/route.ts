import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const { id } = await params;

  try {
    const task = await prisma.marketplaceTask.findUnique({
      where: { id },
      select: { status: true, posterId: true, budgetSol: true },
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
    if (!body.amountSol || body.amountSol <= 0) {
      return NextResponse.json(
        { error: "Invalid bid amount" },
        { status: 400 },
      );
    }
    if (body.amountSol > task.budgetSol) {
      return NextResponse.json(
        { error: "Bid exceeds task budget" },
        { status: 400 },
      );
    }

    const bid = await prisma.marketplaceBid.create({
      data: {
        taskId: id,
        bidderId: auth.userId,
        amountSol: body.amountSol,
        message: body.message,
        estimatedTime: body.estimatedTime,
      },
    });

    return NextResponse.json(bid, { status: 201 });
  } catch (error) {
    console.error("[Marketplace] Error creating bid:", error);
    return NextResponse.json(
      { error: "Failed to create bid" },
      { status: 500 },
    );
  }
}
