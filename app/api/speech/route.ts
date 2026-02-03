import { experimental_generateSpeech as generateSpeech } from "ai";
import { openai } from "@ai-sdk/openai";
import { getPrivyClient } from "@/lib/auth/verifyRequest";

// Allow up to 30 seconds for speech generation
export const maxDuration = 30;

// Available voices for OpenAI TTS
const AVAILABLE_VOICES = [
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
] as const;

type Voice = (typeof AVAILABLE_VOICES)[number];

export async function POST(req: Request) {
  // Verify authentication
  const idToken = req.headers.get("privy-id-token");

  if (!idToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const privy = getPrivyClient();
    await privy.users().get({ id_token: idToken });
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
    text,
    voice = "alloy",
    speed = 1.0,
  }: {
    text: string;
    voice?: Voice;
    speed?: number;
  } = requestBody;

  if (!text || typeof text !== "string") {
    return new Response(JSON.stringify({ error: "Text is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate text length (OpenAI has a limit of ~4096 characters)
  if (text.length > 4096) {
    return new Response(
      JSON.stringify({ error: "Text exceeds maximum length of 4096 characters" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate voice
  if (!AVAILABLE_VOICES.includes(voice)) {
    return new Response(
      JSON.stringify({
        error: `Invalid voice. Available voices: ${AVAILABLE_VOICES.join(", ")}`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Validate speed (0.25 to 4.0)
  if (speed < 0.25 || speed > 4.0) {
    return new Response(
      JSON.stringify({ error: "Speed must be between 0.25 and 4.0" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    console.log("[Speech API] Generating speech:", {
      textLength: text.length,
      voice,
      speed,
    });

    const { audio } = await generateSpeech({
      model: openai.speech("gpt-4o-mini-tts"),
      text,
      voice,
      speed,
    });

    console.log("[Speech API] Speech generated successfully");

    // Return the audio as a binary response with proper headers
    // Convert Uint8Array to Buffer for Response compatibility
    const buffer = Buffer.from(audio.uint8Array);
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": audio.mediaType || "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[Speech API] Error generating speech:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate speech",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// GET endpoint to list available voices
export async function GET(req: Request) {
  // Verify authentication
  const idToken = req.headers.get("privy-id-token");

  if (!idToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      voices: AVAILABLE_VOICES.map((voice) => ({
        id: voice,
        name: voice.charAt(0).toUpperCase() + voice.slice(1),
        description: getVoiceDescription(voice),
      })),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}

function getVoiceDescription(voice: Voice): string {
  const descriptions: Record<Voice, string> = {
    alloy: "Neutral and balanced",
    echo: "Warm and conversational",
    fable: "British and narrative",
    onyx: "Deep and authoritative",
    nova: "Friendly and upbeat",
    shimmer: "Clear and expressive",
  };
  return descriptions[voice];
}
