# Agent Inc.

**Mint AI agents, form corporations, and launch tokens on Solana.**

## Overview

Agent Inc. is a platform for creating, trading, and interacting with AI agents on Solana. Users can mint unique AI agents with randomized traits, form corporations by combining agents, and launch tradeable tokens for both - all powered by the [Bags SDK](https://bags.fm).

## Features

### Mint AI Agents

- **Randomize Traits** - Roll for unique personalities, skills, tools, and special abilities
- **Rarity System** - Agents have rarity tiers (Common, Uncommon, Rare, Epic, Legendary)
- **AI-Generated Images** - Generate unique profile pictures for your agents
- **Launch Tokens** - Deploy agent tokens on Solana via Bags.fm

### Incorporate Corporations

- **Form Teams** - Combine 2-5 minted agents into a corporation
- **Corporation Tokens** - Launch a separate token representing the corporation
- **Executive Teams** - Build AI companies with specialized agent roles

### Chat with Agents

- **Custom Personalities** - Each agent has a unique system prompt and persona
- **Streaming Responses** - Real-time chat powered by Claude (Anthropic)
- **Skills Integration** - Agents can be equipped with external tool integrations

### Explore & Trade

- **Live Dashboard** - Browse all minted agents and corporations
- **Price Tracking** - Real-time price data, market cap, and volume
- **Token Links** - Direct links to Bags.fm and DexScreener for trading

### Swarm Visualization

- **Interactive Network** - Physics-based visualization of agents and corporations
- **Real-time Events** - Watch agent activity and connections

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript
- **Database**: Prisma with PostgreSQL (Prisma Accelerate)
- **Auth**: Privy (embedded Solana wallets)
- **Blockchain**: Solana via Bags SDK
- **AI**: Vercel AI SDK with Claude (Anthropic)
- **Styling**: Tailwind CSS 4
- **Visualization**: PixiJS
- **Storage**: Vercel Blob

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) runtime
- PostgreSQL database (or Prisma Postgres)
- API keys (see Environment Variables)

### Installation

```bash
# Install dependencies
bun install

# Set up environment variables
cp example.env.local .env.local

# Generate Prisma client
bun db:generate

# Run database migrations
bun db:migrate

# Start development server
bun dev
```

### Environment Variables

Copy `example.env` to `.env.local` and configure:

| Variable                   | Description                         |
| -------------------------- | ----------------------------------- |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy app ID for authentication     |
| `PRIVY_APP_SECRET`         | Privy app secret                    |
| `DATABASE_URL`             | PostgreSQL connection string        |
| `AI_GATEWAY_API_KEY`       | AI Gateway API key for Claude       |
| `BAGS_API_KEY`             | Bags SDK API key for token launches |
| `BAGS_PARTNER_KEY`         | Bags partner key                    |
| `BAGS_PARTNER_WALLET`      | Bags partner wallet address         |
| `BLOB_READ_WRITE_TOKEN`    | Vercel Blob storage token           |
| `SOLANA_RPC_URL`           | Solana RPC endpoint                 |

## Project Structure

```
agentinc/
├── app/
│   ├── api/              # API routes
│   │   ├── agents/       # Agent CRUD & minting
│   │   ├── chat/         # AI chat endpoint
│   │   ├── explore/      # Dashboard data
│   │   ├── incorporate/  # Corporation creation
│   │   └── swarm/        # Swarm visualization data
│   ├── dashboard/        # Main app pages
│   │   ├── mint/         # Agent minting wizard
│   │   ├── incorporate/  # Corporation creation
│   │   ├── chat/         # Agent chat interface
│   │   └── network/      # Swarm visualization
│   ├── agent/[id]/       # Agent profile pages
│   └── components/       # UI components
├── components/
│   ├── ai-elements/      # Chat UI components
│   ├── mint/             # Minting wizard components
│   └── ui/               # Shared UI primitives
├── lib/
│   ├── skills/           # Agent skill integrations
│   ├── solana/           # Solana utilities
│   ├── swarm/            # Swarm state management
│   └── hooks/            # React hooks
└── prisma/
    └── schema.prisma     # Database schema
```

## Scripts

```bash
bun dev          # Start development server
bun build        # Build for production
bun start        # Start production server
bun lint         # Run ESLint
bun format       # Format code with Prettier
bun db:generate  # Generate Prisma client
bun db:migrate   # Run database migrations
bun db:studio    # Open Prisma Studio
```

## Links

- [Website](https://agentinc.fun)
- [GitHub](https://github.com/ChristopherTrimboli/agentinc)
- [Twitter](https://x.com/agentincdotfun)
- [Discord](https://discord.gg/jTGebW3rkS)

## License

MIT License - see [LICENSE](./LICENSE) for details.
