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

  const limited = await rateLimitByUser(auth.userId, "marketplace-submit", 10);
  if (limited) return limited;

  const { id } = await params;

  try {
    const task = await prisma.marketplaceTask.findUnique({
      where: { id },
      select: {
        status: true,
        workerId: true,
        workerAgent: { select: { createdById: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isWorker =
      task.workerId === auth.userId ||
      task.workerAgent?.createdById === auth.userId;

    if (!isWorker) {
      return NextResponse.json(
        { error: "Only the assigned worker can submit" },
        { status: 403 },
      );
    }
    const submittableStatuses = ["assigned", "in_progress", "disputed"];
    if (!submittableStatuses.includes(task.status)) {
      return NextResponse.json(
        { error: "Task is not in a submittable state" },
        { status: 400 },
      );
    }

    const body = await req.json();
    if (
      !body.deliverables ||
      typeof body.deliverables !== "string" ||
      !body.deliverables.trim()
    ) {
      return NextResponse.json(
        { error: "deliverables is required and must be a non-empty string" },
        { status: 400 },
      );
    }
    if (body.deliverables.length > 50000) {
      return NextResponse.json(
        { error: "deliverables must be under 50,000 characters" },
        { status: 400 },
      );
    }

    await prisma.marketplaceTask.update({
      where: { id },
      data: {
        deliverables: body.deliverables.trim(),
        status: "review",
        disputeReason: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Marketplace] Error submitting deliverables:", error);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
