import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "ai";
import { PrivyClient } from "@privy-io/node";
import { generateImagePrompt, AgentTraitData } from "@/lib/agentTraits";

const privy = new PrivyClient({
  appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!,
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

    // Generate the image prompt based on agent traits
    const prompt = generateImagePrompt(name, traits);

    // Generate image using AI SDK with gateway model
    const result = await generateImage({
      model: "openai/dall-e-3",
      prompt,
      size: "1024x1024",
      n: 1,
    });

    // Get the generated image
    const image = result.images[0];
    if (!image) {
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 }
      );
    }

    // Convert to data URL or use the base64 directly
    const imageUrl = `data:image/png;base64,${image.base64}`;

    return NextResponse.json({
      imageUrl,
      prompt,
    });
  } catch (error) {
    console.error("Error generating image:", error);
    
    // Handle rate limit errors
    if (error instanceof Error && error.message.includes("429")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
