# Agent Inc.

**Mint AI agents. Form corporations. Launch tokens on Solana.**

[Website](https://agentinc.fun) | [Twitter](https://x.com/agentincdotfun) | [Discord](https://discord.gg/jTGebW3rkS) | [GitHub](https://github.com/ChristopherTrimboli/agentinc)

---

## What is this?

Agent Inc. is a platform where you mint AI agents with randomized personalities, chat with them, give them tools, group them into corporations, and launch tokens for all of it on Solana via [Bags.fm](https://bags.fm). Each agent gets a unique personality based on the Big Five (OCEAN) model, expressed as one of 16 MBTI types, plus a rarity tier that influences personality distribution -- then you can deploy it as a tradeable token.

Think of it as character creation meets token launcher meets AI chat, all in one app.

---

## Features

### Mint Agents

Roll for randomized personalities and mint unique AI agents.

- **Rarity tiers** -- Common (45%), Uncommon (30%), Rare (15%), Epic (8%), Legendary (2%)
- **Personality system** -- Big Five (OCEAN) model with 5 dimensions: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
- **MBTI types** -- 16 personality archetypes derived from Big Five scores (INTJ, ENFP, ISTJ, etc.)
- **Rarity-based distribution** -- Higher rarity agents have more extreme, specialized personality profiles
- **Re-roll system** -- Re-roll personality scores until you get the agent you want
- **AI image generation** -- Generate a profile pic from personality type or a custom prompt
- **Token launch** -- Deploy an agent token on Solana through Bags.fm

### Incorporate

Combine agents into a corporation and launch a separate token for the group.

- Select 1-5 minted agents as your team
- Configure a corporation token (name, symbol, logo, socials)
- Launch with an initial buy amount
- Corporation and agent tokens are independently tradeable

### Chat

Talk to your agents. They have personalities and can use tools.

- **Streaming responses** via Claude (Anthropic)
- **10+ built-in tools** -- web search, crypto prices, weather, Wikipedia, image generation, datetime, geolocation
- **Twitter integration** -- Connect your Twitter account, let agents post/read/interact
- **Twilio integration** -- SMS, MMS, voice calls, WhatsApp
- **Skills** -- Plug in external integrations (Bags trading, Moltbook social network)
- **Knowledge base (RAG)** -- Upload PDFs, text, markdown, or CSV files. Content gets chunked, embedded with OpenAI `text-embedding-3-large`, stored in pgvector, and used for context-aware answers
- **Voice I/O** -- Speech-to-text input and text-to-speech output (OpenAI)
- **Chat history** -- Persistent conversations with search, grouped by time
- **File attachments** -- Drag & drop, paste, or pick files

### Explore & Trade

Browse everything that's been minted.

- Live price ticker with top movers
- Table and card views with search, filters, sorting, pagination
- Real-time prices, 24h change, market cap, volume, and lifetime earnings
- Direct links to Bags.fm, DexScreener, and Solscan

### Swarm Network

Interactive physics-based visualization of agents and corporations.

- Agents orbit their corporation nodes
- Real-time event streaming via SSE
- Click to inspect, hover for details
- Runs on PixiJS

### x402 Payments

Native SOL micropayment protocol for API monetization.

- Prices set in USD, converted to SOL at live market rate (Jupiter/CoinGecko)
- Privy users get usage-based billing (charged actual AI costs after generation)
- External users pay flat-rate upfront
- Public facilitator at `https://agentinc.fun/api/x402/facilitator` -- other apps can use it

**Current pricing:**

| Endpoint         | Price      |
| ---------------- | ---------- |
| AI Chat          | $0.01/req  |
| Text-to-Speech   | $0.005/req |
| Speech-to-Text   | $0.005/req |
| Image Generation | $0.02/req  |

---

## Tech Stack

| Layer         | Tech                                                           |
| ------------- | -------------------------------------------------------------- |
| Framework     | Next.js 16, React 19, TypeScript                               |
| Database      | PostgreSQL via Prisma (Prisma Accelerate)                      |
| Vector search | pgvector + OpenAI `text-embedding-3-large`                     |
| Auth          | Privy (embedded Solana wallets + social login)                 |
| AI            | Vercel AI SDK, Claude (Anthropic), OpenAI (TTS/STT/embeddings) |
| Blockchain    | Solana via Bags SDK, @solana/web3.js                           |
| Styling       | Tailwind CSS 4, Radix UI primitives                            |
| Visualization | PixiJS 8                                                       |
| Storage       | Vercel Blob                                                    |
| Caching       | Upstash Redis (rate limiting, auth, price caching)             |
| Payments      | x402 protocol (native SOL)                                     |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) runtime
- PostgreSQL with pgvector extension (or Prisma Postgres)
- API keys (see below)

### Install

```bash
bun install
cp example.env.local .env.local   # then fill in your keys
bun db:generate
bun db:migrate
bun dev
```

### Environment Variables

Copy `example.env.local` to `.env.local`. Here's what you need:

**Required:**

| Variable                     | What it does                            |
| ---------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_PRIVY_APP_ID`   | Privy app ID                            |
| `PRIVY_APP_SECRET`           | Privy app secret                        |
| `DATABASE_URL`               | PostgreSQL connection string            |
| `AI_GATEWAY_API_KEY`         | AI Gateway key (chat, tools, billing)   |
| `BAGS_API_KEY`               | Bags SDK key for token launches         |
| `BAGS_PARTNER_KEY`           | Bags partner key                        |
| `BAGS_PARTNER_WALLET`        | Bags partner wallet address             |
| `BLOB_READ_WRITE_TOKEN`      | Vercel Blob storage token               |
| `SOLANA_RPC_URL`             | Solana RPC (server-side)                |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Solana RPC (client-side)                |
| `ENCRYPTION_KEY`             | 64 hex chars for AES-256-GCM encryption |

**Server signer (x402 auto-payments):**

| Variable                                  | What it does                       |
| ----------------------------------------- | ---------------------------------- |
| `PRIVY_AUTHORIZATION_PRIVATE_KEY`         | P-256 PKCS8 private key (base64)   |
| `PRIVY_SIGNER_KEY_QUORUM_ID`              | Key quorum ID from Privy dashboard |
| `NEXT_PUBLIC_SERVER_SIGNER_KEY_QUORUM_ID` | Same quorum ID (public)            |

**Optional:**

| Variable                 | What it does                                   |
| ------------------------ | ---------------------------------------------- |
| `OPENAI_API_KEY`         | OpenAI for TTS, STT, and embeddings            |
| `TWITTER_CLIENT_ID`      | Twitter OAuth 2.0 client ID                    |
| `TWITTER_CLIENT_SECRET`  | Twitter OAuth 2.0 client secret                |
| `TWILIO_ACCOUNT_SID`     | Twilio account SID                             |
| `TWILIO_AUTH_TOKEN`      | Twilio auth token                              |
| `TWILIO_PHONE_NUMBER`    | Twilio phone number                            |
| `TWILIO_WHATSAPP_NUMBER` | WhatsApp Business number                       |
| `X402_TREASURY_ADDRESS`  | SOL wallet to receive x402 payments            |
| `SOLANA_NETWORK`         | `mainnet` or `devnet` (auto-detected if unset) |

---

## Project Structure

```
agentinc/
├── app/
│   ├── api/
│   │   ├── agents/           # Agent CRUD, minting, skills, image gen
│   │   ├── chat/             # Streaming AI chat endpoint
│   │   ├── chats/            # Chat history CRUD
│   │   ├── explore/          # Dashboard data + price feeds
│   │   ├── incorporate/      # Corporation creation + token launch
│   │   ├── knowledge/        # File upload + RAG embedding
│   │   ├── price/            # Single token price lookup
│   │   ├── skills/           # Available skills list
│   │   ├── solana/           # Transaction send + blockhash
│   │   ├── speech/           # Text-to-speech (x402)
│   │   ├── swarm/            # Swarm agents, corps, SSE events
│   │   ├── tools/            # Available tools list
│   │   ├── transcribe/       # Speech-to-text (x402)
│   │   ├── twitter/          # Twitter OAuth flow
│   │   ├── users/            # User sync + signer status
│   │   └── x402/             # Public SOL facilitator
│   ├── dashboard/
│   │   ├── agents/           # User's agent collection
│   │   ├── chat/             # Chat interface
│   │   ├── incorporate/      # Corporation wizard
│   │   ├── mint/             # Minting wizard
│   │   ├── network/          # Swarm visualization
│   │   └── page.tsx          # Explore view (root dashboard)
│   ├── agent/[id]/           # Public agent profile
│   ├── incorporate/          # Public incorporate page
│   ├── swarm/                # Fullscreen swarm view
│   └── tokenomics/           # Tokenomics page
├── components/
│   ├── ai-elements/          # Chat UI (messages, prompt input, attachments)
│   ├── chat/                 # Chat features (history, tool panel, Twitter auth)
│   ├── mint/                 # Minting wizard components
│   └── ui/                   # Shared Radix UI primitives
├── lib/
│   ├── agentTraits.ts        # Personality system (Big Five + MBTI), rarity, name generation
│   ├── ai/                   # Embeddings + file parsing (RAG)
│   ├── auth/                 # Privy auth (client + server verification)
│   ├── constants/            # URLs, Solana config, mint settings
│   ├── hooks/                # useAuthFetch, useMintAgent, voice hooks
│   ├── prices/               # DexScreener + Bags.fm price fetching
│   ├── privy/                # Server-side wallet operations
│   ├── rateLimit.ts          # Upstash rate limiting (user + IP)
│   ├── redis.ts              # Redis client + caching helpers
│   ├── skills/               # Skill system (Bags, Moltbook)
│   ├── solana/               # Solana connection helpers
│   ├── swarm/                # Swarm state, physics, event bus
│   ├── tools/                # Agent tools (crypto, weather, search, etc.)
│   ├── utils/                # Encryption, formatting, rarity colors, validation
│   └── x402/                 # Payment protocol (middleware, facilitator, billing)
└── prisma/
    └── schema.prisma         # Users, Agents, Corps, Chats, Embeddings, Swarm
```

---

## Scripts

```bash
bun dev          # Dev server
bun build        # Production build
bun start        # Production server
bun lint         # ESLint
bun format       # Prettier
bun db:generate  # Generate Prisma client
bun db:migrate   # Run migrations
bun db:push      # Push schema (no migration)
bun db:studio    # Prisma Studio GUI
```

---

## Agent Personality System

Agents use the **Big Five (OCEAN)** personality model with scores that derive one of 16 **MBTI personality types**.

### Big Five Dimensions

Each agent has five personality scores (0-100):

| Dimension                 | Low End      | High End    | What it affects                                 |
| ------------------------- | ------------ | ----------- | ----------------------------------------------- |
| **Openness (O)**          | Conventional | Inventive   | Imagination, creativity, intellectual curiosity |
| **Conscientiousness (C)** | Spontaneous  | Disciplined | Organization, reliability, planning             |
| **Extraversion (E)**      | Reserved     | Outgoing    | Social energy, assertiveness, enthusiasm        |
| **Agreeableness (A)**     | Skeptical    | Trusting    | Cooperation, empathy, warmth                    |
| **Neuroticism (N)**       | Resilient    | Reactive    | Emotional reactivity, anxiety, stress response  |

### MBTI Personality Types

Big Five scores map to one of 16 MBTI archetypes:

| Type     | Name             | Description                                       |
| -------- | ---------------- | ------------------------------------------------- |
| **INTJ** | The Architect    | Strategic, independent, analytical mastermind     |
| **INTP** | The Logician     | Innovative, curious, logical theorist             |
| **ENTJ** | The Commander    | Bold, strategic, natural-born leader              |
| **ENTP** | The Debater      | Smart, curious, intellectual challenger           |
| **INFJ** | The Advocate     | Insightful, principled, compassionate visionary   |
| **INFP** | The Mediator     | Idealistic, empathetic, creative dreamer          |
| **ENFJ** | The Protagonist  | Charismatic, inspiring, natural mentor            |
| **ENFP** | The Campaigner   | Enthusiastic, creative, sociable free spirit      |
| **ISTJ** | The Logistician  | Practical, reliable, duty-bound organizer         |
| **ISFJ** | The Defender     | Dedicated, warm, protective guardian              |
| **ESTJ** | The Executive    | Organized, dedicated, strong-willed administrator |
| **ESFJ** | The Consul       | Caring, social, popular helper                    |
| **ISTP** | The Virtuoso     | Bold, practical, master of tools                  |
| **ISFP** | The Adventurer   | Flexible, charming, creative artist               |
| **ESTP** | The Entrepreneur | Smart, energetic, perceptive risk-taker           |
| **ESFP** | The Entertainer  | Spontaneous, enthusiastic, entertaining performer |

### Rarity Impact on Personality

Rarity affects personality distribution using beta distribution:

| Rarity        | Drop Rate | Personality Distribution                                   |
| ------------- | --------- | ---------------------------------------------------------- |
| **Common**    | 45%       | Balanced (35-65 range) — unremarkable, middle-of-the-road  |
| **Uncommon**  | 30%       | Wider spread (25-75 range) — noticeable quirks             |
| **Rare**      | 15%       | Peaks and valleys — distinct personality traits            |
| **Epic**      | 8%        | Polarized — dramatic, extreme traits                       |
| **Legendary** | 2%        | Min/max specialists — hyper-focused on specific dimensions |

Higher rarity agents have more extreme personality profiles, making them more distinctive and specialized in their behavior patterns.

---

## Agent Tools

Built-in tools that agents can use during chat:

| Tool             | What it does                             |
| ---------------- | ---------------------------------------- |
| Web Search       | Real-time web search                     |
| Crypto           | Prices, trending, market data, DEX pools |
| Weather          | Current conditions + forecasts           |
| Wikipedia        | Article summaries + search               |
| Image Generation | AI image creation                        |
| DateTime         | Timezone conversion, date math           |
| Geolocation      | IP-based location lookup                 |
| Twitter/X        | Post, read, interact (requires OAuth)    |
| Twilio           | SMS, MMS, voice calls, WhatsApp          |
| Knowledge Base   | Add, search, and remove RAG documents    |

**Skills** (external integrations):

- **Bags** -- Solana launchpad (trading, token launches, fee claiming)
- **Moltbook** -- Social network for AI agents (posts, communities, semantic search)

---

## License

MIT -- see [LICENSE](./LICENSE)
