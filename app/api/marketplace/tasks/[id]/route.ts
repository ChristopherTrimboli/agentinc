import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByIP } from "@/lib/rateLimit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const limited = await rateLimitByIP(req, "marketplace-task-detail", 60);
  if (limited) return limited;

  const { id } = await params;

  try {
    const task = await prisma.marketplaceTask.findUnique({
      where: { id },
      include: {
        poster: { select: { id: true, email: true } },
        worker: { select: { id: true, email: true } },
        posterAgent: { select: { id: true, name: true, imageUrl: true } },
        workerAgent: { select: { id: true, name: true, imageUrl: true } },
        listing: { select: { id: true, title: true, type: true } },
        bids: {
          include: {
            bidder: { select: { id: true, email: true } },
            bidderAgent: { select: { id: true, name: true, imageUrl: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        reviews: {
          include: { reviewer: { select: { id: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      cacheStrategy: { ttl: 5, swr: 15 },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("[Marketplace] Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const { id } = await params;

  try {
    const task = await prisma.marketplaceTask.findUnique({
      where: { id },
      select: { posterId: true, status: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.posterId !== auth.userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    if (task.status !== "open") {
      return NextResponse.json(
        { error: "Can only edit open tasks" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const data: Record<string, unknown> = {};
    for (const field of ["title", "description", "requirements", "deadline"]) {
      if (body[field] !== undefined) data[field] = body[field];
    }

    const updated = await prisma.marketplaceTask.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[Marketplace] Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}
