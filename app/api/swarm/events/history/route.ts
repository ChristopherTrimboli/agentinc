import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/swarm/events/history - Get historical events
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const type = searchParams.get("type");
    const sourceAgentId = searchParams.get("sourceAgentId");
    const targetAgentId = searchParams.get("targetAgentId");

    const where = {
      ...(type && { type }),
      ...(sourceAgentId && { sourceAgentId }),
      ...(targetAgentId && { targetAgentId }),
    };

    const [events, total] = await Promise.all([
      prisma.swarmEvent.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: offset,
        include: {
          sourceAgent: true,
          targetAgent: true,
        },
      }),
      prisma.swarmEvent.count({ where }),
    ]);

    return NextResponse.json({
      events,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching swarm events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// DELETE /api/swarm/events/history - Clear event history
export async function DELETE() {
  try {
    await prisma.swarmEvent.deleteMany({});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing swarm events:", error);
    return NextResponse.json(
      { error: "Failed to clear events" },
      { status: 500 }
    );
  }
}
