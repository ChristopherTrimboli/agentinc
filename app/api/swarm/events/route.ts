import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";

// In-memory event subscribers for SSE
const subscribers = new Set<(event: string) => void>();

// Broadcast event to all subscribers
export function broadcastSwarmEvent(event: object) {
  const data = JSON.stringify(event);
  subscribers.forEach((send) => send(data));
}

// GET /api/swarm/events - SSE stream for real-time events
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`),
      );

      // Subscribe to events
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // Controller may be closed, remove subscriber
          subscribers.delete(send);
        }
      };

      subscribers.add(send);

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        subscribers.delete(send);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// POST /api/swarm/events - Create a new event and broadcast it (requires auth)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const { type, sourceAgentId, targetAgentId, payload } = body;

    if (!type || typeof type !== "string") {
      return NextResponse.json(
        { error: "type is required and must be a string" },
        { status: 400 },
      );
    }

    if (!sourceAgentId || typeof sourceAgentId !== "string") {
      return NextResponse.json(
        { error: "sourceAgentId is required and must be a string" },
        { status: 400 },
      );
    }

    // Verify source agent exists
    const sourceAgent = await prisma.swarmAgent.findUnique({
      where: { id: sourceAgentId },
    });
    if (!sourceAgent) {
      return NextResponse.json(
        { error: "Source agent not found" },
        { status: 404 },
      );
    }

    // Verify target agent exists if provided
    if (targetAgentId) {
      const targetAgent = await prisma.swarmAgent.findUnique({
        where: { id: targetAgentId },
      });
      if (!targetAgent) {
        return NextResponse.json(
          { error: "Target agent not found" },
          { status: 404 },
        );
      }
    }

    // Persist the event
    const event = await prisma.swarmEvent.create({
      data: {
        type,
        sourceAgentId,
        targetAgentId: targetAgentId || null,
        payload: payload || null,
      },
      include: {
        sourceAgent: true,
        targetAgent: true,
      },
    });

    // Broadcast to SSE subscribers
    broadcastSwarmEvent(event);

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("Error creating swarm event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 },
    );
  }
}
