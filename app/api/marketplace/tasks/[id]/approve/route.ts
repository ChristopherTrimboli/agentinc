import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import { releaseEscrow, claimTaskTokenFees } from "@/lib/marketplace/escrow";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "marketplace-approve", 10);
  if (limited) return limited;

  const { id } = await params;

  try {
    const task = await prisma.marketplaceTask.findUnique({
      where: { id },
      select: {
        status: true,
        posterId: true,
        workerId: true,
        workerAgentId: true,
        escrowAmount: true,
        escrowStatus: true,
        budgetSol: true,
        listingId: true,
        tokenMint: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.posterId !== auth.userId) {
      return NextResponse.json(
        { error: "Only the poster can approve" },
        { status: 403 },
      );
    }
    if (task.status !== "review") {
      return NextResponse.json(
        { error: "Task is not in review" },
        { status: 400 },
      );
    }

    if (!task.workerId && !task.workerAgentId) {
      return NextResponse.json(
        { error: "No worker assigned" },
        { status: 400 },
      );
    }

    // Atomic status transition to prevent double-approve race condition
    const { count: transitioned } = await prisma.marketplaceTask.updateMany({
      where: { id, status: "review" },
      data: { status: "completed", completedAt: new Date() },
    });
    if (transitioned === 0) {
      return NextResponse.json(
        { error: "Task is no longer in review (concurrent update)" },
        { status: 409 },
      );
    }

    // Resolve worker wallet — human worker directly, agent worker via creator
    let workerWalletAddress: string | null = null;

    if (task.workerId) {
      const workerUser = await prisma.user.findUnique({
        where: { id: task.workerId },
        select: { activeWallet: { select: { address: true } } },
      });
      workerWalletAddress = workerUser?.activeWallet?.address ?? null;
    } else if (task.workerAgentId) {
      const agent = await prisma.agent.findUnique({
        where: { id: task.workerAgentId },
        select: {
          createdBy: {
            select: { activeWallet: { select: { address: true } } },
          },
        },
      });
      workerWalletAddress = agent?.createdBy?.activeWallet?.address ?? null;
    }

    if (!workerWalletAddress) {
      await prisma.marketplaceTask.update({
        where: { id },
        data: { status: "review", completedAt: null },
      });
      return NextResponse.json(
        { error: "Worker has no wallet configured" },
        { status: 400 },
      );
    }

    // Release SOL escrow if held
    const escrowAmount = Number(task.escrowAmount ?? task.budgetSol);
    if (escrowAmount && task.escrowStatus === "held") {
      const escrowResult = await releaseEscrow(
        id,
        workerWalletAddress,
        escrowAmount,
      );

      if (!escrowResult.success) {
        await prisma.marketplaceTask.update({
          where: { id },
          data: { status: "review", completedAt: null },
        });
        return NextResponse.json(
          { error: "Escrow release failed. Please try again." },
          { status: 500 },
        );
      }
    }

    // Claim task token creator fees and forward to worker (non-blocking)
    let tokenFeesClaimed = 0;
    if (task.tokenMint) {
      const feeResult = await claimTaskTokenFees(
        id,
        task.tokenMint,
        workerWalletAddress,
      );
      if (feeResult.success) {
        tokenFeesClaimed = feeResult.claimedSol ?? 0;
      } else {
        console.error(
          "[Marketplace] Token fee claim failed (non-blocking):",
          feeResult.error,
        );
      }
    }

    // Increment listing's completed tasks count (non-blocking)
    if (task.listingId) {
      try {
        await prisma.marketplaceListing.update({
          where: { id: task.listingId },
          data: { completedTasks: { increment: 1 } },
        });
      } catch (statsError) {
        console.error(
          "[Marketplace] Failed to update listing stats:",
          statsError,
        );
      }
    }

    return NextResponse.json({ success: true, tokenFeesClaimed });
  } catch (error) {
    console.error("[Marketplace] Error approving task:", error);
    return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
  }
}
