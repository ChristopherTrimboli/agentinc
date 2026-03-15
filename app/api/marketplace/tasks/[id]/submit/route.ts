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
      select: { status: true, workerId: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.workerId !== auth.userId) {
      return NextResponse.json(
        { error: "Only the assigned worker can submit" },
        { status: 403 },
      );
    }
    if (task.status !== "assigned" && task.status !== "in_progress") {
      return NextResponse.json(
        { error: "Task is not in a submittable state" },
        { status: 400 },
      );
    }

    const body = await req.json();
    if (!body.deliverables) {
      return NextResponse.json(
        { error: "deliverables is required" },
        { status: 400 },
      );
    }

    await prisma.marketplaceTask.update({
      where: { id },
      data: { deliverables: body.deliverables, status: "review" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Marketplace] Error submitting deliverables:", error);
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
