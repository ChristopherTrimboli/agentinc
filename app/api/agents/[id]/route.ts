import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";
import prisma from "@/lib/prisma";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

// Helper to verify auth and get user ID
async function verifyAuth(req: NextRequest): Promise<string | null> {
  const idToken = req.headers.get("privy-id-token");
  if (!idToken) return null;

  try {
    const privyUser = await privy.users().get({ id_token: idToken });
    return privyUser.id;
  } catch {
    return null;
  }
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/agents/[id] - Get a specific agent
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const userId = await verifyAuth(req);

  try {
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, email: true },
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
      },
    });

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
  const userId = await verifyAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First check if agent exists and user owns it
    const existingAgent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (existingAgent.createdById !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
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
      where: { id },
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
  const userId = await verifyAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // First check if agent exists and user owns it
    const existingAgent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (existingAgent.createdById !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.agent.delete({
      where: { id },
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
