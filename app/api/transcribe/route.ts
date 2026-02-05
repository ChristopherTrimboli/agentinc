import { experimental_transcribe as transcribe } from "ai";
import { openai } from "@ai-sdk/openai";
import { getPrivyClient } from "@/lib/auth/verifyRequest";
import { withServerSolPayment, isServerSolPaymentEnabled } from "@/lib/x402";
import { rateLimitByUser } from "@/lib/rateLimit";

// Allow up to 60 seconds for transcription
export const maxDuration = 60;

// Supported audio formats
const SUPPORTED_FORMATS = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/m4a",
];

async function transcribeHandler(req: Request) {
  // Verify authentication
  const idToken = req.headers.get("privy-id-token");

  if (!idToken) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let privyUserId: string;
  try {
    const privy = getPrivyClient();
    const privyUser = await privy.users().get({ id_token: idToken });
    privyUserId = privyUser.id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Rate limit: 20 transcription requests per minute per user
  const rateLimited = rateLimitByUser(privyUserId, "transcribe", 20);
  if (rateLimited) return rateLimited;

  try {
    const contentType = req.headers.get("content-type") || "";

    let audioData: ArrayBuffer;
    let audioType: string;

    // Handle both FormData and raw binary
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audioFile = formData.get("audio") as File | null;

      if (!audioFile) {
        return new Response(
          JSON.stringify({ error: "No audio file provided" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      audioData = await audioFile.arrayBuffer();
      audioType = audioFile.type;
    } else {
      // Handle raw binary data
      audioData = await req.arrayBuffer();
      audioType = contentType.split(";")[0] || "audio/webm";
    }

    // Validate audio format
    const normalizedType = audioType.toLowerCase();
    const isSupported = SUPPORTED_FORMATS.some(
      (format) =>
        normalizedType.includes(format) ||
        normalizedType.includes(format.split("/")[1]),
    );

    if (!isSupported && audioData.byteLength > 0) {
      console.log(
        "[Transcribe API] Audio type:",
        audioType,
        "- allowing anyway",
      );
    }

    // Check file size (max 25MB for Whisper)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioData.byteLength > maxSize) {
      return new Response(
        JSON.stringify({
          error: "Audio file too large. Maximum size is 25MB.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (audioData.byteLength === 0) {
      return new Response(JSON.stringify({ error: "Empty audio file" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[Transcribe API] Transcribing audio:", {
      size: audioData.byteLength,
      type: audioType,
    });

    const result = await transcribe({
      model: openai.transcription("gpt-4o-mini-transcribe"),
      audio: new Uint8Array(audioData),
    });

    console.log("[Transcribe API] Transcription complete:", {
      textLength: result.text.length,
      language: result.language,
      duration: result.durationInSeconds,
    });

    return new Response(
      JSON.stringify({
        text: result.text,
        language: result.language,
        durationInSeconds: result.durationInSeconds,
        segments: result.segments,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[Transcribe API] Error transcribing audio:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to transcribe audio",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Export POST with server-side x402 payment wrapper if enabled
export const POST = isServerSolPaymentEnabled()
  ? withServerSolPayment(transcribeHandler, "transcribe")
  : transcribeHandler;
