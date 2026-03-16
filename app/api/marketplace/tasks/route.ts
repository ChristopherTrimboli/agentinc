import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByIP } from "@/lib/rateLimit";
import {
  MARKETPLACE_CATEGORIES,
  type CreateTaskInput,
  type MarketplaceCategory,
  type TaskStatus,
} from "@/lib/marketplace/types";
import { createEscrow } from "@/lib/marketplace/escrow";
import type { Prisma } from "@/app/generated/prisma/client";

export async function GET(req: NextRequest) {
  const limited = await rateLimitByIP(req, "marketplace-tasks", 60);
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1);
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20") || 20),
    );
    const status = searchParams.get("status") as TaskStatus | null;
    const category = searchParams.get("category") as MarketplaceCategory | null;
    const minBudget = searchParams.get("minBudget")
      ? parseFloat(searchParams.get("minBudget")!)
      : undefined;
    const maxBudget = searchParams.get("maxBudget")
      ? parseFloat(searchParams.get("maxBudget")!)
      : undefined;
    const isRemote = searchParams.get("isRemote");
    const sort = searchParams.get("sort") || "newest";
    const search = searchParams.get("search");
    const posterId = searchParams.get("posterId");
    const workerId = searchParams.get("workerId");

    const where: Prisma.MarketplaceTaskWhereInput = {};

    if (posterId) {
      where.posterId = posterId;
    }
    if (workerId) {
      where.OR = [
        { workerId },
        { workerAgent: { createdById: workerId } },
      ];
    }
    if (status) {
      where.status = status;
    }
    if (category && MARKETPLACE_CATEGORIES.includes(category)) {
      where.category = category;
    }
    if (isRemote === "true") {
      where.isRemote = true;
    }
    if (minBudget !== undefined || maxBudget !== undefined) {
      where.budgetSol = {};
      if (minBudget !== undefined) where.budgetSol.gte = minBudget;
      if (maxBudget !== undefined) where.budgetSol.lte = maxBudget;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    let orderBy: Prisma.MarketplaceTaskOrderByWithRelationInput;
    switch (sort) {
      case "budget_desc":
        orderBy = { budgetSol: "desc" };
        break;
      case "budget_asc":
        orderBy = { budgetSol: "asc" };
        break;
      case "deadline":
        orderBy = { deadline: "asc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const [tasks, total] = await Promise.all([
      prisma.marketplaceTask.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          poster: {
            select: { id: true, email: true },
          },
          listing: {
            select: { id: true, title: true, type: true },
          },
          _count: {
            select: { bids: true },
          },
        },
        cacheStrategy: { ttl: 10, swr: 30 },
      }),
      prisma.marketplaceTask.count({
        where,
        cacheStrategy: { ttl: 10, swr: 30 },
      }),
    ]);

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[Marketplace] Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  try {
    const body = (await req.json()) as CreateTaskInput;

    if (!body.title || !body.description || !body.category || !body.budgetSol) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: title, description, category, budgetSol",
        },
        { status: 400 },
      );
    }
    if (!MARKETPLACE_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        {
          error: `Invalid category. Must be one of: ${MARKETPLACE_CATEGORIES.join(", ")}`,
        },
        { status: 400 },
      );
    }
    if (body.budgetSol <= 0) {
      return NextResponse.json(
        { error: "Budget must be greater than 0" },
        { status: 400 },
      );
    }

    const task = await prisma.marketplaceTask.create({
      data: {
        title: body.title,
        description: body.description,
        category: body.category,
        requirements: body.requirements || [],
        budgetSol: body.budgetSol,
        budgetToken: body.budgetToken,
        milestones: body.milestones
          ? (body.milestones as unknown as Prisma.InputJsonValue)
          : undefined,
        listingId: body.listingId,
        location: body.location,
        isRemote: body.isRemote ?? true,
        deadline: body.deadline ? new Date(body.deadline) : undefined,
        posterId: auth.userId,
      },
    });

    const escrowResult = await createEscrow(
      auth.userId,
      task.id,
      body.budgetSol,
    );
    if (!escrowResult.success) {
      await prisma.marketplaceTask.delete({ where: { id: task.id } });
      return NextResponse.json(
        { error: escrowResult.error || "Failed to create escrow" },
        { status: 400 },
      );
    }

    const created = await prisma.marketplaceTask.findUnique({
      where: { id: task.id },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("[Marketplace] Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }
}
