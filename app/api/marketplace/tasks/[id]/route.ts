import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByIP, rateLimitByUser } from "@/lib/rateLimit";

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
        poster: {
          select: {
            id: true,
            activeWallet: { select: { address: true } },
          },
        },
        worker: {
          select: {
            id: true,
            activeWallet: { select: { address: true } },
          },
        },
        posterAgent: { select: { id: true, name: true, imageUrl: true } },
        workerAgent: {
          select: { id: true, name: true, imageUrl: true, createdById: true },
        },
        listing: { select: { id: true, title: true, type: true } },
        bids: {
          include: {
            bidder: {
              select: {
                id: true,
                activeWallet: { select: { address: true } },
              },
            },
            bidderAgent: { select: { id: true, name: true, imageUrl: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                id: true,
                activeWallet: { select: { address: true } },
              },
            },
          },
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

  const limited = await rateLimitByUser(
    auth.userId,
    "marketplace-task-edit",
    10,
  );
  if (limited) return limited;

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

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || body.title.trim().length > 200) {
        return NextResponse.json(
          { error: "Title must be a string under 200 characters" },
          { status: 400 },
        );
      }
      data.title = body.title.trim();
    }
    if (body.description !== undefined) {
      if (
        typeof body.description !== "string" ||
        body.description.trim().length > 10000
      ) {
        return NextResponse.json(
          { error: "Description must be a string under 10,000 characters" },
          { status: 400 },
        );
      }
      data.description = body.description.trim();
    }
    if (body.requirements !== undefined) {
      if (
        !Array.isArray(body.requirements) ||
        body.requirements.some(
          (r: unknown) => typeof r !== "string" || (r as string).length > 500,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Requirements must be an array of strings (max 500 chars each)",
          },
          { status: 400 },
        );
      }
      data.requirements = body.requirements;
    }
    if (body.deadline !== undefined) {
      if (body.deadline !== null) {
        const d = new Date(body.deadline);
        if (isNaN(d.getTime())) {
          return NextResponse.json(
            { error: "Invalid deadline date" },
            { status: 400 },
          );
        }
        data.deadline = d;
      } else {
        data.deadline = null;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
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
