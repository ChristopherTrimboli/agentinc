/**
 * Smoke test for @agent-inc/ai-sdk-provider
 *
 * Spins up a local mock server that mimics the OpenAI-compatible API,
 * then runs generateText + streamText through the provider to verify
 * the full SDK flow works end-to-end.
 *
 * Usage: bun scripts/test-provider.ts
 */

import { createAgentInc } from "../packages/ai-sdk-provider/src/index";
import { generateText, streamText } from "ai";
import { createServer, type IncomingMessage, type ServerResponse } from "http";

const MOCK_PORT = 9876;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk: Buffer) => (data += chunk.toString()));
    req.on("end", () => resolve(data));
  });
}

function createMockServer() {
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const rawBody = await readBody(req);
    const body = JSON.parse(rawBody);

    console.log(
      `  [mock] ${req.method} ${req.url} model=${body.model} stream=${body.stream ?? false}`,
    );

    const auth = req.headers["authorization"];
    if (auth !== "Bearer sk-ai_test-key") {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: { message: "Invalid API key", type: "auth_error" },
        }),
      );
      return;
    }

    if (body.stream) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      const chunks = ["Tiny ", "coins ", "fly ", "through ", "chains"];
      for (const chunk of chunks) {
        const payload = {
          id: "chatcmpl-test",
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: body.model,
          choices: [
            { index: 0, delta: { content: chunk }, finish_reason: null },
          ],
        };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      }

      const done = {
        id: "chatcmpl-test",
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: body.model,
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      };
      res.write(`data: ${JSON.stringify(done)}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: body.model,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content:
                  "Agent Inc. is a Web3 AI agent platform on Solana where users mint AI agents, launch tokens, and interact through micropayments.",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 12,
            completion_tokens: 28,
            total_tokens: 40,
          },
        }),
      );
    }
  });
}

async function main() {
  console.log("Starting mock OpenAI-compatible server...\n");

  const server = createMockServer();
  await new Promise<void>((resolve) =>
    server.listen(MOCK_PORT, () => resolve()),
  );

  const agentinc = createAgentInc({
    apiKey: "sk-ai_test-key",
    baseURL: `http://localhost:${MOCK_PORT}/v1`,
  });

  try {
    // ── Test 1: generateText ──────────────────────────────────────────
    console.log("── Test 1: generateText ──────────────────────");
    const { text, usage, finishReason } = await generateText({
      model: agentinc("anthropic/claude-haiku-4.6"),
      prompt: "What is Agent Inc?",
    });
    console.log("  Response:", text);
    console.log("  Usage:", usage);
    console.log("  Finish:", finishReason);
    assert(text.includes("Agent Inc"), "Response should mention Agent Inc");
    assert(finishReason === "stop", "Finish reason should be stop");
    console.log("  PASSED\n");

    // ── Test 2: streamText ────────────────────────────────────────────
    console.log("── Test 2: streamText ────────────────────────");
    const result = streamText({
      model: agentinc("anthropic/claude-haiku-4.6"),
      prompt: "Write about Solana.",
    });

    let streamed = "";
    process.stdout.write("  Response: ");
    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
      streamed += chunk;
    }
    console.log();
    console.log("  Finish:", await result.finishReason);
    assert(streamed.length > 0, "Streamed text should not be empty");
    assert(
      (await result.finishReason) === "stop",
      "Stream finish reason should be stop",
    );
    console.log("  PASSED\n");

    // ── Test 3: bad API key rejected ──────────────────────────────────
    console.log("── Test 3: invalid key rejected ──────────────");
    const badProvider = createAgentInc({
      apiKey: "sk-ai_bad-key",
      baseURL: `http://localhost:${MOCK_PORT}/v1`,
    });
    try {
      await generateText({
        model: badProvider("anthropic/claude-haiku-4.6"),
        prompt: "This should fail",
      });
      throw new Error("Should have thrown");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      assert(
        msg.includes("Invalid API key") || msg.includes("401"),
        "Should get auth error",
      );
      console.log("  Correctly rejected:", msg.slice(0, 80));
      console.log("  PASSED\n");
    }

    // ── Test 4: default model autocomplete types ──────────────────────
    console.log("── Test 4: type-level model hints ────────────");
    const _m1 = agentinc("anthropic/claude-haiku-4.6");
    const _m2 = agentinc("openai/gpt-5-mini");
    const _m3 = agentinc("google/gemini-2.5-flash");
    const _m4 = agentinc("custom/any-string-works");
    console.log("  All model IDs accepted at type level");
    console.log("  PASSED\n");

    console.log("All 4 tests passed.");
  } finally {
    server.close();
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

main();
