import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";

// GET /api/swarm/agents/[id] - Get a single swarm agent
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
    }

    const agent = await prisma.swarmAgent.findUnique({
      where: { id },
      include: { corporation: true },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Error fetching swarm agent:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 },
    );
  }
}

// PATCH /api/swarm/agents/[id] - Update a swarm agent (requires auth)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "swarm-agent-update", 20);
  if (limited) return limited;

  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, capabilities, color, size } = body;

    // Validate capabilities if provided
    if (
      capabilities &&
      (!Array.isArray(capabilities) ||
        !capabilities.every((c: unknown) => typeof c === "string"))
    ) {
      return NextResponse.json(
        { error: "Capabilities must be an array of strings" },
        { status: 400 },
      );
    }

    // Check if agent exists
    const existing = await prisma.swarmAgent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const agent = await prisma.swarmAgent.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(capabilities && { capabilities }),
        ...(color && { color }),
        ...(typeof size === "number" && { size }),
      },
    });

    return NextResponse.json({ agent });
  } catch (error) {
    console.error("Error updating swarm agent:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 },
    );
  }
}

// DELETE /api/swarm/agents/[id] - Delete a swarm agent (requires auth)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth(request);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "swarm-agent-delete", 10);
  if (limited) return limited;

  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
    }

    // Check if agent exists
    const existing = await prisma.swarmAgent.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Delete related events first, then the agent
    await prisma.$transaction([
      prisma.swarmEvent.deleteMany({
        where: {
          OR: [{ sourceAgentId: id }, { targetAgentId: id }],
        },
      }),
      prisma.swarmAgent.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting swarm agent:", error);
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 },
    );
  }
}
