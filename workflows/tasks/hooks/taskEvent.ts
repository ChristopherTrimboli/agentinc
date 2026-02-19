import { defineHook } from "workflow";
import { z } from "zod";

/**
 * Event trigger hook for agent tasks.
 * External services (Discord, Twitter, custom webhooks) resume this hook
 * by POSTing to /api/tasks/[taskId]/trigger.
 *
 * The workflow blocks on this hook (zero resource usage) until an event
 * arrives, then executes a task iteration with the event data as context.
 */
export const taskEventHook = defineHook({
  schema: z.object({
    /** Where the event originated (e.g. "discord", "twitter", "custom") */
    source: z.string(),
    /** Event type from the source (e.g. "message", "tweet", "mention") */
    eventType: z.string(),
    /** Arbitrary payload forwarded from the external webhook */
    payload: z.record(z.string(), z.unknown()).optional(),
    /** Human-readable summary injected into the agent prompt */
    summary: z.string().optional(),
    /** ISO timestamp of when the external event occurred */
    occurredAt: z.string().optional(),
  }),
});
