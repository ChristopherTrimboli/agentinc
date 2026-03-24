/**
 * OpenAI-Compatible Chat Completions Endpoint
 *
 * Public API for the @agent-inc/ai-sdk-provider NPM package.
 * Accepts standard OpenAI chat completion requests and returns
 * OpenAI-format responses (both streaming SSE and non-streaming JSON).
 *
 * Authentication:
 * - Bearer token via Authorization header (API key mode)
 * - x402 native SOL payment via X-PAYMENT header
 */

import { NextRequest, NextResponse } from "next/server";
import { streamText, generateText, type ModelMessage } from "ai";
import { rateLimitByIP, rateLimitByUser } from "@/lib/rateLimit";
import { withSolPayment, isSolPaymentEnabled } from "@/lib/x402/sol-middleware";
import { calculateCost } from "@/lib/x402/ai-gateway-cost";
import { validateApiKey } from "@/lib/auth/validateApiKey";
import { nanoid } from "nanoid";

export const maxDuration = 120;

const DEFAULT_MODEL = "anthropic/claude-haiku-4.6";

// ── OpenAI types (subset we support) ────────────────────────────────────

interface OpenAIChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAIChatRequest {
  model?: string;
  messages: OpenAIChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stop?: string | string[];
}

// ── Helpers ─────────────────────────────────────────────────────────────

function convertToModelMessages(messages: OpenAIChatMessage[]): ModelMessage[] {
  return messages.map((msg) => {
    if (msg.role === "system") {
      return { role: "system" as const, content: msg.content };
    }
    if (msg.role === "assistant") {
      return {
        role: "assistant" as const,
        content: [{ type: "text" as const, text: msg.content }],
      };
    }
    return {
      role: "user" as const,
      content: [{ type: "text" as const, text: msg.content }],
    };
  });
}

function extractBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

function hasX402Payment(req: NextRequest): boolean {
  return !!(
    req.headers.get("X-PAYMENT") || req.headers.get("PAYMENT-SIGNATURE")
  );
}

// ── OpenAI SSE streaming encoder ────────────────────────────────────────

function createOpenAIStream(
  textStream: AsyncIterable<string>,
  completionId: string,
  model: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of textStream) {
          const payload = {
            id: completionId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [
              {
                index: 0,
                delta: { content: chunk },
                finish_reason: null,
              },
            ],
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        }

        // Final chunk with finish_reason
        const donePayload = {
          id: completionId,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: "stop",
            },
          ],
        };
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(donePayload)}\n\n`),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

// ── Route handler ───────────────────────────────────────────────────────

async function completionsHandler(req: NextRequest): Promise<Response> {
  // Auth: bearer token (DB-backed) OR x402 payment (validated by middleware wrapper)
  const bearerToken = extractBearerToken(req);
  const hasPayment = hasX402Payment(req);

  if (!bearerToken && !hasPayment) {
    return NextResponse.json(
      {
        error: {
          message:
            "Missing authentication. Provide an API key via Authorization header or x402 payment via X-PAYMENT header.",
          type: "auth_error",
        },
      },
      { status: 401 },
    );
  }

  let authenticatedUserId: string | null = null;

  if (bearerToken) {
    const keyResult = await validateApiKey(bearerToken);
    if (!keyResult.valid) {
      return NextResponse.json(
        { error: { message: keyResult.error, type: "auth_error" } },
        { status: keyResult.status },
      );
    }
    authenticatedUserId = keyResult.userId;
  }

  // Rate limit by authenticated user when available, fall back to IP for x402
  const rateLimited = authenticatedUserId
    ? await rateLimitByUser(authenticatedUserId, "v1-completions", 60)
    : await rateLimitByIP(req, "v1-completions", 60);
  if (rateLimited) return rateLimited;

  // Parse request body
  let body: OpenAIChatRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        error: { message: "Invalid JSON body", type: "invalid_request_error" },
      },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      {
        error: {
          message: "messages is required and must be a non-empty array",
          type: "invalid_request_error",
        },
      },
      { status: 400 },
    );
  }

  const model = body.model?.trim() || DEFAULT_MODEL;

  const modelMessages = convertToModelMessages(body.messages);
  const completionId = `chatcmpl-${nanoid(24)}`;

  try {
    if (body.stream) {
      // ── Streaming response ──────────────────────────────────────────
      const result = streamText({
        model,
        messages: modelMessages,
        temperature: body.temperature,
        maxOutputTokens: body.max_tokens,
        topP: body.top_p,
        stopSequences: body.stop
          ? Array.isArray(body.stop)
            ? body.stop
            : [body.stop]
          : undefined,
        onFinish: async ({ usage }) => {
          const cost = await calculateCost(model, {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
          });
          if (cost) {
            console.log(
              `[v1/completions] ${model} — ${usage.totalTokens ?? 0} tokens — $${cost.totalCost.toFixed(6)}`,
            );
          }
        },
      });

      const stream = createOpenAIStream(result.textStream, completionId, model);

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ── Non-streaming response ────────────────────────────────────────
    const result = await generateText({
      model,
      messages: modelMessages,
      temperature: body.temperature,
      maxOutputTokens: body.max_tokens,
      topP: body.top_p,
      stopSequences: body.stop
        ? Array.isArray(body.stop)
          ? body.stop
          : [body.stop]
        : undefined,
    });

    const cost = await calculateCost(model, {
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    });
    if (cost) {
      console.log(
        `[v1/completions] ${model} — ${result.usage.totalTokens ?? 0} tokens — $${cost.totalCost.toFixed(6)}`,
      );
    }

    return NextResponse.json({
      id: completionId,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: result.text,
          },
          finish_reason: result.finishReason === "stop" ? "stop" : "length",
        },
      ],
      usage: {
        prompt_tokens: result.usage.inputTokens,
        completion_tokens: result.usage.outputTokens,
        total_tokens:
          (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0),
      },
    });
  } catch (error) {
    console.error("[v1/completions] Generation error:", error);
    return NextResponse.json(
      {
        error: {
          message: "An error occurred during generation",
          type: "server_error",
        },
      },
      { status: 500 },
    );
  }
}

// Bearer API keys bypass x402 payment. If no bearer token, fall through to x402 middleware.
const x402Handler = isSolPaymentEnabled()
  ? withSolPayment(completionsHandler, "chat")
  : completionsHandler;

export async function POST(req: NextRequest): Promise<Response> {
  const bearer = req.headers.get("authorization");
  if (bearer?.startsWith("Bearer sk-ai_")) {
    return completionsHandler(req);
  }
  return x402Handler(req);
}
