import { generateText, stepCountIs } from "ai";
import prisma from "@/lib/prisma";
import { getToolsForGroups } from "@/lib/tools";
import { getSkillTools, getSkillConfigsFromEnv } from "@/lib/skills";
import { createTwitterTools, refreshTwitterToken } from "@/lib/tools/twitter";
import { createKnowledgeTools } from "@/lib/tools/knowledge";
import { safeDecrypt, encrypt } from "@/lib/utils/encryption";
import { chargeForUsage } from "@/lib/x402";
import { calculateCost } from "@/lib/x402/ai-gateway-cost";
import type { BillingContext } from "@/lib/x402";
import type { ToolMap } from "@/lib/tools/types";

/** Configuration passed to each task iteration */
export interface TaskConfig {
  taskId: string;
  agentId: string;
  userId: string;
  taskPrompt: string;
  systemPrompt: string;
  model: string;
  intervalMs: number;
  maxIterations?: number;
  enabledToolGroups: string[];
  enabledSkills: string[];
}

/** Result from a single task iteration */
export interface IterationResult {
  content: string;
  toolCalls: Array<{ name: string; args: unknown; result: unknown }>;
  tokenUsage: { inputTokens: number; outputTokens: number };
  status: "success" | "error";
  error?: string;
}

/**
 * Execute a single iteration of a recurring task.
 * Loads tools, runs the AI agent, charges for usage, and returns the result.
 */
export async function executeIteration(
  config: TaskConfig,
  iteration: number,
): Promise<IterationResult> {
  "use step";

  try {
    // Build billing context for this task's user
    const billingContext: BillingContext = {
      userId: config.userId,
      walletAddress: "",
      chargeUsage: (usdCost, desc, meta) =>
        chargeForUsage(
          config.userId,
          usdCost,
          desc || `Task [${config.taskId}]`,
          meta,
        ),
    };

    // Build tools from task configuration
    const tools: ToolMap = {};

    // Add standard tool groups
    if (config.enabledToolGroups.length > 0) {
      const groupTools = getToolsForGroups(
        config.enabledToolGroups.filter((g) => g !== "twitter"),
        billingContext,
      );
      Object.assign(tools, groupTools);
    }

    // Add skill tools
    if (config.enabledSkills.length > 0) {
      try {
        const serverConfigs = getSkillConfigsFromEnv();
        const skillTools = getSkillTools(config.enabledSkills, serverConfigs);
        Object.assign(tools, skillTools);
      } catch (error) {
        console.error(
          `[Task ${config.taskId}] Failed to load skill tools:`,
          error,
        );
      }
    }

    // Add Twitter tools if enabled
    if (config.enabledToolGroups.includes("twitter")) {
      try {
        const twitterUser = await prisma.user.findUnique({
          where: { id: config.userId },
          select: {
            twitterAccessToken: true,
            twitterRefreshToken: true,
            twitterTokenExpiresAt: true,
            twitterUsername: true,
          },
        });

        if (twitterUser?.twitterAccessToken) {
          let accessToken = safeDecrypt(twitterUser.twitterAccessToken);

          // Refresh if expired
          const expirationBuffer = 5 * 60 * 1000;
          const isExpired =
            twitterUser.twitterTokenExpiresAt &&
            new Date(twitterUser.twitterTokenExpiresAt).getTime() <
              Date.now() + expirationBuffer;

          if (isExpired && twitterUser.twitterRefreshToken) {
            const decryptedRefreshToken = safeDecrypt(
              twitterUser.twitterRefreshToken,
            );
            const refreshResult = await refreshTwitterToken(
              decryptedRefreshToken,
            );

            if (refreshResult) {
              const encryptedAccessToken = encrypt(refreshResult.accessToken);
              const encryptedRefreshToken = encrypt(refreshResult.refreshToken);
              await prisma.user.update({
                where: { id: config.userId },
                data: {
                  twitterAccessToken: encryptedAccessToken,
                  twitterRefreshToken: encryptedRefreshToken,
                  twitterTokenExpiresAt: new Date(
                    Date.now() + refreshResult.expiresIn * 1000,
                  ),
                },
              });
              accessToken = refreshResult.accessToken;
            } else {
              accessToken = "";
            }
          } else if (isExpired) {
            accessToken = "";
          }

          if (accessToken) {
            const twitterApiTools = createTwitterTools(
              accessToken,
              billingContext,
            );
            Object.assign(tools, twitterApiTools);
          }
        }
      } catch (error) {
        console.error(
          `[Task ${config.taskId}] Failed to load Twitter tools:`,
          error,
        );
      }
    }

    // Add knowledge tools if enabled
    if (config.enabledToolGroups.includes("knowledge")) {
      try {
        const knowledgeTools = createKnowledgeTools(
          config.userId,
          config.agentId,
          billingContext,
        );
        Object.assign(tools, knowledgeTools);
      } catch (error) {
        console.error(
          `[Task ${config.taskId}] Failed to load knowledge tools:`,
          error,
        );
      }
    }

    // Build iteration prompt with context
    const iterationPrompt = `[Task Iteration ${iteration}] ${config.taskPrompt}`;

    // Use generateText (non-streaming) for background task execution
    // Pass model string directly to route through AI Gateway (not anthropic() wrapper)
    const result = await generateText({
      model: config.model,
      system: config.systemPrompt,
      messages: [{ role: "user", content: iterationPrompt }],
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      stopWhen: stepCountIs(10), // Allow up to 10 tool call steps (read timeline + reply to multiple tweets)
    });

    // Collect tool call information
    const toolCalls = result.steps.flatMap((step) =>
      step.toolCalls.map((tc) => ({
        name: tc.toolName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args: (tc as any).args ?? (tc as any).input ?? {},
        result: step.toolResults.find((tr) => tr.toolCallId === tc.toolCallId)
          ?.output,
      })),
    );

    // Bill for AI inference (same pattern as chat route)
    const usage = result.usage;
    try {
      const costResult = await calculateCost(config.model, {
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
      });

      if (costResult && costResult.totalCost > 0) {
        const billingResult = await chargeForUsage(
          config.userId,
          costResult.totalCost,
          `Task [${config.taskId}] Iteration ${iteration} - ${config.model} - ${(usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)} tokens`,
          {
            model: config.model,
            inputTokens: usage.inputTokens ?? 0,
            outputTokens: usage.outputTokens ?? 0,
          },
        );
        if (!billingResult.success && billingResult.error) {
          console.error(
            `[Task ${config.taskId}] Billing failed: ${billingResult.error}`,
          );
        }
      }
    } catch (error) {
      console.error(`[Task ${config.taskId}] Billing error:`, error);
    }

    return {
      content: result.text || "(No text response)",
      toolCalls,
      tokenUsage: {
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
      },
      status: "success",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[Task ${config.taskId}] Iteration ${iteration} failed:`,
      error,
    );

    return {
      content: `Error: ${errorMessage}`,
      toolCalls: [],
      tokenUsage: { inputTokens: 0, outputTokens: 0 },
      status: "error",
      error: errorMessage,
    };
  }
}
