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
      select: { status: true, posterId: true },
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
    if (!body.reason) {
      return NextResponse.json(
        { error: "Dispute reason is required" },
        { status: 400 },
      );
    }

    await prisma.marketplaceTask.update({
      where: { id },
      data: { status: "disputed" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Marketplace] Error disputing task:", error);
    return NextResponse.json({ error: "Failed to dispute" }, { status: 500 });
  }
}
