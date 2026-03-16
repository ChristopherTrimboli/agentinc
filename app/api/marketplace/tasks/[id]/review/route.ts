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

  const limited = await rateLimitByUser(auth.userId, "marketplace-review", 10);
  if (limited) return limited;

  const { id } = await params;

  try {
    const task = await prisma.marketplaceTask.findUnique({
      where: { id },
      select: {
        status: true,
        listingId: true,
        posterId: true,
        workerId: true,
        workerAgent: { select: { createdById: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (task.status !== "completed") {
      return NextResponse.json(
        { error: "Can only review completed tasks" },
        { status: 400 },
      );
    }

    const isParticipant =
      task.posterId === auth.userId ||
      task.workerId === auth.userId ||
      task.workerAgent?.createdById === auth.userId;

    if (!isParticipant) {
      return NextResponse.json(
        { error: "Only the poster or worker can leave a review" },
        { status: 403 },
      );
    }

    const body = await req.json();
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: "Rating must be 1-5" },
        { status: 400 },
      );
    }

    const review = await prisma.marketplaceReview.create({
      data: {
        taskId: id,
        reviewerId: auth.userId,
        rating: Math.round(body.rating),
        comment: body.comment,
      },
    });

    // Update listing aggregate rating
    if (task.listingId) {
      const agg = await prisma.marketplaceReview.aggregate({
        where: { task: { listingId: task.listingId } },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await prisma.marketplaceListing.update({
        where: { id: task.listingId },
        data: {
          averageRating: agg._avg.rating || 0,
          totalRatings: agg._count.rating,
        },
      });
    }

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error("[Marketplace] Error creating review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 },
    );
  }
}
