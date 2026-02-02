import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "ai";
import { put } from "@vercel/blob";
import { generateImagePrompt, AgentTraitData } from "@/lib/agentTraits";
import { getPrivyClient } from "@/lib/auth/verifyRequest";

// Helper to verify auth
async function verifyAuth(req: NextRequest): Promise<string | null> {
  const idToken = req.headers.get("privy-id-token");
  if (!idToken) return null;

  try {
    const privy = getPrivyClient();
    const privyUser = await privy.users().get({ id_token: idToken });
    return privyUser.id;
  } catch {
    return null;
  }
}

interface GenerateImageBody {
  name: string;
  traits?: AgentTraitData;
  customPrompt?: string;
  uploadedImage?: string; // base64 encoded
  contentType?: string;
}

export async function POST(req: NextRequest) {
  const userId = await verifyAuth(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as GenerateImageBody;
    const { name, traits, customPrompt, uploadedImage, contentType } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 },
      );
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "-");

    // Handle manual image upload
    if (uploadedImage) {
      // Validate content type
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
      if (!contentType || !allowedTypes.includes(contentType)) {
        return NextResponse.json(
          { error: "Invalid image type. Allowed: PNG, JPEG, WebP, GIF" },
          { status: 400 },
        );
      }

      // Decode base64 and upload
      const imageBuffer = Buffer.from(uploadedImage, "base64");

      // Validate size (max 5MB)
      if (imageBuffer.length > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Image must be less than 5MB" },
          { status: 400 },
        );
      }

      const extension = contentType.split("/")[1] || "png";
      const filename = `agents/${sanitizedName}-${timestamp}.${extension}`;

      const blob = await put(filename, imageBuffer, {
        access: "public",
        contentType,
      });

      return NextResponse.json({
        imageUrl: blob.url,
        prompt: null,
        uploaded: true,
      });
    }

    // For image generation, we need traits (unless using custom prompt)
    if (!customPrompt && !traits) {
      return NextResponse.json(
        { error: "Missing required fields: traits (or provide customPrompt)" },
        { status: 400 },
      );
    }

    // Use custom prompt or generate from traits
    const prompt = customPrompt || generateImagePrompt(name, traits!);

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
        { status: 500 },
      );
    }

    // Convert to Buffer for Vercel Blob upload
    // Use uint8Array if available (more efficient), otherwise decode from base64
    const imageBuffer = image.uint8Array
      ? Buffer.from(image.uint8Array)
      : Buffer.from(image.base64, "base64");

    const filename = `agents/${sanitizedName}-${timestamp}.png`;

    // Upload to Vercel Blob
    const blob = await put(filename, imageBuffer, {
      access: "public",
      contentType: "image/png",
    });

    return NextResponse.json({
      imageUrl: blob.url,
      prompt,
      uploaded: false,
    });
  } catch (error) {
    console.error("Error generating image:", error);

    // Handle rate limit errors
    if (error instanceof Error && error.message.includes("429")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 },
    );
  }
}
