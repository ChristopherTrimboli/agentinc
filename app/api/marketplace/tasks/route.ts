import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByIP, rateLimitByUser } from "@/lib/rateLimit";
import {
  MARKETPLACE_CATEGORIES,
  TASK_STATUSES,
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
    const statusRaw = searchParams.get("status");
    const status: TaskStatus | null =
      statusRaw && TASK_STATUSES.includes(statusRaw as TaskStatus)
        ? (statusRaw as TaskStatus)
        : null;
    const category = searchParams.get("category") as MarketplaceCategory | null;
    const minBudgetRaw = searchParams.get("minBudget")
      ? parseFloat(searchParams.get("minBudget")!)
      : undefined;
    const maxBudgetRaw = searchParams.get("maxBudget")
      ? parseFloat(searchParams.get("maxBudget")!)
      : undefined;
    const minBudget =
      minBudgetRaw !== undefined && !isNaN(minBudgetRaw)
        ? minBudgetRaw
        : undefined;
    const maxBudget =
      maxBudgetRaw !== undefined && !isNaN(maxBudgetRaw)
        ? maxBudgetRaw
        : undefined;
    const isRemote = searchParams.get("isRemote");
    const sort = searchParams.get("sort") || "newest";
    const search = searchParams.get("search");
    const posterId = searchParams.get("posterId");
    const workerId = searchParams.get("workerId");

    const where: Prisma.MarketplaceTaskWhereInput = {};
    const andConditions: Prisma.MarketplaceTaskWhereInput[] = [];

    if (posterId) {
      where.posterId = posterId;
    }
    if (workerId) {
      andConditions.push({
        OR: [{ workerId }, { workerAgent: { createdById: workerId } }],
      });
    }
    if (status) {
      where.status = status;
    } else {
      where.status = { not: "pending_escrow" };
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
      andConditions.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
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
            select: {
              id: true,
              activeWallet: { select: { address: true } },
            },
          },
          listing: {
            select: { id: true, title: true, type: true },
          },
          _count: {
            select: { bids: true },
          },
        },
        cacheStrategy: posterId || workerId ? undefined : { ttl: 10, swr: 30 },
      }),
      prisma.marketplaceTask.count({
        where,
        cacheStrategy: posterId || workerId ? undefined : { ttl: 10, swr: 30 },
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

  const limited = await rateLimitByUser(
    auth.userId,
    "marketplace-task-create",
    10,
  );
  if (limited) return limited;

  try {
    const body = (await req.json()) as CreateTaskInput;

    const hasToken = !!body.tokenMint;
    if (
      !body.title ||
      !body.description ||
      !body.category ||
      (!hasToken && !body.budgetSol)
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: title, description, category, and either budgetSol or tokenMint",
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
    const budgetSol = body.budgetSol ?? 0;
    if (typeof budgetSol !== "number" || isNaN(budgetSol) || budgetSol < 0) {
      return NextResponse.json(
        { error: "budgetSol must be a non-negative number" },
        { status: 400 },
      );
    }
    if (!hasToken && budgetSol <= 0) {
      return NextResponse.json(
        { error: "Budget must be greater than 0 when no task token" },
        { status: 400 },
      );
    }
    if (body.title.length > 200) {
      return NextResponse.json(
        { error: "Title must be 200 characters or less" },
        { status: 400 },
      );
    }
    if (body.description.length > 10000) {
      return NextResponse.json(
        { error: "Description must be 10000 characters or less" },
        { status: 400 },
      );
    }

    // Validate deadline
    let parsedDeadline: Date | undefined;
    if (body.deadline) {
      parsedDeadline = new Date(body.deadline);
      if (isNaN(parsedDeadline.getTime())) {
        return NextResponse.json(
          { error: "Invalid deadline date format" },
          { status: 400 },
        );
      }
    }

    // Validate listingId exists if provided
    if (body.listingId) {
      const listing = await prisma.marketplaceListing.findUnique({
        where: { id: body.listingId },
        select: { id: true, isAvailable: true },
      });
      if (!listing) {
        return NextResponse.json(
          { error: "Listing not found" },
          { status: 404 },
        );
      }
      if (!listing.isAvailable) {
        return NextResponse.json(
          { error: "Listing is not currently available" },
          { status: 400 },
        );
      }
    }

    // Validate requirements is an array of strings
    if (
      body.requirements &&
      (!Array.isArray(body.requirements) ||
        !body.requirements.every((r: unknown) => typeof r === "string"))
    ) {
      return NextResponse.json(
        { error: "requirements must be an array of strings" },
        { status: 400 },
      );
    }

    // Validate milestones structure
    if (body.milestones) {
      if (
        !Array.isArray(body.milestones) ||
        !body.milestones.every((m: unknown) => {
          if (typeof m !== "object" || m === null) return false;
          const ms = m as Record<string, unknown>;
          return (
            typeof ms.title === "string" &&
            typeof ms.amountSol === "number" &&
            typeof ms.status === "string"
          );
        })
      ) {
        return NextResponse.json(
          {
            error: "milestones must be an array of {title, amountSol, status}",
          },
          { status: 400 },
        );
      }
    }

    const needsEscrow = budgetSol > 0;

    const task = await prisma.marketplaceTask.create({
      data: {
        title: body.title,
        description: body.description,
        category: body.category,
        requirements: body.requirements || [],
        budgetSol: budgetSol,
        budgetToken: body.budgetToken,
        milestones: body.milestones
          ? (body.milestones as unknown as Prisma.InputJsonValue)
          : undefined,
        listingId: body.listingId,
        location: body.location,
        isRemote: body.isRemote ?? true,
        deadline: parsedDeadline,
        posterId: auth.userId,
        featuredImage: body.featuredImage,
        tokenMint: body.tokenMint,
        tokenSymbol: body.tokenSymbol,
        tokenMetadata: body.tokenMetadata,
        tokenLaunchWallet: body.tokenLaunchWallet,
        tokenLaunchSignature: body.tokenLaunchSignature,
        tokenConfigKey: body.tokenConfigKey,
        status: needsEscrow ? "pending_escrow" : "open",
      },
    });

    if (needsEscrow) {
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

      await prisma.marketplaceTask.update({
        where: { id: task.id },
        data: { status: "open" },
      });
    }

    const created = await prisma.marketplaceTask.findUnique({
      where: { id: task.id },
      include: { _count: { select: { bids: true } } },
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
