/**
 * Shared marketplace/explore data fetching logic
 * Used by both /api/marketplace and /api/explore routes
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

export interface MarketplaceAgent {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  rarity: string | null;
  personality: string | null;
  traits: string[];
  tokenMint: string | null;
  tokenSymbol: string | null;
  launchedAt: Date | null;
  type: "agent";
  creatorWallet: string | null;
  corporationName: string | null;
  corporationLogo: string | null;
}

export interface MarketplaceCorporation {
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

export interface MarketplaceData {
  agents: MarketplaceAgent[];
  corporations: MarketplaceCorporation[];
  tokenMints: string[];
  timestamp: number;
}

/**
 * Fetch marketplace/explore data with optimized queries (no N+1)
 * Uses Prisma Accelerate caching for better performance
 */
export async function fetchMarketplaceData(): Promise<MarketplaceData> {
  // Accelerate cache strategy: 60s TTL with 120s SWR
  // - Data is fresh for 60 seconds
  // - After 60s, serve stale while revalidating in background for up to 120s more
  const cacheStrategy = { ttl: 60, swr: 120 };

  // Fetch all data in parallel with optimized queries
  const [agents, corporationsWithCounts] = await Promise.all([
    // Fetch minted agents with their corporation data
    prisma.agent.findMany({
      where: {
        isMinted: true,
        tokenMint: { not: null },
      },
      orderBy: { launchedAt: "desc" },
      include: {
        corporation: {
          select: {
            name: true,
            logo: true,
          },
        },
      },
      cacheStrategy,
    }),
    // Fetch corporations with agent counts using Prisma's _count
    prisma.corporation.findMany({
      where: {
        tokenMint: { not: null },
      },
      orderBy: { launchedAt: "desc" },
      include: {
        _count: {
          select: { agents: true },
        },
      },
      cacheStrategy,
    }),
  ]);

  // Get unique token mints for price fetching
  const tokenMints = [
    ...agents.filter((a) => a.tokenMint).map((a) => a.tokenMint!),
    ...corporationsWithCounts
      .filter((c) => c.tokenMint)
      .map((c) => c.tokenMint!),
  ];

  return {
    agents: (agents as AgentWithCorporation[]).map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      imageUrl: agent.imageUrl,
      rarity: agent.rarity,
      personality: agent.personality,
      traits: agent.traits,
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
    timestamp: Date.now(),
  };
}
