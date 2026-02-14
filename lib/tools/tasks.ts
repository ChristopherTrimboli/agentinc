/**
 * Task Management Tools
 *
 * AI-callable tools for creating, managing, and monitoring recurring
 * background tasks powered by Vercel Workflow. These tools allow the
 * AI agent to launch long-running processes on behalf of the user.
 *
 * These tools are NOT billed themselves (lightweight DB operations).
 * The actual cost comes from each task iteration's AI inference and tool usage.
 */

import { z } from "zod";
import { tool } from "ai";
import prisma from "@/lib/prisma";
import { start } from "workflow/api";
import { recurringTaskWorkflow } from "@/workflows/tasks/workflow";
import { taskControlHook } from "@/workflows/tasks/hooks/taskControl";
import type { TaskConfig } from "@/workflows/tasks/steps/execute";
import type { ToolMap } from "./types";
import type { Prisma } from "@/app/generated/prisma/client";

// ── Constants ────────────────────────────────────────────────────────────────

/** Minimum interval between task iterations (1 minute) */
const MIN_INTERVAL_MINUTES = 1;

/** Maximum interval between task iterations (24 hours) */
const MAX_INTERVAL_MINUTES = 1440;

/** Maximum number of concurrent tasks per user */
const MAX_CONCURRENT_TASKS = 10;

// ── Tool Factory ─────────────────────────────────────────────────────────────

/**
 * Create task management tools scoped to a specific user and agent.
 * These tools need userId and agentId context to function.
 */
const createRecurringTaskSchema = z.object({
  name: z
    .string()
    .max(200)
    .describe(
      "Short descriptive name for the task (e.g., 'X Timeline Scanner')",
    ),
  taskPrompt: z
    .string()
    .describe(
      "The instruction to execute on each iteration. Be specific about what to do. " +
        "This prompt will be sent to the AI agent each time the task runs.",
    ),
  intervalMinutes: z
    .number()
    .min(MIN_INTERVAL_MINUTES)
    .max(MAX_INTERVAL_MINUTES)
    .describe(
      `How often to run the task, in minutes (min ${MIN_INTERVAL_MINUTES}, max ${MAX_INTERVAL_MINUTES})`,
    ),
  toolGroups: z
    .array(z.string())
    .default([])
    .describe(
      "Which tool groups to enable for this task (e.g., ['twitter', 'crypto', 'weather'])",
    ),
  maxIterations: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Optional: maximum number of times to run before stopping automatically",
    ),
});

const listActiveTasksSchema = z.object({});

const getTaskStatusSchema = z.object({
  taskId: z.string().describe("The ID of the task to check"),
});

const stopTaskSchema = z.object({
  taskId: z.string().describe("The ID of the task to stop"),
});

const pauseTaskSchema = z.object({
  taskId: z.string().describe("The ID of the task to pause"),
});

const resumeTaskSchema = z.object({
  taskId: z.string().describe("The ID of the task to resume"),
});

export function createTaskTools(
  userId: string,
  agentId: string,
  agentSystemPrompt: string,
  chatId?: string,
): ToolMap {
  return {
    createRecurringTask: tool({
      description:
        "Create a new recurring background task that runs automatically at a set interval. " +
        "Use this when the user wants something done repeatedly (e.g., 'check my X timeline every 5 minutes', " +
        "'monitor SOL price every hour', 'post a daily tweet'). " +
        "The task will run in the background even when the user closes the chat.",
      inputSchema: createRecurringTaskSchema,
      execute: async (input: z.infer<typeof createRecurringTaskSchema>) => {
        const { name, taskPrompt, intervalMinutes, toolGroups, maxIterations } =
          input;
        try {
          // Check concurrent task limit
          const activeCount = await prisma.agentTask.count({
            where: {
              userId,
              status: { in: ["running", "paused"] },
            },
          });

          if (activeCount >= MAX_CONCURRENT_TASKS) {
            return {
              error: `You have reached the maximum of ${MAX_CONCURRENT_TASKS} concurrent tasks. Stop an existing task first.`,
            };
          }

          const intervalMs = intervalMinutes * 60 * 1000;

          // Create the task record
          const task = await prisma.agentTask.create({
            data: {
              name,
              description: taskPrompt,
              status: "running",
              taskPrompt,
              intervalMs,
              maxIterations,
              enabledToolGroups: toolGroups,
              enabledSkills: [],
              userId,
              agentId,
              chatId: chatId || null,
            },
          });

          // Build workflow config
          const taskConfig: TaskConfig = {
            taskId: task.id,
            agentId,
            userId,
            taskPrompt,
            systemPrompt: agentSystemPrompt,
            model: "anthropic/claude-haiku-4.5",
            intervalMs,
            maxIterations: maxIterations ?? undefined,
            enabledToolGroups: toolGroups,
            enabledSkills: [],
          };

          // Start the durable workflow
          const run = await start(recurringTaskWorkflow, [taskConfig]);

          // Save workflow run ID
          await prisma.agentTask.update({
            where: { id: task.id },
            data: { workflowRunId: run.runId },
          });

          return {
            taskId: task.id,
            name,
            status: "running",
            intervalMinutes,
            maxIterations: maxIterations ?? "unlimited",
            toolGroups,
            message: `Task "${name}" has been created and is now running. It will execute every ${intervalMinutes} minute${intervalMinutes === 1 ? "" : "s"}.`,
          };
        } catch (error) {
          console.error("[Task Tool] createRecurringTask error:", error);
          return {
            error: `Failed to create task: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    listActiveTasks: tool({
      description:
        "List all active (running or paused) background tasks for the current user. " +
        "Shows task names, status, iteration count, and next execution time.",
      inputSchema: listActiveTasksSchema,
      execute: async () => {
        try {
          const tasks = await prisma.agentTask.findMany({
            where: {
              userId,
              status: { in: ["running", "paused"] },
            },
            include: {
              agent: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
          });

          type TaskWithAgent = Prisma.AgentTaskGetPayload<{
            include: { agent: { select: { name: true } } };
          }>;

          if (tasks.length === 0) {
            return { tasks: [], message: "No active tasks found." };
          }

          return {
            tasks: (tasks as TaskWithAgent[]).map((t) => ({
              taskId: t.id,
              name: t.name,
              status: t.status,
              agent: t.agent.name,
              currentIteration: t.currentIteration,
              intervalMinutes: t.intervalMs / 60000,
              maxIterations: t.maxIterations ?? "unlimited",
              lastExecutedAt: t.lastExecutedAt?.toISOString() ?? "never",
              nextExecutionAt: t.nextExecutionAt?.toISOString() ?? "N/A",
              createdAt: t.createdAt.toISOString(),
            })),
            message: `Found ${tasks.length} active task${tasks.length === 1 ? "" : "s"}.`,
          };
        } catch (error) {
          console.error("[Task Tool] listActiveTasks error:", error);
          return {
            error: `Failed to list tasks: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    getTaskStatus: tool({
      description:
        "Get detailed status and recent execution logs for a specific task.",
      inputSchema: getTaskStatusSchema,
      execute: async (input: z.infer<typeof getTaskStatusSchema>) => {
        const { taskId } = input;
        try {
          const task = await prisma.agentTask.findFirst({
            where: { id: taskId, userId },
            include: {
              agent: { select: { name: true } },
              logs: {
                orderBy: { createdAt: "desc" },
                take: 5,
              },
            },
          });

          type TaskWithRelations = Prisma.AgentTaskGetPayload<{
            include: {
              agent: { select: { name: true } };
              logs: true;
            };
          }>;

          if (!task) {
            return { error: "Task not found or you don't have access to it." };
          }

          const taskWithRelations = task as TaskWithRelations;

          return {
            taskId: taskWithRelations.id,
            name: taskWithRelations.name,
            status: taskWithRelations.status,
            agent: taskWithRelations.agent.name,
            prompt: taskWithRelations.taskPrompt,
            currentIteration: taskWithRelations.currentIteration,
            intervalMinutes: taskWithRelations.intervalMs / 60000,
            maxIterations: taskWithRelations.maxIterations ?? "unlimited",
            lastExecutedAt:
              taskWithRelations.lastExecutedAt?.toISOString() ?? "never",
            nextExecutionAt:
              taskWithRelations.nextExecutionAt?.toISOString() ?? "N/A",
            errorMessage: taskWithRelations.errorMessage,
            createdAt: taskWithRelations.createdAt.toISOString(),
            recentLogs: taskWithRelations.logs.map((l) => ({
              iteration: l.iteration,
              content:
                l.content.length > 500
                  ? l.content.slice(0, 500) + "..."
                  : l.content,
              status: l.status,
              timestamp: l.createdAt.toISOString(),
            })),
          };
        } catch (error) {
          console.error("[Task Tool] getTaskStatus error:", error);
          return {
            error: `Failed to get task status: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    stopTask: tool({
      description:
        "Stop a running or paused task permanently. The task will finish its current iteration if one is in progress, then stop.",
      inputSchema: stopTaskSchema,
      execute: async (input: z.infer<typeof stopTaskSchema>) => {
        const { taskId } = input;
        try {
          const task = await prisma.agentTask.findFirst({
            where: { id: taskId, userId },
            select: { id: true, name: true, status: true },
          });

          if (!task) {
            return { error: "Task not found or you don't have access to it." };
          }

          if (task.status !== "running" && task.status !== "paused") {
            return {
              error: `Task "${task.name}" is already ${task.status}. Cannot stop.`,
            };
          }

          // Send stop signal via control hook
          await taskControlHook.resume(taskId, { action: "stop" });

          return {
            taskId: task.id,
            name: task.name,
            status: "stopping",
            message: `Task "${task.name}" is being stopped. It will finish its current iteration and then stop.`,
          };
        } catch (error) {
          console.error("[Task Tool] stopTask error:", error);
          // If hook resume fails, force-update the DB status
          try {
            await prisma.agentTask.update({
              where: { id: taskId },
              data: { status: "stopped", nextExecutionAt: null },
            });
            return {
              taskId,
              status: "stopped",
              message: "Task has been force-stopped.",
            };
          } catch {
            return {
              error: `Failed to stop task: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
          }
        }
      },
    }),

    pauseTask: tool({
      description:
        "Pause a running task. The task will finish its current iteration, then wait until resumed.",
      inputSchema: pauseTaskSchema,
      execute: async (input: z.infer<typeof pauseTaskSchema>) => {
        const { taskId } = input;
        try {
          const task = await prisma.agentTask.findFirst({
            where: { id: taskId, userId },
            select: { id: true, name: true, status: true },
          });

          if (!task) {
            return { error: "Task not found or you don't have access to it." };
          }

          if (task.status !== "running") {
            return {
              error: `Task "${task.name}" is ${task.status}. Can only pause running tasks.`,
            };
          }

          await taskControlHook.resume(taskId, { action: "pause" });

          return {
            taskId: task.id,
            name: task.name,
            status: "pausing",
            message: `Task "${task.name}" is being paused. Use resumeTask to continue.`,
          };
        } catch (error) {
          console.error("[Task Tool] pauseTask error:", error);
          return {
            error: `Failed to pause task: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),

    resumeTask: tool({
      description:
        "Resume a paused task. The task will continue from where it left off.",
      inputSchema: resumeTaskSchema,
      execute: async (input: z.infer<typeof resumeTaskSchema>) => {
        const { taskId } = input;
        try {
          const task = await prisma.agentTask.findFirst({
            where: { id: taskId, userId },
            select: { id: true, name: true, status: true },
          });

          if (!task) {
            return { error: "Task not found or you don't have access to it." };
          }

          if (task.status !== "paused") {
            return {
              error: `Task "${task.name}" is ${task.status}. Can only resume paused tasks.`,
            };
          }

          await taskControlHook.resume(taskId, { action: "resume" });

          return {
            taskId: task.id,
            name: task.name,
            status: "resuming",
            message: `Task "${task.name}" is being resumed.`,
          };
        } catch (error) {
          console.error("[Task Tool] resumeTask error:", error);
          return {
            error: `Failed to resume task: ${error instanceof Error ? error.message : "Unknown error"}`,
          };
        }
      },
    }),
  };
}
