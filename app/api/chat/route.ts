import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import prisma from "@/lib/prisma";
import {
  getSkillTools,
  getSkillConfigsFromEnv,
  skillRegistry,
} from "@/lib/skills";
import { getToolsForGroups } from "@/lib/tools";
import {
  createTwitterTools,
  createTwitterOnboardingTools,
  createTwitterConnectionBrokenTool,
  refreshTwitterToken,
} from "@/lib/tools/twitter";
import { createKnowledgeTools } from "@/lib/tools/knowledge";
import { safeDecrypt, encrypt } from "@/lib/utils/encryption";
import type { AvailableSkill } from "@/lib/skills";
import { getPrivyClient } from "@/lib/auth/verifyRequest";
import {
  withUsageBasedPayment,
  isUsageBasedBillingEnabled,
  type RequestWithBilling,
  type BillingContext,
} from "@/lib/x402";
import { rateLimitByUser } from "@/lib/rateLimit";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Default system prompt when no agent is specified
const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant for Agent Inc., a platform for AI-powered autonomous startups on chain. 
You help users understand the platform, answer questions about AI agents, blockchain technology, and the Bags standard.
Be concise, friendly, and helpful.`;

// Tool usage guidelines that are ALWAYS appended
const TOOL_USAGE_GUIDELINES = `
## CRITICAL: Tool Usage Rules

You have access to real tools that execute actions. You MUST follow these rules:

1. **ALWAYS use tools when available** - If a user asks for information that a tool can provide, CALL THE TOOL. Do not explain what you could do or write code examples.

2. **NEVER generate code instead of using tools** - If asked "what time is it" and you have getCurrentTime tool, CALL IT. Do not write Python/JavaScript datetime code.

3. **Tools provide REAL data** - Tool results are actual live data (real time, real weather, real prices). Use them.

4. **Call tools immediately** - Don't ask for confirmation. If the user's intent matches a tool's purpose, execute it.

5. **After tool results** - Present the data clearly to the user. Don't just dump JSON - format it nicely.

### Common mistakes to AVOID:
- ❌ Writing "import datetime; datetime.now()" when asked for time
- ❌ Saying "I would use the getCurrentTime tool" without actually calling it  
- ❌ Generating code examples instead of calling tools
- ✅ Actually calling getCurrentTime and showing the result

### Image Generation Guidelines:
When the user asks to generate, create, draw, or make an image/picture/illustration:
- IMMEDIATELY call the generateImage tool with a detailed prompt
- Enhance the user's description with artistic details for better results
- Choose an appropriate aspect ratio (1:1 for square, 16:9 for landscape, 9:16 for portrait)
- After the image is generated, briefly describe what you created
- Examples of triggers: "make me an image of...", "draw a...", "generate a picture of...", "create an illustration of..."`;

async function chatHandler(req: RequestWithBilling) {
  // Get billing context if available (injected by withUsageBasedPayment middleware)
  const billingContext: BillingContext | undefined = req.billingContext;

  // Use userId from billing context if available (already authenticated by middleware)
  // Otherwise verify authentication manually (for external x402 users or when billing disabled)
  let userId: string;

  if (billingContext?.userId) {
    userId = billingContext.userId;
  } else {
    const idToken = req.headers.get("privy-id-token");

    if (!idToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const privy = getPrivyClient();
      const privyUser = await privy.users().get({ id_token: idToken });
      userId = privyUser.id;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Rate limit: 30 chat requests per minute per user
  const rateLimited = await rateLimitByUser(userId, "chat", 30);
  if (rateLimited) return rateLimited;

  let requestBody;
  try {
    requestBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    messages,
    agentId,
    model = "anthropic/claude-haiku-4.5", // Default to Haiku 4.5
    enabledSkills = [],
    enabledToolGroups = [],
    skillApiKeys = {},
  }: {
    messages: UIMessage[];
    agentId?: string;
    model?: string;
    enabledSkills?: AvailableSkill[];
    enabledToolGroups?: string[];
    skillApiKeys?: Record<string, string>; // User-provided API keys
  } = requestBody;

  let baseSystemPrompt = DEFAULT_SYSTEM_PROMPT;
  let agentName = "Agent Inc. Assistant";
  let agentSkills: string[] = [];

  // If agentId is provided, fetch the agent's system prompt and skills
  if (agentId) {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: {
          systemPrompt: true,
          name: true,
          isPublic: true,
          createdById: true,
          enabledSkills: true,
          // Agent identity metadata
          description: true,
          personality: true,
          traits: true,
          skills: true,
          specialAbility: true,
          rarity: true,
          // Token/blockchain info
          isMinted: true,
          tokenMint: true,
          tokenSymbol: true,
          launchedAt: true,
        },
      });

      if (agent) {
        // Check if user can access this agent (owner or public)
        if (!agent.isPublic && agent.createdById !== userId) {
          return new Response(
            JSON.stringify({ error: "Access denied to this agent" }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        agentName = agent.name;

        // Build agent identity preamble
        const identityParts: string[] = [];

        // Core identity
        identityParts.push(`# Your Identity`);
        identityParts.push(
          `You are **${agent.name}**${agent.tokenSymbol ? ` ($${agent.tokenSymbol})` : ""}.`,
        );

        if (agent.description) {
          identityParts.push(`\n${agent.description}`);
        }

        // Token info (if minted/launched)
        if (agent.isMinted && agent.tokenMint) {
          identityParts.push(`\n## Your Token`);
          identityParts.push(
            `- **Symbol**: $${agent.tokenSymbol || agent.name.toUpperCase()}`,
          );
          identityParts.push(`- **Token Mint Address**: ${agent.tokenMint}`);
          identityParts.push(`- **Status**: Launched on Solana`);
          if (agent.launchedAt) {
            identityParts.push(
              `- **Launch Date**: ${agent.launchedAt.toISOString().split("T")[0]}`,
            );
          }
        }

        // Personality & traits
        if (agent.personality || (agent.traits && agent.traits.length > 0)) {
          identityParts.push(`\n## Your Personality & Traits`);
          if (agent.personality) {
            identityParts.push(`- **Personality**: ${agent.personality}`);
          }
          if (agent.traits && agent.traits.length > 0) {
            identityParts.push(`- **Traits**: ${agent.traits.join(", ")}`);
          }
        }

        // Skills (conceptual abilities, not toolsets)
        if (agent.skills && agent.skills.length > 0) {
          identityParts.push(`\n## Your Skills`);
          identityParts.push(agent.skills.map((s) => `- ${s}`).join("\n"));
        }

        // Special ability
        if (agent.specialAbility) {
          identityParts.push(`\n## Your Special Ability`);
          identityParts.push(`**${agent.specialAbility}**`);
        }

        // Rarity
        if (agent.rarity) {
          identityParts.push(`\n## Rarity`);
          identityParts.push(
            `You are a **${agent.rarity.toUpperCase()}** agent.`,
          );
        }

        // Important behavioral note
        identityParts.push(`\n---`);
        identityParts.push(
          `When someone asks "who are you" or about your identity, introduce yourself as ${agent.name}${agent.tokenSymbol ? ` with token $${agent.tokenSymbol}` : ""}. Share your personality, traits, and capabilities. You ARE this agent - embody its personality in all your responses.`,
        );
        identityParts.push(`---\n`);

        // Combine identity preamble with system prompt
        const identityPreamble = identityParts.join("\n");
        baseSystemPrompt = `${identityPreamble}\n\n# Your Instructions\n${agent.systemPrompt}`;

        // Get enabled skills from agent config
        if (agent.enabledSkills && agent.enabledSkills.length > 0) {
          agentSkills = agent.enabledSkills;
        }
      }
    } catch (error) {
      console.error("Failed to fetch agent:", error);
    }
  }

  // Start building the final system prompt
  let systemPrompt = baseSystemPrompt;

  // Determine which skills to enable
  const skillsToEnable = enabledSkills || agentSkills;

  // Build tools from enabled skills
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tools: Record<string, any> = {};

  // Add tool search for dynamic tool discovery (Haiku 4.5+ feature)
  tools.toolSearch = anthropic.tools.toolSearchBm25_20251119();

  // Add skill tools if any skills are enabled
  if (skillsToEnable.length > 0) {
    // Get server-side configs from environment
    const serverConfigs = getSkillConfigsFromEnv();

    // Merge with user-provided API keys (user keys take precedence if server not configured)
    const mergedConfigs: Record<string, { apiKey?: string }> = {};
    for (const skillId of skillsToEnable) {
      const serverConfig = serverConfigs[skillId] || {};
      const userApiKey = skillApiKeys[skillId];

      // Use server config if available, otherwise use user-provided key
      mergedConfigs[skillId] = {
        apiKey: serverConfig.apiKey || userApiKey,
      };
    }

    const skillTools = getSkillTools(skillsToEnable, mergedConfigs);
    const skillToolNames = Object.keys(skillTools);

    if (skillToolNames.length > 0) {
      // Mark skill tools as deferred for tool search
      const deferredSkillTools = Object.fromEntries(
        Object.entries(skillTools).map(([name, tool]) => [
          name,
          {
            ...tool,
            providerOptions: {
              anthropic: { deferLoading: true },
            },
          },
        ]),
      );
      tools = { ...tools, ...deferredSkillTools };
    } else {
      console.warn(
        "[Chat API] No skill tools were created. Check if API keys are configured.",
      );
    }

    // Append skill-specific system prompts
    const skillPrompts = skillRegistry.getSystemPrompts(skillsToEnable);
    if (skillPrompts) {
      systemPrompt = `${systemPrompt}\n\n${skillPrompts}`;
    }
  }

  // Add tools from enabled tool groups - only add what's explicitly enabled
  if (enabledToolGroups.length > 0) {
    const groupTools = getToolsForGroups(enabledToolGroups);

    // Separate provider-defined tools from regular tools
    // Provider-defined tools like web_search should NOT be deferred
    const providerDefinedTools = ["web_search"];

    const deferredGroupTools = Object.fromEntries(
      Object.entries(groupTools).map(([name, tool]) => {
        // Don't defer provider-defined tools
        if (providerDefinedTools.includes(name)) {
          return [name, tool];
        }
        // Defer regular tools for tool search
        return [
          name,
          {
            ...tool,
            providerOptions: {
              anthropic: { deferLoading: true },
            },
          },
        ];
      }),
    );
    tools = { ...tools, ...deferredGroupTools };

    // Add Knowledge tools if the knowledge group is enabled
    // Knowledge tools are created dynamically with userId/agentId context
    if (enabledToolGroups.includes("knowledge")) {
      try {
        const knowledgeTools = createKnowledgeTools(userId, agentId);

        // Mark knowledge tools as deferred for tool search
        const deferredKnowledgeTools = Object.fromEntries(
          Object.entries(knowledgeTools).map(([name, tool]) => [
            name,
            {
              ...tool,
              providerOptions: {
                anthropic: { deferLoading: true },
              },
            },
          ]),
        );
        tools = { ...tools, ...deferredKnowledgeTools };
      } catch (error) {
        console.error("[Chat API] Failed to load Knowledge tools:", error);
      }
    }

    // Add Twitter tools if the twitter group is enabled
    // Always include onboarding tools so the AI can help users connect
    if (enabledToolGroups.includes("twitter")) {
      try {
        const twitterUser = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            twitterAccessToken: true,
            twitterRefreshToken: true,
            twitterTokenExpiresAt: true,
            twitterUsername: true,
            twitterConnectedAt: true,
          },
        });

        const isConnected = !!(
          twitterUser?.twitterAccessToken && twitterUser?.twitterUsername
        );

        // ALWAYS add onboarding tools so the AI can check status and provide OAuth URL
        const onboardingTools = createTwitterOnboardingTools({
          userId,
          isConnected,
          username: twitterUser?.twitterUsername || undefined,
          connectedAt: twitterUser?.twitterConnectedAt || undefined,
          tokenExpiresAt: twitterUser?.twitterTokenExpiresAt || undefined,
        });

        // Mark onboarding tools as deferred for tool search
        const deferredOnboardingTools = Object.fromEntries(
          Object.entries(onboardingTools).map(([name, tool]) => [
            name,
            {
              ...tool,
              providerOptions: {
                anthropic: { deferLoading: true },
              },
            },
          ]),
        );
        tools = { ...tools, ...deferredOnboardingTools };

        // If connected, also add the full Twitter API tools
        if (twitterUser?.twitterAccessToken) {
          // Decrypt the stored token (handles both encrypted and legacy plaintext)
          let accessToken = safeDecrypt(twitterUser.twitterAccessToken);

          // Check if token is expired or expiring soon (within 5 minutes)
          const expirationBuffer = 5 * 60 * 1000; // 5 minutes
          const isExpired =
            twitterUser.twitterTokenExpiresAt &&
            new Date(twitterUser.twitterTokenExpiresAt).getTime() <
              Date.now() + expirationBuffer;

          if (isExpired && twitterUser.twitterRefreshToken) {
            // Decrypt refresh token before using
            const decryptedRefreshToken = safeDecrypt(
              twitterUser.twitterRefreshToken,
            );
            const refreshResult = await refreshTwitterToken(
              decryptedRefreshToken,
            );

            if (refreshResult) {
              // Encrypt new tokens before storing
              const encryptedAccessToken = encrypt(refreshResult.accessToken);
              const encryptedRefreshToken = encrypt(refreshResult.refreshToken);

              // Update encrypted tokens in database
              await prisma.user.update({
                where: { id: userId },
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
              accessToken = ""; // Clear to skip adding API tools

              // Add a tool to inform the user their connection is broken
              const brokenTool = createTwitterConnectionBrokenTool(
                userId,
                "refresh_failed",
              );
              tools = { ...tools, ...brokenTool };
            }
          } else if (isExpired) {
            accessToken = "";

            // Add a tool to inform the user their connection is broken
            const brokenTool = createTwitterConnectionBrokenTool(
              userId,
              "no_refresh_token",
            );
            tools = { ...tools, ...brokenTool };
          }

          if (accessToken) {
            const twitterApiTools = createTwitterTools(accessToken);

            // Mark Twitter API tools as deferred for tool search
            const deferredTwitterTools = Object.fromEntries(
              Object.entries(twitterApiTools).map(([name, tool]) => [
                name,
                {
                  ...tool,
                  providerOptions: {
                    anthropic: { deferLoading: true },
                  },
                },
              ]),
            );
            tools = { ...tools, ...deferredTwitterTools };
          }
        }
      } catch (error) {
        console.error("[Chat API] Failed to load Twitter tools:", error);
      }
    }
  }

  const toolNames = Object.keys(tools);

  // ALWAYS append tool usage guidelines if tools are available
  if (toolNames.length > 0) {
    // Build a human-readable list of available tools
    const toolDescriptions = toolNames
      .map((name) => {
        const tool = tools[name];
        const desc = tool?.description || "No description";
        // Truncate long descriptions
        const shortDesc = desc.length > 100 ? desc.slice(0, 100) + "..." : desc;
        return `- **${name}**: ${shortDesc}`;
      })
      .join("\n");

    systemPrompt = `${systemPrompt}

${TOOL_USAGE_GUIDELINES}

### Your Available Tools:
${toolDescriptions}

Remember: CALL these tools, don't write code about them!`;
  }

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    tools: Object.keys(tools).length > 0 ? tools : undefined,
    stopWhen: stepCountIs(5),
    // Usage-based billing: calculate cost from token usage + model pricing
    onFinish: async ({ usage }) => {
      // Only charge if billing context is available (Privy authenticated user)
      if (billingContext) {
        // Import calculateCost dynamically to avoid circular deps
        const { calculateCost } = await import("@/lib/x402/ai-gateway-cost");

        // Calculate cost from tokens * model pricing
        const costResult = await calculateCost(model, {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        });

        if (costResult && costResult.totalCost > 0) {
          console.log(
            `[Chat] Calculated cost: $${costResult.totalCost.toFixed(6)} ` +
              `(${usage.inputTokens || 0} in + ${usage.outputTokens || 0} out tokens)`,
          );

          // Charge asynchronously - don't block the response
          billingContext
            .chargeUsage(
              costResult.totalCost,
              `AI Chat [${model}] - ${usage.totalTokens || 0} tokens`,
              {
                model,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
              },
            )
            .then((result) => {
              if (result.success) {
                console.log(
                  `[Chat] Billed ${result.solCost} SOL ($${result.usdCost.toFixed(6)}) for ${usage.totalTokens || 0} tokens`,
                );
              } else if (result.error) {
                console.error(`[Chat] Billing failed: ${result.error}`);
              }
            })
            .catch((error) => {
              console.error("[Chat] Billing error:", error);
            });
        } else {
          // No cost calculated - either no pricing or zero tokens
          console.warn(
            `[Chat] Could not calculate cost for model ${model}. Usage:`,
            usage,
          );
        }
      }
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
    headers: {
      "X-Agent-Name": encodeURIComponent(agentName),
    },
  });
}

// Export with usage-based payment wrapper if enabled, otherwise export raw handler
// Usage-based billing charges actual AI Gateway costs after generation completes
export const POST = isUsageBasedBillingEnabled()
  ? withUsageBasedPayment(chatHandler, "chat")
  : chatHandler;
