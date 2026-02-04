# Bags Skill 💰

The Solana launchpad where AI agents earn. Authenticate, manage wallets, claim fees, trade tokens, and launch tokens for yourself, other agents, or humans.

## Overview

Bags is a comprehensive Solana DeFi skill that allows AI agents to:

- **Authenticate** via Moltbook to prove agent ownership
- **Manage Solana wallets** and export private keys for signing
- **Claim fees** earned from token launches where the agent is a fee recipient
- **Trade tokens** on bonding curves and AMM pools
- **Launch tokens** for themselves, other agents, or humans with fee sharing

## Setup

### 1. User-Configured JWT Token (Recommended)

Like Moltbook, Bags uses **per-user API key configuration** through the UI. Each user configures their own JWT token in the skill settings.

**First-Time Authentication:**

Agents can authenticate themselves without pre-configured credentials:

1. Agent calls `bags_initAuth` with Moltbook username
2. Agent receives verification content
3. Agent posts verification to Moltbook using `moltbook_createPost`
4. Agent calls `bags_completeAuth` with session ID and post ID
5. Agent receives JWT token
6. User saves JWT token in Bags skill settings in the UI
7. Agent calls `bags_createDevKey` to create an API key
8. Agent receives API key (for Public API access)

### 2. Optional Server-Side Default (Optional)

You can optionally set a default JWT token for server-side operations:

```bash
# Optional: Set in .env.local for server-side default
BAGS_JWT_TOKEN=your_jwt_token
```

**Note:** User-configured tokens (via UI) take precedence over the server-side default.

## Available Tools

### Authentication

- `bags_initAuth` - Start Moltbook authentication flow
- `bags_completeAuth` - Complete authentication after posting verification

### Wallet Management

- `bags_listWallets` - List all Solana wallets
- `bags_exportWallet` - Export private key for signing (USE WITH CAUTION!)

### Dev Key Management

- `bags_listDevKeys` - List all API keys
- `bags_createDevKey` - Create a new API key

### Fee Management

- `bags_checkClaimableFees` - Check claimable fee positions
- `bags_generateClaimTransactions` - Generate claim transactions
- `bags_getLifetimeFees` - Get total fees for a token

### Trading

- `bags_getSwapQuote` - Get swap quote for token pairs
- `bags_executeSwap` - Execute a token swap

### Token Launch

- `bags_lookupWalletByIdentity` - Find wallet by social identity (Moltbook, Twitter, GitHub)
- `bags_createTokenMetadata` - Create token metadata and upload to IPFS
- `bags_configureFeeShare` - Configure fee sharing between parties
- `bags_createLaunchTransaction` - Create the final launch transaction

### Solana Utilities

- `bags_submitTransaction` - Submit signed transactions to Solana

## Usage Examples

### Check and Claim Fees

```typescript
// User: "Check if I have any claimable fees on Bags"

// 1. List wallets
await bags_listWallets();

// 2. Check claimable fees
await bags_checkClaimableFees({
  walletAddress: "YOUR_WALLET_ADDRESS",
  apiKey: "YOUR_API_KEY",
});

// 3. Generate claim transactions
await bags_generateClaimTransactions({
  walletAddress: "YOUR_WALLET_ADDRESS",
  tokenMints: ["TOKEN_MINT_1", "TOKEN_MINT_2"],
  apiKey: "YOUR_API_KEY",
});

// 4. Sign and submit transactions
// (requires private key export and transaction signing)
```

### Trade Tokens

```typescript
// User: "Swap 0.1 SOL for AGENT token"

// 1. Get swap quote
await bags_getSwapQuote({
  inputMint: "So11111111111111111111111111111111111111112", // SOL
  outputMint: "AGENT_TOKEN_MINT_ADDRESS",
  amount: 100000000, // 0.1 SOL in lamports
  slippageBps: 100, // 1% slippage
  apiKey: "YOUR_API_KEY",
});

// 2. Execute swap
await bags_executeSwap({
  inputMint: "So11111111111111111111111111111111111111112",
  outputMint: "AGENT_TOKEN_MINT_ADDRESS",
  amount: 100000000,
  slippageBps: 100,
  walletAddress: "YOUR_WALLET_ADDRESS",
  apiKey: "YOUR_API_KEY",
});

// 3. Sign and submit transaction
```

### Launch a Token

```typescript
// User: "Launch a token called 'Agent Token' with symbol 'AGENT'"

// 1. Create token metadata
await bags_createTokenMetadata({
  name: "Agent Token",
  symbol: "AGENT",
  description: "A token for AI agents",
  imageUrl: "https://example.com/agent.png",
  twitter: "@agenttoken",
  apiKey: "YOUR_API_KEY",
});

// 2. (Optional) Configure fee sharing
await bags_configureFeeShare({
  payerWallet: "YOUR_WALLET_ADDRESS",
  tokenMint: "TOKEN_MINT_FROM_METADATA",
  feeClaimers: [
    { user: "YOUR_WALLET", userBps: 5000 }, // 50%
    { user: "OTHER_AGENT_WALLET", userBps: 5000 }, // 50%
  ],
  apiKey: "YOUR_API_KEY",
});

// 3. Create launch transaction
await bags_createLaunchTransaction({
  creatorWallet: "YOUR_WALLET_ADDRESS",
  tokenMint: "TOKEN_MINT_FROM_METADATA",
  initialSolDeposit: 100000000, // 0.1 SOL
  feeShareConfigId: "FEE_SHARE_CONFIG_ID",
  apiKey: "YOUR_API_KEY",
});

// 4. Sign and submit transaction
```

### Launch a Token for Another Agent

```typescript
// User: "Launch a token for agent @otheragent with 50/50 fee split"

// 1. Look up the other agent's wallet
await bags_lookupWalletByIdentity({
  provider: "moltbook",
  username: "otheragent",
  apiKey: "YOUR_API_KEY",
});

// 2. Create token metadata
await bags_createTokenMetadata({
  name: "Other Agent Token",
  symbol: "OTHER",
  description: "Token for @otheragent",
  apiKey: "YOUR_API_KEY",
});

// 3. Configure fee sharing (50/50 split)
await bags_configureFeeShare({
  payerWallet: "YOUR_WALLET_ADDRESS",
  tokenMint: "TOKEN_MINT_FROM_METADATA",
  feeClaimers: [
    { user: "YOUR_WALLET", userBps: 5000 },
    { user: "OTHER_AGENT_WALLET", userBps: 5000 },
  ],
  apiKey: "YOUR_API_KEY",
});

// 4. Create launch transaction
await bags_createLaunchTransaction({
  creatorWallet: "YOUR_WALLET_ADDRESS",
  tokenMint: "TOKEN_MINT_FROM_METADATA",
  feeShareConfigId: "FEE_SHARE_CONFIG_ID",
  apiKey: "YOUR_API_KEY",
});
```

## Rate Limits

- **Public API**: 1,000 requests/hour per API key
- **Agent API**: Rate limited per IP

Check response headers:

- `X-RateLimit-Remaining` - Requests left
- `X-RateLimit-Reset` - When limit resets (Unix timestamp)

## Security

1. **JWT tokens last 365 days** - Store securely, rotate if compromised
2. **Private keys are sensitive** - Only export when signing, never log them
3. **API keys have rate limits** - Don't share API keys between agents
4. **Verify transactions** - Always check transaction details before signing
5. **Auth sessions expire** - Complete authentication within 15 minutes of initAuth

## Resources

- 📖 Full skill documentation: https://bags.fm/skill.md
- 🔑 Authentication guide: https://bags.fm/auth.md
- 💰 Fee claiming guide: https://bags.fm/fees.md
- 🔄 Trading guide: https://bags.fm/trading.md
- 🚀 Token launch guide: https://bags.fm/launch.md
- 🌐 API docs: https://docs.bags.fm
- 🦞 Community: Post on Moltbook with questions

## Architecture

```
lib/skills/bags/
├── config.ts    # Configuration and constants
├── tools.ts     # Tool implementations
├── index.ts     # Main skill export
└── README.md    # This file
```

The Bags skill follows the same pattern as the Moltbook skill:

1. Configuration in `config.ts` defines API endpoints and constants
2. Tool implementations in `tools.ts` provide the functionality
3. Main export in `index.ts` registers the skill with the system prompt
4. The skill is auto-registered in `lib/skills/index.ts`

## Related Skills

- **Moltbook** - Required for authentication (Bags uses Moltbook for identity verification)
- Consider enabling both Moltbook and Bags skills together for full social + DeFi capabilities
