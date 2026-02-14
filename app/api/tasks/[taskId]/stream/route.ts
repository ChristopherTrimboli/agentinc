import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";

/**
 * GET: Stream task logs as Server-Sent Events (SSE).
 *
 * Streams existing logs and then polls for new ones.
 * This provides real-time updates for the task tab UI.
 *
 * Query params:
 * - afterIteration: Only return logs after this iteration number
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const { taskId } = await params;
  const { searchParams } = new URL(req.url);
  const afterIteration = parseInt(searchParams.get("afterIteration") || "0");

  // Verify task exists and belongs to user
  const task = await prisma.agentTask.findFirst({
    where: { id: taskId, userId: auth.userId },
    select: { id: true, status: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let lastIteration = afterIteration;
      let retries = 0;
      const maxRetries = 360; // ~30 minutes at 5s intervals

      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      // Send initial task status
      const currentTask = await prisma.agentTask.findUnique({
        where: { id: taskId },
        select: {
          status: true,
          currentIteration: true,
          lastExecutedAt: true,
          nextExecutionAt: true,
          errorMessage: true,
        },
      });

      if (currentTask) {
        sendEvent("status", currentTask);
      }

      // Send existing logs
      const existingLogs = await prisma.taskLog.findMany({
        where: {
          taskId,
          iteration: { gt: afterIteration },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          iteration: true,
          content: true,
          parts: true,
          status: true,
          createdAt: true,
        },
      });

      for (const log of existingLogs) {
        sendEvent("log", log);
        lastIteration = Math.max(lastIteration, log.iteration);
      }

      // Poll for new logs
      const poll = async () => {
        try {
          // Check task status
          const taskStatus = await prisma.agentTask.findUnique({
            where: { id: taskId },
            select: {
              status: true,
              currentIteration: true,
              lastExecutedAt: true,
              nextExecutionAt: true,
              errorMessage: true,
            },
          });

          if (!taskStatus) {
            sendEvent("error", { message: "Task not found" });
            controller.close();
            return;
          }

          sendEvent("status", taskStatus);

          // Fetch new logs
          const newLogs = await prisma.taskLog.findMany({
            where: {
              taskId,
              iteration: { gt: lastIteration },
            },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              iteration: true,
              content: true,
              parts: true,
              status: true,
              createdAt: true,
            },
          });

          for (const log of newLogs) {
            sendEvent("log", log);
            lastIteration = Math.max(lastIteration, log.iteration);
          }

          // Stop polling if task is done
          if (["completed", "stopped", "failed"].includes(taskStatus.status)) {
            sendEvent("done", { status: taskStatus.status });
            controller.close();
            return;
          }

          retries++;
          if (retries >= maxRetries) {
            sendEvent("done", { status: "timeout" });
            controller.close();
            return;
          }

          // Poll again after 5 seconds
          await new Promise((resolve) => setTimeout(resolve, 5000));
          await poll();
        } catch (error) {
          console.error("[Tasks Stream] Poll error:", error);
          sendEvent("error", { message: "Stream error" });
          controller.close();
        }
      };

      await poll();
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
