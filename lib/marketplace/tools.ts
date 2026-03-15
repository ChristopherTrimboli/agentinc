/**
 * Marketplace Tools — Shared tool implementations
 *
 * Single source of truth for marketplace operations, used by both
 * the internal agent skill and the MCP server.
 */

import prisma from "@/lib/prisma";
import { createEscrow, releaseEscrow } from "./escrow";
import {
  MARKETPLACE_CATEGORIES,
  type MarketplaceCategory,
  type ListingType,
} from "./types";

// ── Response Helpers ────────────────────────────────────────────────────

interface ToolSuccess<T> {
  success: true;
  data: T;
}

interface ToolError {
  success: false;
  error: string;
}

type ToolResult<T> = ToolSuccess<T> | ToolError;

function ok<T>(data: T): ToolSuccess<T> {
  return { success: true, data };
}

function fail(error: string): ToolError {
  return { success: false, error };
}

// ── Shape Mappers ───────────────────────────────────────────────────────

interface ListingSummary {
  id: string;
  type: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  priceType: string;
  priceSol: number | null;
  isRemote: boolean;
  location: string | null;
  averageRating: number;
  completedTasks: number;
  ownerName: string | null;
}

interface ListingDetail extends ListingSummary {
  isAvailable: boolean;
  availableHours: string | null;
  totalRatings: number;
  responseTime: number | null;
  featuredImage: string | null;
  portfolio: string[];
  createdAt: Date;
}

interface TaskSummary {
  id: string;
  status: string;
  title: string;
  description: string;
  category: string;
  budgetSol: number;
  escrowStatus: string;
  escrowAmount: number | null;
  posterName: string | null;
  workerName: string | null;
  bidCount: number;
  createdAt: Date;
}

interface TaskDetail extends TaskSummary {
  requirements: string[];
  milestones: unknown;
  deliverables: string | null;
  location: string | null;
  isRemote: boolean;
  deadline: Date | null;
  completedAt: Date | null;
  listingId: string | null;
  bids: BidSummary[];
}

interface BidSummary {
  id: string;
  status: string;
  amountSol: number;
  message: string | null;
  bidderName: string | null;
  createdAt: Date;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapListingSummary(listing: any): ListingSummary {
  const l = rel<{
    agent?: { name: string } | null;
    corporation?: { name: string } | null;
    user?: { email: string | null } | null;
  }>(listing);

  const ownerName =
    l.agent?.name ?? l.corporation?.name ?? l.user?.email ?? null;

  return {
    id: listing.id,
    type: listing.type,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    skills: listing.skills,
    priceType: listing.priceType,
    priceSol: listing.priceSol,
    isRemote: listing.isRemote,
    location: listing.location,
    averageRating: listing.averageRating,
    completedTasks: listing.completedTasks,
    ownerName,
  };
}

function mapBid(bid: Record<string, unknown>): BidSummary {
  const b = rel<{
    bidder?: { email: string | null } | null;
    bidderAgent?: { name: string } | null;
  }>(bid);

  return {
    id: bid.id as string,
    status: bid.status as string,
    amountSol: bid.amountSol as number,
    message: (bid.message as string | null) ?? null,
    bidderName: b.bidderAgent?.name ?? b.bidder?.email ?? null,
    createdAt: bid.createdAt as Date,
  };
}

// Prisma Accelerate's $extends strips relation types from `include` results.
// This helper safely accesses included relations.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rel<T>(obj: any): T {
  return obj as T;
}

// ── Tool Implementations ────────────────────────────────────────────────

export async function searchListings(params: {
  query?: string;
  category?: string;
  type?: string;
  maxPriceSol?: number;
  limit?: number;
}): Promise<ToolResult<{ listings: ListingSummary[]; total: number }>> {
  try {
    const { query, category, type, maxPriceSol, limit = 10 } = params;

    const where: Record<string, unknown> = { isAvailable: true };

    if (
      category &&
      MARKETPLACE_CATEGORIES.includes(category as MarketplaceCategory)
    ) {
      where.category = category;
    }

    if (type) {
      where.type = type as ListingType;
    }

    if (maxPriceSol !== undefined) {
      where.priceSol = { lte: maxPriceSol };
    }

    if (query) {
      where.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { skills: { hasSome: [query.toLowerCase()] } },
      ];
    }

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        take: Math.min(limit, 50),
        orderBy: [{ completedTasks: "desc" }, { averageRating: "desc" }],
        include: {
          user: { select: { email: true } },
          agent: { select: { name: true } },
          corporation: { select: { name: true } },
        },
      }),
      prisma.marketplaceListing.count({ where }),
    ]);

    return ok({
      listings: listings.map(mapListingSummary),
      total,
    });
  } catch (error) {
    console.error("[Marketplace] searchListings error:", error);
    return fail("Failed to search listings");
  }
}

export async function getListingDetail(
  listingId: string,
): Promise<ToolResult<ListingDetail>> {
  try {
    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      include: {
        user: { select: { email: true } },
        agent: { select: { name: true } },
        corporation: { select: { name: true } },
      },
    });

    if (!listing) {
      return fail("Listing not found");
    }

    const l = rel<{
      agent?: { name: string } | null;
      corporation?: { name: string } | null;
      user?: { email: string | null } | null;
    }>(listing);

    const ownerName =
      l.agent?.name ?? l.corporation?.name ?? l.user?.email ?? null;

    return ok({
      id: listing.id,
      type: listing.type,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      skills: listing.skills,
      priceType: listing.priceType,
      priceSol: listing.priceSol,
      isRemote: listing.isRemote,
      location: listing.location,
      averageRating: listing.averageRating,
      completedTasks: listing.completedTasks,
      ownerName,
      isAvailable: listing.isAvailable,
      availableHours: listing.availableHours,
      totalRatings: listing.totalRatings,
      responseTime: listing.responseTime,
      featuredImage: listing.featuredImage,
      portfolio: listing.portfolio,
      createdAt: listing.createdAt,
    });
  } catch (error) {
    console.error("[Marketplace] getListingDetail error:", error);
    return fail("Failed to get listing details");
  }
}

export async function hireListing(params: {
  listingId: string;
  taskTitle: string;
  taskDescription: string;
  budgetSol: number;
  userId: string;
}): Promise<ToolResult<TaskSummary>> {
  try {
    const { listingId, taskTitle, taskDescription, budgetSol, userId } = params;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        isAvailable: true,
        category: true,
        userId: true,
        agentId: true,
        type: true,
      },
    });

    if (!listing) {
      return fail("Listing not found");
    }

    if (!listing.isAvailable) {
      return fail("This listing is currently unavailable");
    }

    const task = await prisma.marketplaceTask.create({
      data: {
        title: taskTitle,
        description: taskDescription,
        category: listing.category,
        requirements: [],
        budgetSol,
        posterId: userId,
        listingId: listing.id,
        workerId: listing.type === "human" ? listing.userId : undefined,
        workerAgentId: listing.type === "agent" ? listing.agentId : undefined,
        status: "assigned",
        isRemote: true,
      },
      include: {
        poster: { select: { email: true } },
        worker: { select: { email: true } },
        workerAgent: { select: { name: true } },
        _count: { select: { bids: true } },
      },
    });

    const escrowResult = await createEscrow(userId, task.id, budgetSol);
    if (!escrowResult.success) {
      await prisma.marketplaceTask.update({
        where: { id: task.id },
        data: { status: "open", escrowStatus: "none" },
      });
      return fail(`Task created but escrow failed: ${escrowResult.error}`);
    }

    const t = rel<{
      poster: { email: string | null };
      worker?: { email: string | null } | null;
      workerAgent?: { name: string } | null;
      _count: { bids: number };
    }>(task);

    return ok({
      id: task.id,
      status: task.status,
      title: task.title,
      description: task.description,
      category: task.category,
      budgetSol: task.budgetSol,
      escrowStatus: "held",
      escrowAmount: budgetSol,
      posterName: t.poster.email,
      workerName: t.workerAgent?.name ?? t.worker?.email ?? null,
      bidCount: t._count.bids,
      createdAt: task.createdAt,
    });
  } catch (error) {
    console.error("[Marketplace] hireListing error:", error);
    return fail("Failed to create hire task");
  }
}

export async function postBounty(params: {
  title: string;
  description: string;
  category: string;
  budgetSol: number;
  requirements?: string[];
  userId: string;
}): Promise<ToolResult<TaskSummary>> {
  try {
    const {
      title,
      description,
      category,
      budgetSol,
      requirements = [],
      userId,
    } = params;

    if (!MARKETPLACE_CATEGORIES.includes(category as MarketplaceCategory)) {
      return fail(
        `Invalid category. Must be one of: ${MARKETPLACE_CATEGORIES.join(", ")}`,
      );
    }

    const task = await prisma.marketplaceTask.create({
      data: {
        title,
        description,
        category,
        requirements,
        budgetSol,
        posterId: userId,
        status: "open",
        isRemote: true,
      },
      include: {
        poster: { select: { email: true } },
        _count: { select: { bids: true } },
      },
    });

    const escrowResult = await createEscrow(userId, task.id, budgetSol);
    if (!escrowResult.success) {
      await prisma.marketplaceTask.update({
        where: { id: task.id },
        data: { status: "open", escrowStatus: "none" },
      });
      return fail(`Bounty posted but escrow failed: ${escrowResult.error}`);
    }

    const t = rel<{
      poster: { email: string | null };
      _count: { bids: number };
    }>(task);

    return ok({
      id: task.id,
      status: task.status,
      title: task.title,
      description: task.description,
      category: task.category,
      budgetSol: task.budgetSol,
      escrowStatus: "held",
      escrowAmount: budgetSol,
      posterName: t.poster.email,
      workerName: null,
      bidCount: t._count.bids,
      createdAt: task.createdAt,
    });
  } catch (error) {
    console.error("[Marketplace] postBounty error:", error);
    return fail("Failed to post bounty");
  }
}

export async function submitBid(params: {
  taskId: string;
  amountSol: number;
  message?: string;
  userId?: string;
  agentId?: string;
}): Promise<ToolResult<BidSummary>> {
  try {
    const { taskId, amountSol, message, userId, agentId } = params;

    if (!userId && !agentId) {
      return fail("Authentication required to submit a bid");
    }

    const task = await prisma.marketplaceTask.findUnique({
      where: { id: taskId },
      select: { id: true, status: true, posterId: true },
    });

    if (!task) {
      return fail("Task not found");
    }

    if (task.status !== "open") {
      return fail(`Cannot bid on a task with status "${task.status}"`);
    }

    if (userId && task.posterId === userId) {
      return fail("Cannot bid on your own task");
    }

    const bid = await prisma.marketplaceBid.create({
      data: {
        taskId,
        amountSol,
        message: message ?? null,
        bidderId: userId ?? null,
        bidderAgentId: agentId ?? null,
        status: "pending",
      },
      include: {
        bidder: { select: { email: true } },
        bidderAgent: { select: { name: true } },
      },
    });

    return ok(mapBid(bid as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("[Marketplace] submitBid error:", error);
    return fail("Failed to submit bid");
  }
}

export async function checkTaskStatus(
  taskId: string,
): Promise<ToolResult<TaskSummary>> {
  try {
    const task = await prisma.marketplaceTask.findUnique({
      where: { id: taskId },
      include: {
        poster: { select: { email: true } },
        worker: { select: { email: true } },
        workerAgent: { select: { name: true } },
        _count: { select: { bids: true } },
      },
    });

    if (!task) {
      return fail("Task not found");
    }

    const t = rel<{
      poster: { email: string | null };
      worker?: { email: string | null } | null;
      workerAgent?: { name: string } | null;
      _count: { bids: number };
    }>(task);

    return ok({
      id: task.id,
      status: task.status,
      title: task.title,
      description: task.description,
      category: task.category,
      budgetSol: task.budgetSol,
      escrowStatus: task.escrowStatus,
      escrowAmount: task.escrowAmount,
      posterName: t.poster.email,
      workerName: t.workerAgent?.name ?? t.worker?.email ?? null,
      bidCount: t._count.bids,
      createdAt: task.createdAt,
    });
  } catch (error) {
    console.error("[Marketplace] checkTaskStatus error:", error);
    return fail("Failed to check task status");
  }
}

export async function approveDelivery(
  taskId: string,
  approverId: string,
): Promise<
  ToolResult<{ taskId: string; status: string; txSignature?: string }>
> {
  try {
    const task = await prisma.marketplaceTask.findUnique({
      where: { id: taskId },
      include: {
        worker: {
          select: {
            activeWallet: { select: { address: true } },
          },
        },
        workerAgent: {
          select: {
            createdBy: {
              select: {
                activeWallet: { select: { address: true } },
              },
            },
          },
        },
      },
    });

    if (!task) {
      return fail("Task not found");
    }

    if (task.posterId !== approverId) {
      return fail("Only the task poster can approve delivery");
    }

    if (task.status !== "review") {
      return fail(
        `Task must be in "review" status to approve (current: "${task.status}")`,
      );
    }

    if (task.escrowStatus !== "held") {
      return fail("No escrow held for this task");
    }

    const t = rel<{
      worker?: { activeWallet?: { address: string } | null } | null;
      workerAgent?: {
        createdBy?: { activeWallet?: { address: string } | null };
      } | null;
    }>(task);

    const workerWallet =
      t.worker?.activeWallet?.address ??
      t.workerAgent?.createdBy?.activeWallet?.address;

    if (!workerWallet) {
      return fail("Worker has no wallet configured for payment");
    }

    const escrowResult = await releaseEscrow(
      taskId,
      workerWallet,
      task.escrowAmount ?? task.budgetSol,
    );

    if (!escrowResult.success) {
      return fail(`Escrow release failed: ${escrowResult.error}`);
    }

    await prisma.marketplaceTask.update({
      where: { id: taskId },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    if (task.listingId) {
      await prisma.marketplaceListing.update({
        where: { id: task.listingId },
        data: { completedTasks: { increment: 1 } },
      });
    }

    return ok({
      taskId,
      status: "completed",
      txSignature: escrowResult.txSignature,
    });
  } catch (error) {
    console.error("[Marketplace] approveDelivery error:", error);
    return fail("Failed to approve delivery");
  }
}

export async function getTaskDetail(
  taskId: string,
): Promise<ToolResult<TaskDetail>> {
  try {
    const task = await prisma.marketplaceTask.findUnique({
      where: { id: taskId },
      include: {
        poster: { select: { email: true } },
        worker: { select: { email: true } },
        workerAgent: { select: { name: true } },
        bids: {
          include: {
            bidder: { select: { email: true } },
            bidderAgent: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!task) {
      return fail("Task not found");
    }

    const t = rel<{
      poster: { email: string | null };
      worker?: { email: string | null } | null;
      workerAgent?: { name: string } | null;
      bids: Record<string, unknown>[];
    }>(task);

    return ok({
      id: task.id,
      status: task.status,
      title: task.title,
      description: task.description,
      category: task.category,
      budgetSol: task.budgetSol,
      escrowStatus: task.escrowStatus,
      escrowAmount: task.escrowAmount,
      posterName: t.poster.email,
      workerName: t.workerAgent?.name ?? t.worker?.email ?? null,
      bidCount: t.bids.length,
      createdAt: task.createdAt,
      requirements: task.requirements,
      milestones: task.milestones,
      deliverables: task.deliverables,
      location: task.location,
      isRemote: task.isRemote,
      deadline: task.deadline,
      completedAt: task.completedAt,
      listingId: task.listingId,
      bids: t.bids.map(mapBid),
    });
  } catch (error) {
    console.error("[Marketplace] getTaskDetail error:", error);
    return fail("Failed to get task details");
  }
}
