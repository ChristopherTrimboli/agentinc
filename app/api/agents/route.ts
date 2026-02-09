import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// GET /api/agents - List user's agents (paginated)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE)),
      ),
    );
    const offset = (page - 1) * limit;

    // Short cache for user's agents: 10s TTL with 30s SWR
    // Balances freshness with performance for authenticated user data
    const cacheStrategy = { ttl: 10, swr: 30 };

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where: { createdById: auth.userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          description: true,
          isPublic: true,
          imageUrl: true,
          rarity: true,
          personality: true,
          personalityScores: true,
          isMinted: true,
          tokenSymbol: true,
          createdAt: true,
          updatedAt: true,
        },
        cacheStrategy,
      }),
      prisma.agent.count({
        where: { createdById: auth.userId },
        cacheStrategy,
      }),
    ]);

    return NextResponse.json({
      agents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 },
    );
  }
}

// POST /api/agents - Create a new agent
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  try {
    const body = await req.json();
    const { name, systemPrompt, description, isPublic } = body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Agent name is required" },
        { status: 400 },
      );
    }

    if (
      !systemPrompt ||
      typeof systemPrompt !== "string" ||
      systemPrompt.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "System prompt is required" },
        { status: 400 },
      );
    }

    const agent = await prisma.agent.create({
      data: {
        name: name.trim(),
        systemPrompt: systemPrompt.trim(),
        description: description?.trim() || null,
        isPublic: Boolean(isPublic),
        createdById: auth.userId,
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error("Failed to create agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 },
    );
  }
}
