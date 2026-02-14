import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";
import { taskControlHook } from "@/workflows/tasks/hooks/taskControl";

// ── GET: Get task details + recent logs ─────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const { taskId } = await params;

  try {
    const task = await prisma.agentTask.findFirst({
      where: { id: taskId, userId: auth.userId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        workflowRunId: true,
        taskPrompt: true,
        intervalMs: true,
        maxIterations: true,
        enabledToolGroups: true,
        enabledSkills: true,
        currentIteration: true,
        lastExecutedAt: true,
        nextExecutionAt: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        agent: { select: { id: true, name: true, imageUrl: true } },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            iteration: true,
            content: true,
            parts: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("[Tasks API] Get error:", error);
    return NextResponse.json({ error: "Failed to get task" }, { status: 500 });
  }
}

// ── DELETE: Stop and delete a task ──────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const rateLimited = await rateLimitByUser(auth.userId, "tasks-delete", 10);
  if (rateLimited) return rateLimited;

  const { taskId } = await params;

  try {
    const task = await prisma.agentTask.findFirst({
      where: { id: taskId, userId: auth.userId },
      select: { id: true, status: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Try to stop the workflow if it's still running
    if (task.status === "running" || task.status === "paused") {
      try {
        await taskControlHook.resume(taskId, { action: "stop" });
      } catch {
        // Workflow may already be stopped
        console.warn(
          `[Tasks API] Could not send stop signal for task ${taskId}`,
        );
      }
    }

    // Update status to stopped
    await prisma.agentTask.update({
      where: { id: taskId },
      data: { status: "stopped", nextExecutionAt: null },
    });

    return NextResponse.json({ success: true, taskId });
  } catch (error) {
    console.error("[Tasks API] Delete error:", error);
    return NextResponse.json({ error: "Failed to stop task" }, { status: 500 });
  }
}
