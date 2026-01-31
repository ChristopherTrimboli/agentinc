import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { PrivyClient } from "@privy-io/node";
import { generateImagePrompt, AgentTraitData } from "@/lib/agentTraits";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to verify auth
async function verifyAuth(req: NextRequest): Promise<string | null> {
  const idToken = req.headers.get("privy-id-token");
  if (!idToken) return null;

  try {
    const privyUser = await privy.users().get({ id_token: idToken });
    return privyUser.id;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, traits } = body as { name: string; traits: AgentTraitData };

    if (!name || !traits) {
      return NextResponse.json(
        { error: "Missing required fields: name, traits" },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Generate the image prompt based on agent traits
    const prompt = generateImagePrompt(name, traits);

    // Generate image using GPT-5 chat with image generation
    const response = await openai.responses.create({
      model: "openai/gpt-5-chat",
      input: `Generate a high-quality image based on this description: ${prompt}`,
      tools: [{ type: "image_generation" }],
    });

    // Extract image URL from response
    let imageUrl: string | undefined;
    
    if (response.output) {
      for (const item of response.output) {
        if (item.type === "image_generation_call" && item.result) {
          imageUrl = item.result;
          break;
        }
      }
    }

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl,
      prompt,
    });
  } catch (error) {
    console.error("Error generating image:", error);
    
    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 400) {
        return NextResponse.json(
          { error: "Invalid image generation request" },
          { status: 400 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
