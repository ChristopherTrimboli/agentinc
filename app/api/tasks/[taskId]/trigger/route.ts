import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimitByIP } from "@/lib/rateLimit";
import { taskEventHook } from "@/workflows/tasks/hooks/taskEvent";

/**
 * POST /api/tasks/[taskId]/trigger
 *
 * Public webhook endpoint that fires the taskEventHook for an event-driven task.
 * The calling service (Discord bot, Twitter webhook, Zapier, etc.) must include
 * the task's webhookSecret as a Bearer token in the Authorization header.
 *
 * Body (all optional except source + eventType):
 * {
 *   source: string;       // e.g. "discord", "twitter", "custom"
 *   eventType: string;    // e.g. "message", "tweet", "mention"
 *   payload?: object;     // raw event data from the source
 *   summary?: string;     // human-readable description for the agent prompt
 *   occurredAt?: string;  // ISO timestamp of the original event
 * }
 *
 * The payload is forwarded to the running workflow via taskEventHook.resume(),
 * which unblocks the next iteration of the agent task immediately.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;

  const rateLimited = await rateLimitByIP(req, "task-trigger", 30);
  if (rateLimited) return rateLimited;

  // ── Auth: validate Bearer secret ────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const providedSecret = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!providedSecret) {
    return NextResponse.json(
      { error: "Authorization header with Bearer token required" },
      { status: 401 },
    );
  }

  // ── Load task and verify secret ──────────────────────────────────────────
  let task;
  try {
    task = await prisma.agentTask.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        status: true,
        triggerMode: true,
        webhookSecret: true,
        workflowRunId: true,
      },
    });
  } catch (error) {
    console.error("[Task Trigger] DB lookup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (!task.webhookSecret || task.webhookSecret !== providedSecret) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 403 });
  }

  if (task.triggerMode === "interval") {
    return NextResponse.json(
      { error: "This task uses interval-based triggering, not event-based" },
      { status: 400 },
    );
  }

  if (task.status !== "running") {
    return NextResponse.json(
      { error: `Task is ${task.status} and cannot be triggered` },
      { status: 409 },
    );
  }

  // ── Parse event payload ──────────────────────────────────────────────────
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // Treat a missing/empty body as a plain ping trigger
  }

  const {
    source = "custom",
    eventType = "trigger",
    payload,
    summary,
    occurredAt,
  } = body as {
    source?: string;
    eventType?: string;
    payload?: Record<string, unknown>;
    summary?: string;
    occurredAt?: string;
  };

  // ── Resume the waiting workflow ──────────────────────────────────────────
  try {
    await taskEventHook.resume(taskId, {
      source: String(source),
      eventType: String(eventType),
      payload,
      summary,
      occurredAt,
    });
  } catch (error) {
    console.error(`[Task Trigger] Failed to resume workflow for ${taskId}:`, error);
    return NextResponse.json(
      { error: "Failed to trigger task — workflow may not be waiting for an event" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    triggered: true,
    taskId,
    source,
    eventType,
    occurredAt: occurredAt ?? new Date().toISOString(),
  });
}
