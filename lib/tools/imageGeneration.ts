import { tool, generateImage } from "ai";
import { put } from "@vercel/blob";
import { z } from "zod";

/**
 * Image Generation Tool
 *
 * Uses AI SDK generateImage to create images from text prompts.
 * Works with AI Gateway image models.
 * Images are persisted to Vercel Blob storage lazily for durability.
 */

const generateImageSchema = z.object({
  prompt: z
    .string()
    .describe(
      "A detailed description of the image to generate. Be specific about style, colors, composition, and subject matter.",
    ),
  aspectRatio: z
    .enum(["1:1", "16:9", "9:16", "4:3", "3:4"])
    .default("1:1")
    .describe("Aspect ratio for the generated image"),
  style: z
    .enum(["vivid", "natural", "artistic", "photorealistic"])
    .optional()
    .describe("Optional style hint for the image generation"),
});

/**
 * Lazily upload image to Vercel Blob storage (fire-and-forget)
 * Returns immediately, upload happens in background
 */
async function persistImageToBlob(
  base64: string,
  prompt: string,
): Promise<string | null> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(base64, "base64");

    // Generate a unique filename based on timestamp and prompt hash
    const timestamp = Date.now();
    const promptSlug = prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 50);
    const filename = `generated-images/${timestamp}-${promptSlug}.png`;

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: "public",
      contentType: "image/png",
    });

    console.log("[Image Generation] Persisted to blob:", blob.url);
    return blob.url;
  } catch (error) {
    console.error("[Image Generation] Failed to persist to blob:", error);
    return null;
  }
}

/**
 * Generate an image from a text prompt
 *
 * Returns base64 encoded image data immediately for fast display,
 * then lazily persists to Vercel Blob storage in the background.
 */
export const generateImageTool = tool({
  description:
    "Generate an image from a text description. Use this when the user asks you to create, generate, draw, or make an image, picture, illustration, or artwork.",
  inputSchema: generateImageSchema,
  execute: async (input: z.infer<typeof generateImageSchema>) => {
    try {
      // Enhance the prompt based on style if provided
      let enhancedPrompt = input.prompt;
      if (input.style) {
        const styleEnhancements: Record<string, string> = {
          vivid: "vibrant colors, high contrast, dramatic lighting",
          natural: "realistic, natural lighting, true-to-life colors",
          artistic: "artistic, creative interpretation, expressive style",
          photorealistic:
            "photorealistic, highly detailed, professional photography quality",
        };
        enhancedPrompt = `${input.prompt}. Style: ${styleEnhancements[input.style]}`;
      }

      // Use AI Gateway's Black Forest Labs Flux model for high quality images
      // This model supports various aspect ratios and produces excellent results
      const result = await generateImage({
        model: "bfl/flux-pro-1.1",
        prompt: enhancedPrompt,
        aspectRatio: input.aspectRatio,
      });

      // Get the image data
      const image = result.image;
      const base64 = image.base64;

      // Persist to blob storage - we MUST use the URL to avoid context overflow
      // Base64 images are huge and will max out LLM context if included in results
      const blobUrl = await persistImageToBlob(base64, input.prompt);

      if (!blobUrl) {
        return {
          success: false,
          error: "Failed to save image to storage",
          prompt: input.prompt,
          suggestion:
            "Please try again. The image was generated but could not be saved.",
        };
      }

      // Return ONLY the URL (not base64) to keep context small
      // Frontend will load image from the blob URL
      return {
        success: true,
        image: {
          url: blobUrl,
          mediaType: "image/png",
        },
        prompt: input.prompt,
        enhancedPrompt,
        aspectRatio: input.aspectRatio,
      };
    } catch (error) {
      console.error("[Image Generation] Error:", error);

      // Return a friendly error message
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      return {
        success: false,
        error: errorMessage,
        prompt: input.prompt,
        suggestion:
          "Try rephrasing your prompt or check if the image generation service is available.",
      };
    }
  },
});

/**
 * All image generation tools bundled together
 */
export const imageGenerationTools = {
  generateImage: generateImageTool,
};
