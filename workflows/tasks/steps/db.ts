import prisma from "@/lib/prisma";

/**
 * Update task iteration progress in the database.
 */
export async function updateTaskProgress(
  taskId: string,
  iteration: number,
): Promise<void> {
  "use step";

  await prisma.agentTask.update({
    where: { id: taskId },
    data: {
      currentIteration: iteration,
      lastExecutedAt: new Date(),
      status: "running",
    },
  });
}

/**
 * Update the next execution time for the task.
 */
export async function updateNextExecution(
  taskId: string,
  nextExecutionAt: Date,
): Promise<void> {
  "use step";

  await prisma.agentTask.update({
    where: { id: taskId },
    data: { nextExecutionAt },
  });
}

/**
 * Mark a task as completed (reached max iterations).
 */
export async function markTaskComplete(taskId: string): Promise<void> {
  "use step";

  await prisma.agentTask.update({
    where: { id: taskId },
    data: {
      status: "completed",
      nextExecutionAt: null,
    },
  });
}

/**
 * Mark a task as stopped by user request.
 */
export async function markTaskStopped(taskId: string): Promise<void> {
  "use step";

  await prisma.agentTask.update({
    where: { id: taskId },
    data: {
      status: "stopped",
      nextExecutionAt: null,
    },
  });
}

/**
 * Mark a task as paused.
 */
export async function markTaskPaused(taskId: string): Promise<void> {
  "use step";

  await prisma.agentTask.update({
    where: { id: taskId },
    data: {
      status: "paused",
      nextExecutionAt: null,
    },
  });
}

/**
 * Mark a task as running (resumed from pause).
 */
export async function markTaskRunning(taskId: string): Promise<void> {
  "use step";

  await prisma.agentTask.update({
    where: { id: taskId },
    data: {
      status: "running",
    },
  });
}

/**
 * Mark a task as failed with an error message.
 */
export async function markTaskFailed(
  taskId: string,
  errorMessage: string,
): Promise<void> {
  "use step";

  await prisma.agentTask.update({
    where: { id: taskId },
    data: {
      status: "failed",
      errorMessage,
      nextExecutionAt: null,
    },
  });
}

/**
 * Save a task log entry for a completed iteration.
 */
export async function saveTaskLog(
  taskId: string,
  iteration: number,
  content: string,
  status: "success" | "error",
  parts?: unknown,
): Promise<void> {
  "use step";

  await prisma.taskLog.create({
    data: {
      taskId,
      iteration,
      content,
      status,
      parts: parts ? (parts as object) : undefined,
    },
  });

  // Prune old logs beyond 200 entries
  const count = await prisma.taskLog.count({ where: { taskId } });
  if (count > 200) {
    const oldLogs = await prisma.taskLog.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      take: count - 200,
      select: { id: true },
    });
    if (oldLogs.length > 0) {
      await prisma.taskLog.deleteMany({
        where: { id: { in: oldLogs.map((l) => l.id) } },
      });
    }
  }
}
