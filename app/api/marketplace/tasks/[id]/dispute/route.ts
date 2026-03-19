import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import { sendEmail, disputeFiledEmail } from "@/lib/email";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "marketplace-dispute", 5);
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
        { error: "Only the poster can dispute" },
        { status: 403 },
      );
    }
    if (task.status !== "review") {
      return NextResponse.json(
        { error: "Can only dispute tasks in review" },
        { status: 400 },
      );
    }

    const body = await req.json();
    if (
      !body.reason ||
      typeof body.reason !== "string" ||
      !body.reason.trim()
    ) {
      return NextResponse.json(
        { error: "Dispute reason is required and must be a non-empty string" },
        { status: 400 },
      );
    }
    if (body.reason.length > 5000) {
      return NextResponse.json(
        { error: "Dispute reason must be under 5,000 characters" },
        { status: 400 },
      );
    }

    await prisma.marketplaceTask.update({
      where: { id },
      data: { status: "disputed", disputeReason: body.reason.trim() },
    });

    // Notify worker via email (fire-and-forget)
    if (task.workerId) {
      prisma.user
        .findUnique({
          where: { id: task.workerId },
          select: { email: true },
        })
        .then((worker) => {
          if (worker?.email) {
            const { subject, html } = disputeFiledEmail({
              taskTitle: task.title,
              taskId: id,
              budgetSol: Number(task.budgetSol),
              creatorFees: Number(task.tokenFeesClaimed),
              tokenMint: task.tokenMint,
              tokenSymbol: task.tokenSymbol,
              featuredImage: task.featuredImage,
              disputeReason: body.reason.trim(),
            });
            sendEmail({ to: worker.email, subject, html });
          }
        })
        .catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Marketplace] Error disputing task:", error);
    return NextResponse.json({ error: "Failed to dispute" }, { status: 500 });
  }
}
