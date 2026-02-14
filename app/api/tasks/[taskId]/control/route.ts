import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import { taskControlHook } from "@/workflows/tasks/hooks/taskControl";

/**
 * POST: Send a control signal to a running task.
 * Supports actions: stop, pause, resume
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const rateLimited = await rateLimitByUser(auth.userId, "tasks-control", 20);
  if (rateLimited) return rateLimited;

  const { taskId } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action } = body as { action: string };

  if (!["stop", "pause", "resume"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid action. Must be: stop, pause, or resume" },
      { status: 400 },
    );
  }

  try {
    // Verify task exists and belongs to user
    const task = await prisma.agentTask.findFirst({
      where: { id: taskId, userId: auth.userId },
      select: { id: true, name: true, status: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Validate action based on current status
    if (action === "pause" && task.status !== "running") {
      return NextResponse.json(
        {
          error: `Cannot pause task with status "${task.status}". Must be running.`,
        },
        { status: 400 },
      );
    }

    if (action === "resume" && task.status !== "paused") {
      return NextResponse.json(
        {
          error: `Cannot resume task with status "${task.status}". Must be paused.`,
        },
        { status: 400 },
      );
    }

    if (
      action === "stop" &&
      task.status !== "running" &&
      task.status !== "paused"
    ) {
      return NextResponse.json(
        {
          error: `Cannot stop task with status "${task.status}". Must be running or paused.`,
        },
        { status: 400 },
      );
    }

    // Send control signal via hook
    await taskControlHook.resume(taskId, {
      action: action as "stop" | "pause" | "resume",
    });

    return NextResponse.json({
      success: true,
      taskId,
      action,
      message: `Task "${task.name}" ${action} signal sent.`,
    });
  } catch (error) {
    console.error("[Tasks API] Control error:", error);

    // If the hook fails, try to update DB directly for stop
    if (action === "stop") {
      try {
        await prisma.agentTask.update({
          where: { id: taskId },
          data: { status: "stopped", nextExecutionAt: null },
        });
        return NextResponse.json({
          success: true,
          taskId,
          action: "stop",
          message: "Task force-stopped (workflow may have already ended).",
        });
      } catch {
        // fall through
      }
    }

    return NextResponse.json(
      { error: "Failed to send control signal" },
      { status: 500 },
    );
  }
}
