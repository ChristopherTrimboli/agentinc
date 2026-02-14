import { defineHook } from "workflow";
import { z } from "zod";

/**
 * Control hook for managing running agent tasks.
 * Uses taskId as the deterministic token so the API can address
 * the correct running workflow by task ID.
 *
 * Actions:
 * - stop: Gracefully stop the task after current iteration
 * - pause: Pause the task (blocks until resume or stop)
 * - resume: Resume a paused task
 */
export const taskControlHook = defineHook({
  schema: z.object({
    action: z.enum(["stop", "pause", "resume"]),
    message: z.string().optional(),
  }),
});
