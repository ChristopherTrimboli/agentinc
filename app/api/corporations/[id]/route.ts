import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/corporations/[id] - Get a corporation with its agents
// Supports lookup by database ID or tokenMint
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const cacheStrategy = { ttl: 30, swr: 60 };

    const includeConfig = {
      agents: {
        where: { isMinted: true },
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          rarity: true,
          personality: true,
          tokenMint: true,
          tokenSymbol: true,
          launchedAt: true,
          enabledSkills: true,
          isPublic: true,
          createdAt: true,
          createdBy: {
            select: { id: true, activeWallet: { select: { address: true } } },
          },
        },
        orderBy: { createdAt: "asc" as const },
      },
    };

    // Try both lookups in parallel: by database ID and by tokenMint
    const [corpById, corpByMint] = await Promise.all([
      prisma.corporation.findUnique({
        where: { id },
        include: includeConfig,
        cacheStrategy,
      }),
      prisma.corporation.findUnique({
        where: { tokenMint: id },
        include: includeConfig,
        cacheStrategy,
      }),
    ]);

    const corporation = corpById || corpByMint;

    if (!corporation) {
      return NextResponse.json(
        { error: "Corporation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ corporation });
  } catch (error) {
    console.error("[corporations/[id]] Failed to fetch corporation:", error);
    return NextResponse.json(
      { error: "Failed to fetch corporation" },
      { status: 500 },
    );
  }
}
