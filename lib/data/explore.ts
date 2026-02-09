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

export interface ExplorePagination {
  page: number;
  limit: number;
  totalAgents: number;
  totalCorporations: number;
  totalPages: number;
}

export interface ExploreData {
  agents: ExploreAgent[];
  corporations: ExploreCorporation[];
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

  // Fetch counts + paginated data in parallel
  const [agents, agentCount, corporationsWithCounts, corpCount] =
    await Promise.all([
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
    ]);

  // Get unique token mints for price fetching
  const tokenMints = [
    ...agents.filter((a) => a.tokenMint).map((a) => a.tokenMint!),
    ...corporationsWithCounts
      .filter((c) => c.tokenMint)
      .map((c) => c.tokenMint!),
  ];

  const totalItems = agentCount + corpCount;

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
    tokenMints,
    pagination: {
      page,
      limit,
      totalAgents: agentCount,
      totalCorporations: corpCount,
      totalPages: Math.ceil(totalItems / limit),
    },
    timestamp: Date.now(),
  };
}
