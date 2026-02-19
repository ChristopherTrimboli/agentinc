import { sleep } from "workflow";

import { taskControlHook } from "./hooks/taskControl";
import { taskEventHook } from "./hooks/taskEvent";
import {
  executeIteration,
  type TaskConfig,
  type TaskEventContext,
} from "./steps/execute";
import {
  updateTaskProgress,
  updateNextExecution,
  markTaskComplete,
  markTaskStopped,
  markTaskPaused,
  markTaskRunning,
  saveTaskLog,
} from "./steps/db";

/**
 * Recurring Task Workflow
 *
 * A durable workflow that repeatedly executes an AI agent task.
 * Supports three trigger modes:
 *
 * - "interval": sleeps N ms between iterations (default).
 * - "event": blocks until an external webhook fires taskEventHook, then runs.
 * - "event-or-interval": races between an incoming event and a timeout —
 *     whichever arrives first triggers the next iteration.
 *
 * All modes support pause, resume, and stop via taskControlHook.
 * Event context (source, payload, summary) is injected into the agent prompt.
 */
export async function recurringTaskWorkflow(
  config: TaskConfig,
): Promise<{ taskId: string; iterations: number }> {
  "use workflow";

  const triggerMode = config.triggerMode ?? "interval";

  // Create both hooks with taskId as deterministic token
  const controlHook = taskControlHook.create({ token: config.taskId });
  const eventHook = taskEventHook.create({ token: config.taskId });

  let iteration = 0;
  let running = true;

  while (running) {
    iteration++;

    // Resolve event context for this iteration (only present in event modes)
    let eventContext: TaskEventContext | null = null;

    if (triggerMode === "event") {
      // Block with zero resource usage until an external event arrives.
      // Also race against control signals so pause/stop still work immediately.
      const outcome = await Promise.race([
        eventHook.then((e) => ({ kind: "event" as const, event: e })),
        controlHook.then((s) => ({ kind: "control" as const, signal: s })),
      ]);

      if (outcome.kind === "control") {
        if (outcome.signal.action === "stop") {
          await markTaskStopped(config.taskId);
          break;
        }
        if (outcome.signal.action === "pause") {
          await markTaskPaused(config.taskId);
          const resumeSignal = await controlHook;
          if (resumeSignal.action === "stop") {
            await markTaskStopped(config.taskId);
            break;
          }
          await markTaskRunning(config.taskId);
          // Decrement so this iteration slot isn't wasted
          iteration--;
          continue;
        }
      }

      eventContext = outcome.kind === "event" ? outcome.event : null;
    } else if (triggerMode === "event-or-interval") {
      // Race event, interval sleep, and control — first wins.
      const outcome = await Promise.race([
        eventHook.then((e) => ({ kind: "event" as const, event: e })),
        sleep(config.intervalMs).then(() => ({ kind: "interval" as const })),
        controlHook.then((s) => ({ kind: "control" as const, signal: s })),
      ]);

      if (outcome.kind === "control") {
        if (outcome.signal.action === "stop") {
          await markTaskStopped(config.taskId);
          break;
        }
        if (outcome.signal.action === "pause") {
          await markTaskPaused(config.taskId);
          const resumeSignal = await controlHook;
          if (resumeSignal.action === "stop") {
            await markTaskStopped(config.taskId);
            break;
          }
          await markTaskRunning(config.taskId);
          iteration--;
          continue;
        }
      }

      eventContext = outcome.kind === "event" ? outcome.event : null;
    }
    // For "interval" mode, eventContext stays null and sleep happens after.

    // Execute the AI task iteration (with optional event context in prompt)
    const result = await executeIteration(
      config,
      iteration,
      eventContext ?? undefined,
    );

    // Save iteration result to DB
    await saveTaskLog(config.taskId, iteration, result.content, result.status, {
      toolCalls: result.toolCalls,
      tokenUsage: result.tokenUsage,
      error: result.error,
    });

    // Update progress
    await updateTaskProgress(config.taskId, iteration);

    // Check if we've hit max iterations
    if (config.maxIterations && iteration >= config.maxIterations) {
      await markTaskComplete(config.taskId);
      break;
    }

    if (result.status === "error") {
      console.warn(
        `[Task ${config.taskId}] Iteration ${iteration} failed: ${result.error}`,
      );
    }

    // ── Interval mode: sleep then check for control signals ────────────────
    if (triggerMode === "interval") {
      const nextExecution = new Date(Date.now() + config.intervalMs);
      await updateNextExecution(config.taskId, nextExecution);

      const signal = await Promise.race([
        sleep(config.intervalMs).then(() => null),
        controlHook.then((s) => s),
      ]);

      if (signal) {
        if (signal.action === "stop") {
          await markTaskStopped(config.taskId);
          running = false;
          break;
        }

        if (signal.action === "pause") {
          await markTaskPaused(config.taskId);
          const resumeSignal = await controlHook;
          if (resumeSignal.action === "stop") {
            await markTaskStopped(config.taskId);
            running = false;
            break;
          }
          await markTaskRunning(config.taskId);
        }
      }
    }
    // Event modes loop back immediately — the hook at the top of the loop
    // is what provides the "wait" before the next iteration.
  }

  return { taskId: config.taskId, iterations: iteration };
}
