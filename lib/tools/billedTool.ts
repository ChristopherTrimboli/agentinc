/**
 * Billed Tool Wrapper
 *
 * Wraps an AI SDK tool definition with x402 usage-based billing.
 * When a tool executes successfully, the user is automatically charged
 * the configured cost via BillingContext.chargeUsage().
 *
 * If no billing context is provided (e.g. during development or for
 * unauthenticated users), the tool still works — it just doesn't charge.
 *
 * Billing is fire-and-forget: failures are logged but never block the
 * tool result from reaching the user.
 *
 * Note: The AI SDK's `tool()` function is a type-only identity function
 * (it just returns its argument). This wrapper constructs the same shape
 * directly, avoiding overload-inference issues with TypeScript.
 */

import type { BillingContext } from "@/lib/x402";
import type { z } from "zod";

/**
 * Options for creating a billed tool.
 * Same shape as AI SDK's tool() argument, plus a `cost` and optional `category`.
 */
interface BilledToolOptions {
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputSchema: z.ZodType<any>;
  /** USD cost per successful invocation */
  cost: number;
  /** Category label for billing logs (e.g. "X API", "Twilio", "Image Gen") */
  category?: string;
  /** The execute function for the tool */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: (...args: any[]) => Promise<any>;
  /** Optional input examples (forwarded to AI SDK) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputExamples?: any[];
}

/**
 * Create an AI SDK-compatible tool that automatically charges the user on success.
 *
 * Drop-in replacement for `tool()` — same signature plus `cost` (USD)
 * and an optional `billingContext`.
 *
 * @param name - Tool name (used in billing description, e.g. "postTweet")
 * @param options - Tool definition including cost
 * @param billingContext - Optional billing context; omit to skip charging
 */
export function billedTool(
  name: string,
  options: BilledToolOptions,
  billingContext?: BillingContext,
) {
  const { cost, category, execute: originalExecute, ...rest } = options;
  const label = category ? `${category}: ${name}` : name;

  // If there's no billing context, return a plain tool (no wrapping needed)
  if (!billingContext) {
    return { ...rest, execute: originalExecute };
  }

  // Wrap execute to add billing after successful invocation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrappedExecute = async (...args: any[]) => {
    const result = await originalExecute(...args);

    // Only charge on success (convention: error results contain an `error` field)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(result as any)?.error) {
      billingContext
        .chargeUsage(cost, label, {})
        .then((r) => {
          if (r.success) {
            console.log(
              `[Billing] ${name}: charged $${cost.toFixed(4)} (${r.solCost} SOL)`,
            );
          } else if (r.error) {
            console.error(`[Billing] ${name}: charge failed — ${r.error}`);
          }
        })
        .catch((err) => {
          console.error(`[Billing] ${name}: unexpected error —`, err);
        });
    }

    return result;
  };

  return { ...rest, execute: wrappedExecute };
}
