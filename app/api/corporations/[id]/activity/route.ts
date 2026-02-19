import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimitByIP } from "@/lib/rateLimit";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/corporations/[id]/activity
// Returns recent AgentChatMessages across all agents in the corporation
// Used for the swarm activity feed on the corporation page
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const limited = await rateLimitByIP(req, "corp-activity", 60);
  if (limited) return limited;

  try {
    // Resolve corporation by ID or tokenMint
    const [corpById, corpByMint] = await Promise.all([
      prisma.corporation.findUnique({
        where: { id },
        select: { id: true },
      }),
      prisma.corporation.findUnique({
        where: { tokenMint: id },
        select: { id: true },
      }),
    ]);

    const corporation = corpById || corpByMint;
    if (!corporation) {
      return NextResponse.json(
        { error: "Corporation not found" },
        { status: 404 },
      );
    }

    // Fetch recent messages from all agents in the corporation
    const messages = await prisma.agentChatMessage.findMany({
      where: {
        agent: { corporationId: corporation.id },
        isVip: false,
      },
      select: {
        id: true,
        content: true,
        walletAddress: true,
        createdAt: true,
        agent: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            rarity: true,
            tokenMint: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Return in chronological order
    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error(
      "[corporations/[id]/activity] Failed to fetch activity:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to fetch activity" },
      { status: 500 },
    );
  }
}
