import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/swarm/agents - List all swarm agents with corporation
export async function GET() {
  try {
    const agents = await prisma.swarmAgent.findMany({
      include: {
        corporation: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("Error fetching swarm agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 },
    );
  }
}

// POST /api/swarm/agents - Create a new swarm agent
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, capabilities, color, size } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const agent = await prisma.swarmAgent.create({
      data: {
        name,
        description,
        capabilities: capabilities || [],
        color,
        size: size || 35,
      },
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error("Error creating swarm agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 },
    );
  }
}

// DELETE /api/swarm/agents - Delete all swarm agents (for reset)
export async function DELETE() {
  try {
    await prisma.swarmEvent.deleteMany({});
    await prisma.swarmAgent.deleteMany({});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting swarm agents:", error);
    return NextResponse.json(
      { error: "Failed to delete agents" },
      { status: 500 },
    );
  }
}
