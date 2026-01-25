import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { PrivyClient } from "@privy-io/node";
import prisma from "@/lib/prisma";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

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
    const privyUser = await privy.users().get({ id_token: idToken });
    userId = privyUser.id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, agentId }: { messages: UIMessage[]; agentId?: string } =
    await req.json();

  let systemPrompt = DEFAULT_SYSTEM_PROMPT;
  let agentName = "Agent Inc. Assistant";

  // If agentId is provided, fetch the agent's system prompt
  if (agentId) {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: {
          systemPrompt: true,
          name: true,
          isPublic: true,
          createdById: true,
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
      }
    } catch (error) {
      console.error("Failed to fetch agent:", error);
      // Fall back to default prompt
    }
  }

  const result = streamText({
    model: "openai/gpt-4o",
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "X-Agent-Name": encodeURIComponent(agentName),
    },
  });
}
