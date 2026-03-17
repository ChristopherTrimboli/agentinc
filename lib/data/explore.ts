/**
 * Explore data fetching logic
 * Used by /api/explore and /dashboard routes
 */
import prisma from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

// Type for agent with corporation included
type AgentWithCorporation = Prisma.AgentGetPayload<{
  include: {
    corporation: {
      select: {
        name: true;
        logo: true;
      };
    };
  };
}>;

// Type for corporation with agent count
type CorporationWithCount = Prisma.CorporationGetPayload<{
  include: {
    _count: {
      select: { agents: true };
    };
  };
}>;

export interface ExploreAgent {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  rarity: string | null;
  personality: string | null;
  tokenMint: string | null;
  tokenSymbol: string | null;
  launchedAt: Date | null;
  type: "agent";
  creatorWallet: string | null;
  corporationName: string | null;
  corporationLogo: string | null;
}

export interface ExploreCorporation {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  color: string | null;
  tokenMint: string | null;
  tokenSymbol: string | null;
  launchedAt: Date | null;
  type: "corporation";
  agentCount: number;
  creatorWallet: string | null;
}

export interface ExploreTask {
  id: string;
  name: string;
  description: string;
  category: string;
  featuredImage: string | null;
  tokenMint: string | null;
  tokenSymbol: string | null;
  status: string;
  type: "task";
  creatorWallet: string | null;
}

export interface ExplorePagination {
  page: number;
  limit: number;
  totalAgents: number;
  totalCorporations: number;
  totalTasks: number;
  totalPages: number;
}

export interface ExploreData {
  agents: ExploreAgent[];
  corporations: ExploreCorporation[];
  tasks: ExploreTask[];
  tokenMints: string[];
  pagination: ExplorePagination;
  timestamp: number;
}

/**
 * Fetch explore data with optimized, paginated queries (no N+1).
 * Uses Prisma Accelerate caching for better performance.
 */
export async function fetchExploreData(
  opts: { page?: number; limit?: number } = {},
): Promise<ExploreData> {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 50;
  const offset = (page - 1) * limit;

  // Accelerate cache strategy: 60s TTL with 120s SWR
  const cacheStrategy = { ttl: 60, swr: 120 };

  const agentWhere = { isMinted: true, tokenMint: { not: null } } as const;
  const corpWhere = { tokenMint: { not: null } } as const;
  const taskWhere = { tokenMint: { not: null } } as const;

  // Fetch counts + paginated data in parallel
  const [
    agents,
    agentCount,
    corporationsWithCounts,
    corpCount,
    tasks,
    taskCount,
  ] = await Promise.all([
    prisma.agent.findMany({
      where: agentWhere,
      orderBy: { launchedAt: "desc" },
      include: {
        corporation: { select: { name: true, logo: true } },
      },
      take: limit,
      skip: offset,
      cacheStrategy,
    }),
    prisma.agent.count({ where: agentWhere, cacheStrategy }),
    prisma.corporation.findMany({
      where: corpWhere,
      orderBy: { launchedAt: "desc" },
      include: { _count: { select: { agents: true } } },
      take: limit,
      skip: offset,
      cacheStrategy,
    }),
    prisma.corporation.count({ where: corpWhere, cacheStrategy }),
    prisma.marketplaceTask.findMany({
      where: taskWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        featuredImage: true,
        tokenMint: true,
        tokenSymbol: true,
        tokenLaunchWallet: true,
        status: true,
      },
      take: limit,
      skip: offset,
      cacheStrategy,
    }),
    prisma.marketplaceTask.count({ where: taskWhere, cacheStrategy }),
  ]);

  // Get unique token mints for price fetching
  const tokenMints = [
    ...agents.filter((a) => a.tokenMint).map((a) => a.tokenMint!),
    ...corporationsWithCounts
      .filter((c) => c.tokenMint)
      .map((c) => c.tokenMint!),
    ...tasks.filter((t) => t.tokenMint).map((t) => t.tokenMint!),
  ];

  const totalItems = agentCount + corpCount + taskCount;

  return {
    agents: (agents as AgentWithCorporation[]).map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      imageUrl: agent.imageUrl,
      rarity: agent.rarity,
      personality: agent.personality,
      tokenMint: agent.tokenMint,
      tokenSymbol: agent.tokenSymbol,
      launchedAt: agent.launchedAt,
      type: "agent" as const,
      creatorWallet: agent.launchWallet,
      corporationName: agent.corporation?.name || null,
      corporationLogo: agent.corporation?.logo || null,
    })),
    corporations: (corporationsWithCounts as CorporationWithCount[]).map(
      (corp) => ({
        id: corp.id,
        name: corp.name,
        description: corp.description,
        logo: corp.logo,
        color: corp.color,
        tokenMint: corp.tokenMint,
        tokenSymbol: corp.tokenSymbol,
        launchedAt: corp.launchedAt,
        type: "corporation" as const,
        agentCount: corp._count.agents,
        creatorWallet: corp.launchWallet,
      }),
    ),
    tasks: tasks.map((task) => ({
      id: task.id,
      name: task.title,
      description: task.description,
      category: task.category,
      featuredImage: task.featuredImage,
      tokenMint: task.tokenMint,
      tokenSymbol: task.tokenSymbol,
      status: task.status,
      type: "task" as const,
      creatorWallet: task.tokenLaunchWallet,
    })),
    tokenMints,
    pagination: {
      page,
      limit,
      totalAgents: agentCount,
      totalCorporations: corpCount,
      totalTasks: taskCount,
      totalPages: Math.ceil(totalItems / limit),
    },
    timestamp: Date.now(),
  };
}
