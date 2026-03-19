import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import { sendEmail, taskUnassignedEmail } from "@/lib/email";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const UNASSIGNABLE_STATUSES = ["assigned", "in_progress", "disputed"];

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "marketplace-unassign", 5);
  if (limited) return limited;

  const { id } = await params;

  try {
    const task = await prisma.marketplaceTask.findUnique({
      where: { id },
      select: {
        status: true,
        posterId: true,
        workerId: true,
        title: true,
        budgetSol: true,
        tokenMint: true,
        tokenSymbol: true,
        tokenFeesClaimed: true,
        featuredImage: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.posterId !== auth.userId) {
      return NextResponse.json(
        { error: "Only the poster can unassign" },
        { status: 403 },
      );
    }
    if (!UNASSIGNABLE_STATUSES.includes(task.status)) {
      return NextResponse.json(
        {
          error: `Cannot unassign a task with status "${task.status}". Only assigned, in-progress, or disputed tasks can be unassigned.`,
        },
        { status: 400 },
      );
    }

    const previousWorkerId = task.workerId;

    await prisma.$transaction(async (tx) => {
      // Atomic status guard
      const { count: transitioned } = await tx.marketplaceTask.updateMany({
        where: { id, status: { in: UNASSIGNABLE_STATUSES } },
        data: {
          status: "open",
          workerId: null,
          workerAgentId: null,
          chatId: null,
          deliverables: null,
          disputeReason: null,
        },
      });

      if (transitioned === 0) {
        throw new Error("CONCURRENT_CHANGE");
      }

      // Mark the previously-accepted bid as rejected so the slot is clean
      await tx.marketplaceBid.updateMany({
        where: { taskId: id, status: "accepted" },
        data: { status: "rejected" },
      });
    });

    // Notify the removed worker via email (fire-and-forget)
    if (previousWorkerId) {
      prisma.user
        .findUnique({
          where: { id: previousWorkerId },
          select: { email: true },
        })
        .then((worker) => {
          if (worker?.email) {
            const { subject, html } = taskUnassignedEmail({
              taskTitle: task.title,
              taskId: id,
              budgetSol: Number(task.budgetSol),
              creatorFees: Number(task.tokenFeesClaimed),
              tokenMint: task.tokenMint,
              tokenSymbol: task.tokenSymbol,
              featuredImage: task.featuredImage,
            });
            sendEmail({ to: worker.email, subject, html });
          }
        })
        .catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "CONCURRENT_CHANGE") {
      return NextResponse.json(
        { error: "Task status changed concurrently. Please refresh." },
        { status: 409 },
      );
    }
    console.error("[Marketplace] Error unassigning task:", error);
    return NextResponse.json(
      { error: "Failed to unassign worker" },
      { status: 500 },
    );
  }
}
