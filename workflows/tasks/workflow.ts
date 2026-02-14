import { sleep } from "workflow";

import { taskControlHook } from "./hooks/taskControl";
import { executeIteration, type TaskConfig } from "./steps/execute";
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
 * A durable workflow that repeatedly executes an AI agent task at a configured
 * interval. Supports pause, resume, and stop via the taskControlHook.
 *
 * Each iteration:
 * 1. Runs the AI agent with configured tools and prompt
 * 2. Saves the result as a TaskLog entry
 * 3. Bills the user for AI inference and tool usage
 * 4. Sleeps for the configured interval (zero resource usage)
 * 5. Checks for control signals (stop/pause)
 *
 * The workflow survives deployments, crashes, and restarts via Vercel Workflow.
 */
export async function recurringTaskWorkflow(
  config: TaskConfig,
): Promise<{ taskId: string; iterations: number }> {
  "use workflow";

  // Create control hook with taskId as deterministic token
  const hook = taskControlHook.create({ token: config.taskId });

  let iteration = 0;
  let running = true;

  while (running) {
    iteration++;

    // Execute the AI task iteration
    const result = await executeIteration(config, iteration);

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

    // If iteration failed, still continue but log it
    if (result.status === "error") {
      // Don't stop on individual iteration errors - the next one may succeed
      console.warn(
        `[Task ${config.taskId}] Iteration ${iteration} failed: ${result.error}`,
      );
    }

    // Set next execution time
    const nextExecution = new Date(Date.now() + config.intervalMs);
    await updateNextExecution(config.taskId, nextExecution);

    // Race: wait for interval to pass OR a control signal
    const signal = await Promise.race([
      sleep(config.intervalMs).then(() => null),
      hook.then((s) => s),
    ]);

    if (signal) {
      if (signal.action === "stop") {
        await markTaskStopped(config.taskId);
        running = false;
        break;
      }

      if (signal.action === "pause") {
        await markTaskPaused(config.taskId);

        // Block until resume or stop signal
        const resumeSignal = await hook;

        if (resumeSignal.action === "stop") {
          await markTaskStopped(config.taskId);
          running = false;
          break;
        }

        // Resumed - continue loop
        await markTaskRunning(config.taskId);
      }
    }
  }

  return { taskId: config.taskId, iterations: iteration };
}
