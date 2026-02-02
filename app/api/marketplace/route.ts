import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/marketplace - Get all minted agents and corporations with token data
export async function GET() {
  try {
    // Fetch minted agents with token data
    const agents = await prisma.agent.findMany({
      where: {
        isMinted: true,
        tokenMint: { not: null },
      },
      orderBy: { launchedAt: "desc" },
    });

    // Fetch corporations with token data
    const corporations = await prisma.corporation.findMany({
      where: {
        tokenMint: { not: null },
      },
      orderBy: { launchedAt: "desc" },
    });

    // Create a map of corporation IDs to corporation data
    const allCorporations = await prisma.corporation.findMany();
    const corpMap = new Map(allCorporations.map((c) => [c.id, c]));

    // Count agents per corporation using raw count queries
    const countMap = new Map<string, number>();
    for (const corp of allCorporations) {
      const count = await prisma.agent.count({
        where: { corporationId: corp.id },
      });
      countMap.set(corp.id, count);
    }

    // Get unique token mints for price fetching
    const tokenMints = [
      ...agents.filter((a) => a.tokenMint).map((a) => a.tokenMint!),
      ...corporations.filter((c) => c.tokenMint).map((c) => c.tokenMint!),
    ];

    return NextResponse.json({
      agents: agents.map((agent) => {
        const corp = agent.corporationId
          ? corpMap.get(agent.corporationId)
          : null;
        return {
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
          corporationName: corp?.name || null,
          corporationLogo: corp?.logo || null,
        };
      }),
      corporations: corporations.map((corp) => ({
        id: corp.id,
        name: corp.name,
        description: corp.description,
        logo: corp.logo,
        color: corp.color,
        tokenMint: corp.tokenMint,
        tokenSymbol: corp.tokenSymbol,
        launchedAt: corp.launchedAt,
        type: "corporation" as const,
        agentCount: countMap.get(corp.id) || 0,
        creatorWallet: corp.launchWallet,
      })),
      tokenMints,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error fetching marketplace data:", error);
    return NextResponse.json(
      { error: "Failed to fetch marketplace data" },
      { status: 500 },
    );
  }
}
