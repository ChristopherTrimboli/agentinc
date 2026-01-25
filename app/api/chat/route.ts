import { streamText, convertToModelMessages, type UIMessage } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "openai/gpt-4o",
    system: `You are a helpful AI assistant for Agent Inc., a platform for AI-powered autonomous startups on chain. 
You help users understand the platform, answer questions about AI agents, blockchain technology, and the ERC-8041 standard.
Be concise, friendly, and helpful.`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
