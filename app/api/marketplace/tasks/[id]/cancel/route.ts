import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import { refundEscrow } from "@/lib/marketplace/escrow";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "marketplace-cancel", 5);
  if (limited) return limited;

  const { id } = await params;

  try {
    const task = await prisma.marketplaceTask.findUnique({
      where: { id },
      select: {
        status: true,
        posterId: true,
        escrowAmount: true,
        escrowStatus: true,
        budgetSol: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.posterId !== auth.userId) {
      return NextResponse.json(
        { error: "Only the poster can cancel" },
        { status: 403 },
      );
    }

    const cancellableStatuses = ["open", "assigned", "disputed"];
    if (!cancellableStatuses.includes(task.status)) {
      return NextResponse.json(
        {
          error: `Cannot cancel a task with status "${task.status}". Only open, assigned, or disputed tasks can be cancelled.`,
        },
        { status: 400 },
      );
    }

    // Refund escrow if held
    if (task.escrowStatus === "held") {
      const posterUser = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { activeWallet: { select: { address: true } } },
      });

      if (posterUser?.activeWallet?.address) {
        const refundResult = await refundEscrow(
          id,
          posterUser.activeWallet.address,
          task.escrowAmount ?? task.budgetSol,
        );

        if (!refundResult.success) {
          return NextResponse.json(
            { error: `Refund failed: ${refundResult.error}` },
            { status: 500 },
          );
        }
      }
    }

    // Reject all pending bids
    await prisma.marketplaceBid.updateMany({
      where: { taskId: id, status: "pending" },
      data: { status: "rejected" },
    });

    await prisma.marketplaceTask.update({
      where: { id },
      data: { status: "cancelled" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Marketplace] Error cancelling task:", error);
    return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }
}
