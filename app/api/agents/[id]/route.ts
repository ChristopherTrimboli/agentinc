import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAuthUserId } from "@/lib/auth/verifyRequest";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/agents/[id] - Get a specific agent (supports both database ID and tokenMint)
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const userId = await verifyAuthUserId(req);

  try {
    // Cache agent lookups: 30s TTL with 60s SWR for public agent pages
    const cacheStrategy = { ttl: 30, swr: 60 };

    // Try both lookups in parallel: by database ID and by tokenMint
    const includeConfig = {
      createdBy: {
        select: { id: true, activeWallet: { select: { address: true } } },
      },
      corporation: {
        select: {
          id: true,
          name: true,
          description: true,
          logo: true,
          color: true,
          tokenMint: true,
          tokenSymbol: true,
        },
      },
    };

    const [agentById, agentByMint] = await Promise.all([
      prisma.agent.findUnique({
        where: { id },
        include: includeConfig,
        cacheStrategy,
      }),
      prisma.agent.findUnique({
        where: { tokenMint: id },
        include: includeConfig,
        cacheStrategy,
      }),
    ]);

    const agent = agentById || agentByMint;

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Check if user can access this agent (owner or public)
    if (!agent.isPublic && agent.createdById !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Failed to fetch agent:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 },
    );
  }
}

// PATCH /api/agents/[id] - Update an agent
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const userId = await verifyAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First check if agent exists and user owns it
    // Supports both database ID and tokenMint for dual-use URLs
    const [existingById, existingByMint] = await Promise.all([
      prisma.agent.findUnique({ where: { id } }),
      prisma.agent.findUnique({ where: { tokenMint: id } }),
    ]);

    const existingAgent = existingById || existingByMint;

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (existingAgent.createdById !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { name, systemPrompt, description, isPublic } = body;

    const updateData: {
      name?: string;
      systemPrompt?: string;
      description?: string | null;
      isPublic?: boolean;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Agent name cannot be empty" },
          { status: 400 },
        );
      }
      updateData.name = name.trim();
    }

    if (systemPrompt !== undefined) {
      if (
        typeof systemPrompt !== "string" ||
        systemPrompt.trim().length === 0
      ) {
        return NextResponse.json(
          { error: "System prompt cannot be empty" },
          { status: 400 },
        );
      }
      updateData.systemPrompt = systemPrompt.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (isPublic !== undefined) {
      updateData.isPublic = Boolean(isPublic);
    }

    const agent = await prisma.agent.update({
      where: { id: existingAgent.id },
      data: updateData,
    });

    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Failed to update agent:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 },
    );
  }
}

// DELETE /api/agents/[id] - Delete an agent
export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const userId = await verifyAuthUserId(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First check if agent exists and user owns it
    // Supports both database ID and tokenMint for dual-use URLs
    const [deleteById, deleteByMint] = await Promise.all([
      prisma.agent.findUnique({ where: { id } }),
      prisma.agent.findUnique({ where: { tokenMint: id } }),
    ]);

    const existingAgent = deleteById || deleteByMint;

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (existingAgent.createdById !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.agent.delete({
      where: { id: existingAgent.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete agent:", error);
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 },
    );
  }
}
