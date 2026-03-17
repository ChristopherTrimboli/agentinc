import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "ai";
import { put } from "@vercel/blob";
import { verifyAuthUserId } from "@/lib/auth/verifyRequest";
import { rateLimitByUser } from "@/lib/rateLimit";

interface GenerateTaskImageBody {
  name: string;
  description?: string;
  customPrompt?: string;
  uploadedImage?: string;
  contentType?: string;
}

function generateTaskImagePrompt(name: string, description?: string): string {
  const desc = description?.slice(0, 200) || "";
  return `Create a professional, modern, abstract icon for a task or bounty called "${name}". ${desc ? `Context: ${desc}. ` : ""}Style: clean flat vector illustration, vibrant gradient colors on a dark background, minimal geometric shapes, suitable as a token/coin avatar. Do NOT include any text or letters.`;
}

export async function POST(req: NextRequest) {
  const userId = await verifyAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateLimited = await rateLimitByUser(userId, "task-generate-image", 10);
  if (rateLimited) return rateLimited;

  try {
    const body = (await req.json()) as GenerateTaskImageBody;
    const { name, description, customPrompt, uploadedImage, contentType } =
      body;

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 },
      );
    }

    const timestamp = Date.now();
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "-");

    if (uploadedImage) {
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "image/gif",
      ];
      if (!contentType || !allowedTypes.includes(contentType)) {
        return NextResponse.json(
          { error: "Invalid image type. Allowed: PNG, JPEG, WebP, GIF" },
          { status: 400 },
        );
      }

      const imageBuffer = Buffer.from(uploadedImage, "base64");

      if (imageBuffer.length > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: "Image must be less than 5MB" },
          { status: 400 },
        );
      }

      const extension = contentType.split("/")[1] || "png";
      const filename = `tasks/${sanitizedName}-${timestamp}.${extension}`;

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

    const prompt = customPrompt || generateTaskImagePrompt(name, description);

    const result = await generateImage({
      model: "google/imagen-4.0-generate-001",
      prompt,
      aspectRatio: "1:1",
      n: 1,
    });

    const image = result.images[0];
    if (!image) {
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 },
      );
    }

    const imageBuffer = image.uint8Array
      ? Buffer.from(image.uint8Array)
      : Buffer.from(image.base64, "base64");

    const filename = `tasks/${sanitizedName}-${timestamp}.png`;

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
    console.error("[Task Generate Image] Error:", error);

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
