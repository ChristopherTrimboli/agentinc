import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import prisma from "@/lib/prisma";
import {
  getSkillTools,
  getSkillConfigsFromEnv,
  skillRegistry,
} from "@/lib/skills";
import { getAllTools } from "@/lib/tools";
import type { AvailableSkill } from "@/lib/skills";
import { getPrivyClient } from "@/lib/auth/verifyRequest";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// Default system prompt when no agent is specified
const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant for Agent Inc., a platform for AI-powered autonomous startups on chain. 
You help users understand the platform, answer questions about AI agents, blockchain technology, and the ERC-8041 standard.
Be concise, friendly, and helpful.`;

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
    enabledSkills,
    includeTools = true,
  }: {
    messages: UIMessage[];
    agentId?: string;
    enabledSkills?: AvailableSkill[];
    includeTools?: boolean;
  } = requestBody;

  let systemPrompt = DEFAULT_SYSTEM_PROMPT;
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
        systemPrompt = agent.systemPrompt;
        agentName = agent.name;

        // Get enabled skills from agent config
        if (agent.enabledSkills && agent.enabledSkills.length > 0) {
          agentSkills = agent.enabledSkills;
        }
      }
    } catch (error) {
      console.error("Failed to fetch agent:", error);
    }
  }

  // Determine which skills to enable
  const skillsToEnable = enabledSkills || agentSkills;

  // Build tools from enabled skills
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tools: Record<string, any> = {};

  // Add skill tools if any skills are enabled
  if (skillsToEnable.length > 0) {
    const configs = getSkillConfigsFromEnv();
    tools = { ...tools, ...getSkillTools(skillsToEnable, configs) };

    // Append skill-specific system prompts
    const skillPrompts = skillRegistry.getSystemPrompts(skillsToEnable);
    if (skillPrompts) {
      systemPrompt = `${systemPrompt}\n\n${skillPrompts}`;
    }
  }

  // Add basic tools (weather, etc.) if requested
  if (includeTools) {
    tools = { ...tools, ...getAllTools() };
  }

  const result = streamText({
    model: "anthropic/claude-haiku-4-5",
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
