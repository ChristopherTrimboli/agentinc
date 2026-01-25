import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// In-memory event subscribers for SSE
const subscribers = new Set<(event: string) => void>();

// Broadcast event to all subscribers
export function broadcastSwarmEvent(event: object) {
  const data = JSON.stringify(event);
  subscribers.forEach((send) => send(data));
}

// GET /api/swarm/events - SSE stream for real-time events
export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      // Subscribe to events
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
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

// POST /api/swarm/events - Create a new event and broadcast it
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, sourceAgentId, targetAgentId, payload } = body;

    if (!type || !sourceAgentId) {
      return NextResponse.json(
        { error: "type and sourceAgentId are required" },
        { status: 400 }
      );
    }

    // Persist the event
    const event = await prisma.swarmEvent.create({
      data: {
        type,
        sourceAgentId,
        targetAgentId,
        payload,
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
      { status: 500 }
    );
  }
}
