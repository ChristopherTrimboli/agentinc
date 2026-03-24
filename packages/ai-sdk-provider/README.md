# @agent-inc/ai-sdk-provider

[![npm version](https://img.shields.io/npm/v/@agent-inc/ai-sdk-provider.svg)](https://www.npmjs.com/package/@agent-inc/ai-sdk-provider)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@agent-inc/ai-sdk-provider)](https://bundlephobia.com/package/@agent-inc/ai-sdk-provider)
[![license](https://img.shields.io/npm/l/@agent-inc/ai-sdk-provider)](https://github.com/ChristopherTrimboli/agentinc/blob/main/LICENSE)

[Vercel AI SDK](https://sdk.vercel.ai) provider for [Agent Inc.](https://agentinc.fun) — access **Claude, GPT, Gemini, DeepSeek, Grok** and 30+ models through a single provider. Pay with an API key or trustless per-request SOL micropayments via the [x402](https://github.com/anthropics/x402) protocol on Solana.

## Installation

```bash
npm install @agent-inc/ai-sdk-provider
# or
pnpm add @agent-inc/ai-sdk-provider
# or
bun add @agent-inc/ai-sdk-provider
```

For x402 SOL payment mode (optional):

```bash
npm install @agent-inc/ai-sdk-provider @solana/kit
```

## Quick Start

### API Key Mode

The simplest way to get started. Pass your API key directly or set the `AGENTINC_API_KEY` environment variable.

```typescript
import { createAgentInc } from "@agent-inc/ai-sdk-provider";
import { generateText } from "ai";

const agentinc = createAgentInc({
  apiKey: process.env.AGENTINC_API_KEY,
});

const { text } = await generateText({
  model: agentinc("anthropic/claude-sonnet-4"),
  prompt: "What is Agent Inc.?",
});
```

Or use the default instance which reads from the `AGENTINC_API_KEY` env var:

```typescript
import { agentinc } from "@agent-inc/ai-sdk-provider";
import { streamText } from "ai";

const result = streamText({
  model: agentinc("anthropic/claude-sonnet-4"),
  prompt: "Explain the x402 payment protocol",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### x402 SOL Payment Mode

Trustless, per-request micropayments on Solana. No API key needed — pay directly from your wallet for each inference call.

```typescript
import { createAgentInc } from "@agent-inc/ai-sdk-provider";
import { generateText } from "ai";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// Load your Solana keypair (64 bytes: 32 private + 32 public)
const keypair = new Uint8Array(
  JSON.parse(readFileSync(join(homedir(), ".config/solana/id.json"), "utf-8")),
);

const agentinc = createAgentInc({
  solanaSecretKey: keypair,
  solanaNetwork: "solana-devnet", // Use "solana" for mainnet
});

const { text } = await generateText({
  model: agentinc("openai/gpt-5-mini"),
  prompt: "How do Solana micropayments work?",
});
```

**How x402 works under the hood:**

1. The provider sends your request to the AgentInc API
2. The server responds with HTTP 402 and SOL payment requirements
3. The provider automatically builds a SOL transfer transaction, signs it with your keypair, and retries with the payment attached
4. The server verifies and settles the payment on-chain, then streams the AI response

## Supported Models

All models on the [Vercel AI Gateway](https://sdk.vercel.ai/models) are supported. Popular picks:

| Model ID                      | Price (in / out per 1M tokens) |
| ----------------------------- | ------------------------------ |
| `anthropic/claude-haiku-4.6`  | Fast, cost-efficient (default) |
| `anthropic/claude-sonnet-4.6` | Balanced                       |
| `anthropic/claude-opus-4.6`   | Highest capability             |
| `openai/gpt-5-nano`           | $0.05 / $0.40                  |
| `openai/gpt-5-mini`           | $0.25 / $2.00                  |
| `openai/gpt-5.4`              | $2.50 / $15.00                 |
| `google/gemini-2.5-flash`     | $0.30 / $2.50                  |
| `google/gemini-2.5-pro`       | $1.25 / $10.00                 |
| `deepseek/deepseek-v3.2`      | $0.28 / $0.42                  |
| `xai/grok-4-fast-reasoning`   | $0.20 / $0.50                  |

Any `provider/model` string is accepted — the type hints provide autocomplete, not restrictions.

Embedding models:

| Model ID                        | Description         |
| ------------------------------- | ------------------- |
| `openai/text-embedding-3-large` | 1536-dim embeddings |
| `openai/text-embedding-3-small` | 512-dim embeddings  |

## Configuration

```typescript
import { createAgentInc } from "@agent-inc/ai-sdk-provider";

const agentinc = createAgentInc({
  // API key auth (reads AGENTINC_API_KEY env var if omitted)
  apiKey: "sk-...",

  // Custom API base URL
  baseURL: "https://agentinc.fun/api/v1",

  // Extra headers for all requests
  headers: { "X-Custom": "value" },

  // x402 SOL payment options (alternative to apiKey)
  solanaSecretKey: keypairBytes, // 64-byte Uint8Array
  solanaNetwork: "solana", // "solana" | "solana-devnet"
  solanaRpcUrl: "https://my-rpc.com", // Custom RPC endpoint
});
```

## Embeddings

```typescript
import { createAgentInc } from "@agent-inc/ai-sdk-provider";
import { embed } from "ai";

const agentinc = createAgentInc();

const { embedding } = await embed({
  model: agentinc.embeddingModel("openai/text-embedding-3-large"),
  value: "What is the meaning of life?",
});
```

## Environment Variables

| Variable           | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `AGENTINC_API_KEY` | API key for bearer token auth (used by default instance) |

## Links

- [Agent Inc.](https://agentinc.fun)
- [x402 Protocol](https://github.com/anthropics/x402)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [Solana Kit](https://solanakit.org)

## License

MIT
