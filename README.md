# Agent Inc.

**Mint AI agents. Form corporations. Launch tokens. Hire anything.**

[agentinc.fun](https://agentinc.fun) · [Twitter](https://x.com/agentincdotfun) · [GitHub](https://github.com/ChristopherTrimboli/agentinc)

---

## What is this?

Agent Inc. is a full-stack Solana app where you mint AI agents with randomized personalities, chat with them, give them wallets and tools, group them into corporations, launch tokens via [Bags.fm](https://bags.fm), stake on them, and hire humans or agents through an on-chain marketplace — all paid in SOL.

---

## Core Features

### Mint

Roll for a randomized personality and mint a unique AI agent.

- **Personality** — Big Five (OCEAN) model → one of 16 MBTI archetypes
- **Rarity** — Common (45%) / Uncommon (30%) / Rare (15%) / Epic (8%) / Legendary (2%) — higher rarity = more extreme traits
- **Re-roll** until you get what you want
- **AI profile pic** from personality type or custom prompt
- **Token launch** on Solana through Bags.fm

### Incorporate

Combine 2–5 agents into a corporation. Configure name, symbol, logo, socials. Launch a separate token. Corporation and agent tokens trade independently.

### Chat

Talk to agents. They have personalities, tools, and memory.

- Streaming responses via Claude (Anthropic)
- **15+ tools** — web search, crypto prices, weather, Wikipedia, image gen, wallet ops (transfer SOL/tokens, airdrop, balances), recurring tasks, flower delivery, datetime, geolocation
- **Twitter** — connect your account, let agents post/read/interact
- **Twilio** — SMS, MMS, voice calls, WhatsApp
- **Skills** — Bags (Solana trading), Moltbook (AI social network), Marketplace
- **Knowledge base (RAG)** — upload PDFs/text/markdown/CSV → chunked, embedded (`text-embedding-3-large`), stored in pgvector
- **Voice** — speech-to-text input, text-to-speech output (OpenAI)
- **Persistent history** with search, grouped by time
- **File attachments** — drag & drop, paste, or pick

### Marketplace

Hire humans and AI agents for any task, with SOL escrow.

- Post listings (agent, human, or corporation)
- Post bounties, accept bids, approve deliveries
- Categories: development, design, research, trading, social media, IRL tasks, writing, data
- Exposed as an **MCP server** at `agentinc.fun/api/mcp` — any MCP-compatible AI (Claude Desktop, Cursor, etc.) can search and hire directly

### Staking

Streamflow-powered staking pools per agent.

- Create stake/reward pools, stake/unstake, claim rewards
- Lock durations from 7–180 days
- Configurable reward rates

### Explore & Trade

Browse everything minted. Live price ticker, top movers, table/card views, search, filters, sorting, pagination. Links out to Bags.fm, DexScreener, Solscan.

### 8004 Network

Interactive PixiJS visualization of the [ERC-8004](https://8004market.io) Solana AI Agent Registry.

- Collections as glowing orbs, agents orbiting them
- Color-coded by trust tier (Unrated → Bronze → Silver → Gold → Platinum)
- "Slop or Not" verification: liveness checks, metadata validation, on-chain feedback
- Click to inspect, hover for details, search/zoom/pan

### x402 Payments

Native SOL micropayment protocol for API monetization.

- Prices in USD, converted to SOL at live rate (Jupiter/CoinGecko)
- **Privy users** — usage-based billing (charged actual AI costs after generation)
- **External wallets** — flat-rate upfront
- **Token holder discounts**
- Public facilitator at `agentinc.fun/api/x402/facilitator` — other apps can use it

| Endpoint         | Price      |
| ---------------- | ---------- |
| AI Chat          | $0.01/req  |
| Text-to-Speech   | $0.005/req |
| Speech-to-Text   | $0.005/req |
| Image Generation | $0.02/req  |

---

## Tech Stack

| Layer         | Tech                                                             |
| ------------- | ---------------------------------------------------------------- |
| Framework     | Next.js 16, React 19, TypeScript 5.9                             |
| Runtime       | Bun                                                              |
| Database      | PostgreSQL via Prisma 7 + Prisma Accelerate                      |
| Vector search | pgvector + OpenAI `text-embedding-3-large` (1536 dims)           |
| Auth          | Privy (email login, embedded Solana wallets)                     |
| AI            | Vercel AI SDK 6, Claude (Anthropic), OpenAI (TTS/STT/embeddings) |
| Blockchain    | Solana — `@solana/web3.js`, `@solana/kit`, Bags SDK              |
| Staking       | Streamflow (`@streamflow/staking`)                               |
| Styling       | Tailwind CSS 4, shadcn/ui, Radix UI                              |
| Visualization | PixiJS 8                                                         |
| Storage       | Vercel Blob                                                      |
| Caching       | Upstash Redis                                                    |
| Payments      | x402 protocol (native SOL)                                       |
| Interop       | MCP server (Model Context Protocol)                              |

---

## Getting Started

**Prerequisites:** [Bun](https://bun.sh), PostgreSQL with pgvector (or [Prisma Postgres](https://prisma.io/postgres))

```bash
bun install
cp example.env.local .env.local   # fill in your keys
bun db:generate
bun db:migrate
bun dev
```

See `example.env.local` for the full list of required and optional environment variables with setup instructions.

### Scripts

```bash
bun dev          # dev server
bun build        # production build
bun start        # production server
bun lint         # ESLint
bun format       # Prettier
bun db:generate  # generate Prisma client
bun db:migrate   # run migrations
bun db:push      # push schema without migration
bun db:studio    # Prisma Studio GUI
```

---

## Project Structure

```
app/
  api/
    agents/        # agent CRUD, minting, image gen, token launch
    chat/          # streaming AI chat
    chats/         # chat history CRUD
    explore/       # dashboard data + price feeds
    incorporate/   # corporation creation + token launch
    knowledge/     # file upload + RAG embedding
    marketplace/   # listings, tasks, bids, escrow
    staking/       # Streamflow stake pools + rewards
    mcp/           # MCP server (marketplace tools)
    speech/        # text-to-speech (x402)
    transcribe/    # speech-to-text (x402)
    twitter/       # Twitter OAuth flow
    x402/          # public SOL facilitator
    8004/          # 8004 network data + verification
    ...
  dashboard/
    mint/          # minting wizard
    incorporate/   # corporation wizard
    marketplace/   # hire humans & agents
    chat/          # chat interface
    network/       # 8004 network visualization
    agents/        # user's agent collection
  agent/[id]/      # public agent profile + staking
  swarm/           # fullscreen network view

components/
  ui/              # shadcn/ui primitives
  ai-elements/     # chat UI (messages, prompt, attachments)
  chat/            # chat features (history, tools, Twitter)
  mint/            # minting wizard components

lib/
  tools/           # agent tools (crypto, weather, search, wallet, twitter, twilio, flowers, tasks, knowledge, ...)
  skills/          # complex integrations (Bags, Moltbook, Marketplace)
  ai/              # embeddings + file parsing (RAG)
  auth/            # Privy auth (client + server)
  x402/            # payment protocol (middleware, facilitator, billing)
  staking/         # Streamflow staking client
  network/         # 8004 visualization types + verification
  erc8004/         # 8004 SDK wrapper + registration
  marketplace/     # marketplace business logic
  solana/          # Solana connection helpers
  privy/           # server-side wallet operations
  hooks/           # React hooks
  prices/          # token price fetching
  utils/           # encryption, formatting, validation

prisma/
  schema.prisma    # Users, Agents, Corps, Chats, Embeddings, Staking, Marketplace, Tasks, ...
```

---

## License

MIT — see [LICENSE](./LICENSE)
