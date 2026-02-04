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
import type { AvailableSkill } from "@/lib/skills";
import { getPrivyClient } from "@/lib/auth/verifyRequest";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Default system prompt when no agent is specified
const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant for Agent Inc., a platform for AI-powered autonomous startups on chain. 
You help users understand the platform, answer questions about AI agents, blockchain technology, and the ERC-8041 standard.
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

export async function POST(req: Request) {
  // Verify authentication
  const idToken = req.headers.get("privy-id-token");

  if (!idToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let userId: string;
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
    model = "anthropic/claude-haiku-4-5", // Default to Haiku 4.5
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

  console.log("[Chat API] Request:", {
    agentId,
    model,
    enabledSkills,
    enabledToolGroups,
    hasUserApiKeys: Object.keys(skillApiKeys).length > 0,
    messageCount: messages?.length,
  });

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

    // Log which skills are being enabled for debugging
    console.log("[Chat API] Enabling skills:", skillsToEnable);
    console.log(
      "[Chat API] Skills with server config:",
      Object.keys(serverConfigs).filter((k) => serverConfigs[k]?.apiKey),
    );
    console.log(
      "[Chat API] Skills with user config:",
      Object.keys(skillApiKeys),
    );

    const skillTools = getSkillTools(skillsToEnable, mergedConfigs);
    const skillToolNames = Object.keys(skillTools);

    if (skillToolNames.length > 0) {
      console.log("[Chat API] Registered skill tools:", skillToolNames);
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
      console.log("[Chat API] Added skill prompts to system prompt");
    }
  }

  // Add tools from enabled tool groups - only add what's explicitly enabled
  if (enabledToolGroups.length > 0) {
    const groupTools = getToolsForGroups(enabledToolGroups);
    console.log(
      "[Chat API] Adding tools from groups:",
      enabledToolGroups,
      Object.keys(groupTools),
    );
    
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
  }

  // Log final tool count
  const toolNames = Object.keys(tools);
  console.log(
    `[Chat API] Total tools available: ${toolNames.length}`,
    toolNames,
  );

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
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
    sendSources: true,
    headers: {
      "X-Agent-Name": encodeURIComponent(agentName),
    },
  });
}
