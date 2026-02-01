import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "ai";
import { put } from "@vercel/blob";
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

    // Generate image using AI SDK with gateway provider
    const result = await generateImage({
      model: "google/imagen-4.0-generate-001",
      prompt,
      aspectRatio: "1:1",
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

    // Convert to Buffer for Vercel Blob upload
    // Use uint8Array if available (more efficient), otherwise decode from base64
    const imageBuffer = image.uint8Array 
      ? Buffer.from(image.uint8Array) 
      : Buffer.from(image.base64, "base64");

    // Generate a unique filename
    const timestamp = Date.now();
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const filename = `agents/${sanitizedName}-${timestamp}.png`;

    // Upload to Vercel Blob
    const blob = await put(filename, imageBuffer, {
      access: "public",
      contentType: "image/png",
    });

    return NextResponse.json({
      imageUrl: blob.url,
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
