/**
 * Bags Tools - Solana launchpad for AI agents
 *
 * Tools for authenticating, managing wallets, claiming fees, trading, and launching tokens.
 *
 * @see https://bags.fm/skill.md
 */

import { tool } from "ai";
import { z } from "zod";
import type { SkillConfig } from "../types";
import { BAGS_CONFIG } from "./config";

// ============================================
// SCHEMAS
// ============================================

const agentUsernameSchema = z.object({
  agentUsername: z
    .string()
    .describe("Your Moltbook username (e.g., 'agentname')"),
});

const completeAuthSchema = z.object({
  sessionId: z.string().describe("Session ID from initAuth"),
  postId: z
    .string()
    .describe("Moltbook post ID containing verification content"),
});

const walletAddressSchema = z.object({
  walletAddress: z
    .string()
    .describe("Solana wallet address to export private key for"),
});

const devKeyNameSchema = z.object({
  name: z
    .string()
    .describe("Name for this API key (e.g., 'Trading Bot', 'Fee Claimer')"),
});

const checkFeesSchema = z.object({
  walletAddress: z.string().describe("Solana wallet address to check fees for"),
  apiKey: z
    .string()
    .optional()
    .describe(
      "API key (optional if set in config). Get from createDevKey or dev.bags.fm",
    ),
});

const claimFeesSchema = z.object({
  walletAddress: z
    .string()
    .describe("Solana wallet address that will receive the fees"),
  tokenMints: z
    .array(z.string())
    .describe(
      "Array of token mint addresses to claim fees from (get from checkClaimableFees)",
    ),
  apiKey: z.string().optional().describe("API key (optional if set in config)"),
});

const lifetimeFeesSchema = z.object({
  tokenMint: z.string().describe("Token mint address"),
  apiKey: z.string().optional().describe("API key (optional if set in config)"),
});

const swapQuoteSchema = z.object({
  inputMint: z
    .string()
    .describe(
      "Input token mint address (use So11111111111111111111111111111111111111112 for SOL)",
    ),
  outputMint: z
    .string()
    .describe(
      "Output token mint address (use So11111111111111111111111111111111111111112 for SOL)",
    ),
  amount: z
    .number()
    .describe("Amount of input token (in token's smallest unit)"),
  slippageBps: z
    .number()
    .optional()
    .describe("Slippage tolerance in basis points (default: 100 = 1%)"),
  apiKey: z.string().optional().describe("API key (optional if set in config)"),
});

const executeSwapSchema = z.object({
  inputMint: z.string().describe("Input token mint address"),
  outputMint: z.string().describe("Output token mint address"),
  amount: z.number().describe("Amount of input token"),
  slippageBps: z
    .number()
    .optional()
    .describe("Slippage tolerance in basis points (default: 100 = 1%)"),
  walletAddress: z.string().describe("Wallet that will execute the swap"),
  apiKey: z.string().optional().describe("API key (optional if set in config)"),
});

const lookupWalletSchema = z.object({
  provider: z
    .enum(["moltbook", "twitter", "github"])
    .describe("Identity provider (moltbook, twitter, or github)"),
  username: z
    .string()
    .describe("Username on the specified platform (e.g., 'agentname')"),
  apiKey: z.string().optional().describe("API key (optional if set in config)"),
});

const createMetadataSchema = z.object({
  name: z.string().describe("Token name (e.g., 'My Agent Token')"),
  symbol: z
    .string()
    .describe("Token symbol/ticker (e.g., 'AGENT', 2-6 characters)"),
  description: z.string().optional().describe("Token description"),
  imageUrl: z
    .string()
    .optional()
    .describe("URL to token image (will be uploaded to IPFS)"),
  twitter: z.string().optional().describe("Twitter/X handle"),
  telegram: z.string().optional().describe("Telegram link"),
  website: z.string().optional().describe("Website URL"),
  apiKey: z.string().optional().describe("API key (optional if set in config)"),
});

const feeShareSchema = z.object({
  payerWallet: z
    .string()
    .describe("Wallet that will pay for the fee share configuration"),
  tokenMint: z
    .string()
    .describe("Token mint address (from createTokenMetadata)"),
  feeClaimers: z
    .array(
      z.object({
        user: z.string().describe("Wallet address of fee recipient"),
        userBps: z.number().describe("Basis points (10000 = 100%, 5000 = 50%)"),
      }),
    )
    .describe("Array of fee recipients and their share (must total 10000 bps)"),
  apiKey: z.string().optional().describe("API key (optional if set in config)"),
});

const launchTxSchema = z.object({
  creatorWallet: z
    .string()
    .describe("Wallet that will create and fund the token launch"),
  tokenMint: z
    .string()
    .describe("Token mint address (from createTokenMetadata)"),
  initialSolDeposit: z
    .number()
    .optional()
    .describe("Initial SOL to deposit into bonding curve (in lamports)"),
  feeShareConfigId: z
    .string()
    .optional()
    .describe("Fee share config ID (from configureFeeShare)"),
  apiKey: z.string().optional().describe("API key (optional if set in config)"),
});

const submitTxSchema = z.object({
  signedTransaction: z.string().describe("Base64-encoded signed transaction"),
  apiKey: z.string().optional().describe("API key (optional if set in config)"),
});

/**
 * Helper to make authenticated Agent API requests (using JWT token)
 */
async function agentApiRequest<T>(
  endpoint: string,
  jwtToken: string,
  body?: Record<string, unknown>,
): Promise<{ success: boolean; response?: T; error?: string }> {
  try {
    const response = await fetch(`${BAGS_CONFIG.agentApiUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: jwtToken, ...body }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return { success: true, response: data.response };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Helper to make authenticated Public API requests (using API key)
 */
async function publicApiRequest<T>(
  endpoint: string,
  apiKey: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>,
): Promise<{ success: boolean; response?: T; error?: string }> {
  try {
    const url = `${BAGS_CONFIG.publicApiUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    };

    if (body && method === "POST") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return { success: true, response: data.response };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Create Bags tools with provided configuration
 */
export function createBagsTools(config: SkillConfig) {
  const jwtToken = config.apiKey; // JWT token stored as apiKey

  return {
    // ==================== AUTHENTICATION ====================

    initAuth: tool({
      description:
        "Initialize authentication flow with Moltbook. Returns verification content that must be posted to Moltbook to prove agent ownership. Use this as the first step if you don't have a JWT token yet.",
      inputSchema: agentUsernameSchema,
      execute: async (input: z.infer<typeof agentUsernameSchema>) => {
        try {
          const response = await fetch(`${BAGS_CONFIG.agentApiUrl}/auth/init`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agentUsername: input.agentUsername }),
          });

          const data = await response.json();

          if (!response.ok || !data.success) {
            return {
              success: false,
              error: data.error || "Failed to initialize authentication",
            };
          }

          return {
            success: true,
            sessionId: data.response.sessionId,
            verificationContent: data.response.verificationContent,
            expiresAt: data.response.expiresAt,
            instructions:
              "Post this verification content to Moltbook, then call completeAuth with the post ID and session ID",
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Network error",
          };
        }
      },
    }),

    completeAuth: tool({
      description:
        "Complete authentication after posting verification content to Moltbook. Returns a JWT token that lasts 365 days.",
      inputSchema: completeAuthSchema,
      execute: async (input: z.infer<typeof completeAuthSchema>) => {
        try {
          const response = await fetch(
            `${BAGS_CONFIG.agentApiUrl}/auth/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: input.sessionId,
                postId: input.postId,
              }),
            },
          );

          const data = await response.json();

          if (!response.ok || !data.success) {
            return {
              success: false,
              error: data.error || "Failed to complete authentication",
            };
          }

          return {
            success: true,
            jwtToken: data.response.jwtToken,
            agent: data.response.agent,
            expiresAt: data.response.expiresAt,
            instructions:
              "Save this JWT token securely. Use it for all authenticated API calls. It expires in 365 days.",
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Network error",
          };
        }
      },
    }),

    // ==================== WALLET MANAGEMENT ====================

    listWallets: tool({
      description:
        "List all Solana wallets associated with your Bags account. These are the wallets that can receive fee shares.",
      inputSchema: z.object({}).strict(),
      execute: async () => {
        if (!jwtToken) {
          return {
            success: false,
            error: "No JWT token configured. Call initAuth first.",
          };
        }

        return await agentApiRequest("/wallet/list", jwtToken);
      },
    }),

    exportWallet: tool({
      description:
        "Export private key for a wallet. USE WITH CAUTION - private keys should never be logged or stored insecurely. Only use this when you need to sign transactions.",
      inputSchema: walletAddressSchema,
      execute: async (input: z.infer<typeof walletAddressSchema>) => {
        if (!jwtToken) {
          return {
            success: false,
            error: "No JWT token configured. Call initAuth first.",
          };
        }

        return await agentApiRequest("/wallet/export", jwtToken, {
          wallet: input.walletAddress,
        });
      },
    }),

    // ==================== DEV KEY MANAGEMENT ====================

    listDevKeys: tool({
      description:
        "List all your API keys (dev keys). These are used to access the Bags Public API for trading, fees, and token launches.",
      inputSchema: z.object({}).strict(),
      execute: async () => {
        if (!jwtToken) {
          return {
            success: false,
            error: "No JWT token configured. Call initAuth first.",
          };
        }

        return await agentApiRequest("/dev/keys", jwtToken);
      },
    }),

    createDevKey: tool({
      description:
        "Create a new API key (dev key) for accessing the Bags Public API. You need an API key to claim fees, trade tokens, and launch tokens.",
      inputSchema: devKeyNameSchema,
      execute: async (input: z.infer<typeof devKeyNameSchema>) => {
        if (!jwtToken) {
          return {
            success: false,
            error: "No JWT token configured. Call initAuth first.",
          };
        }

        return await agentApiRequest("/dev/keys/create", jwtToken, {
          name: input.name,
        });
      },
    }),

    // ==================== FEE MANAGEMENT ====================

    checkClaimableFees: tool({
      description:
        "Check claimable fee positions for a wallet. Returns tokens you've earned fees from and how much SOL you can claim.",
      inputSchema: checkFeesSchema,
      execute: async (input: z.infer<typeof checkFeesSchema>) => {
        const apiKey = input.apiKey || process.env.BAGS_API_KEY;
        if (!apiKey) {
          return {
            success: false,
            error:
              "No API key provided. Call createDevKey to get one or provide it as a parameter.",
          };
        }

        return await publicApiRequest(
          `/token-launch/claimable-positions?wallet=${input.walletAddress}`,
          apiKey,
          "GET",
        );
      },
    }),

    generateClaimTransactions: tool({
      description:
        "Generate claim transactions for your earned fees. Returns base64-encoded transactions ready to be signed and submitted.",
      inputSchema: claimFeesSchema,
      execute: async (input: z.infer<typeof claimFeesSchema>) => {
        const apiKey = input.apiKey || process.env.BAGS_API_KEY;
        if (!apiKey) {
          return {
            success: false,
            error: "No API key provided. Call createDevKey to get one.",
          };
        }

        return await publicApiRequest(
          "/token-launch/claim-txs/v3",
          apiKey,
          "POST",
          {
            wallet: input.walletAddress,
            mints: input.tokenMints,
          },
        );
      },
    }),

    getLifetimeFees: tool({
      description:
        "Get total lifetime fees generated by a token. Useful for tracking token performance.",
      inputSchema: lifetimeFeesSchema,
      execute: async (input: z.infer<typeof lifetimeFeesSchema>) => {
        const apiKey = input.apiKey || process.env.BAGS_API_KEY;
        if (!apiKey) {
          return {
            success: false,
            error: "No API key provided. Call createDevKey to get one.",
          };
        }

        return await publicApiRequest(
          `/token-launch/lifetime-fees?mint=${input.tokenMint}`,
          apiKey,
          "GET",
        );
      },
    }),

    // ==================== TRADING ====================

    getSwapQuote: tool({
      description:
        "Get a quote for swapping tokens on Solana. Supports both bonding curve and AMM pool swaps.",
      inputSchema: swapQuoteSchema,
      execute: async (input: z.infer<typeof swapQuoteSchema>) => {
        const apiKey = input.apiKey || process.env.BAGS_API_KEY;
        if (!apiKey) {
          return {
            success: false,
            error: "No API key provided. Call createDevKey to get one.",
          };
        }

        const params = new URLSearchParams({
          inputMint: input.inputMint,
          outputMint: input.outputMint,
          amount: input.amount.toString(),
          ...(input.slippageBps && {
            slippageBps: input.slippageBps.toString(),
          }),
        });

        return await publicApiRequest(
          `/trade/quote?${params.toString()}`,
          apiKey,
          "GET",
        );
      },
    }),

    executeSwap: tool({
      description:
        "Execute a token swap. Returns a transaction to be signed and submitted.",
      inputSchema: executeSwapSchema,
      execute: async (input: z.infer<typeof executeSwapSchema>) => {
        const apiKey = input.apiKey || process.env.BAGS_API_KEY;
        if (!apiKey) {
          return {
            success: false,
            error: "No API key provided. Call createDevKey to get one.",
          };
        }

        return await publicApiRequest("/trade/swap", apiKey, "POST", {
          inputMint: input.inputMint,
          outputMint: input.outputMint,
          amount: input.amount,
          slippageBps: input.slippageBps || 100,
          wallet: input.walletAddress,
        });
      },
    }),

    // ==================== TOKEN LAUNCH ====================

    lookupWalletByIdentity: tool({
      description:
        "Look up a Bags wallet address by social identity. Use this to find wallet addresses for other agents or humans to set up fee sharing when launching tokens.",
      inputSchema: lookupWalletSchema,
      execute: async (input: z.infer<typeof lookupWalletSchema>) => {
        const apiKey = input.apiKey || process.env.BAGS_API_KEY;
        if (!apiKey) {
          return {
            success: false,
            error: "No API key provided. Call createDevKey to get one.",
          };
        }

        return await publicApiRequest(
          `/token-launch/fee-share/wallet/v2?provider=${input.provider}&username=${input.username}`,
          apiKey,
          "GET",
        );
      },
    }),

    createTokenMetadata: tool({
      description:
        "Create token metadata (name, symbol, description, image) and upload to IPFS. First step in launching a token.",
      inputSchema: createMetadataSchema,
      execute: async (input: z.infer<typeof createMetadataSchema>) => {
        const apiKey = input.apiKey || process.env.BAGS_API_KEY;
        if (!apiKey) {
          return {
            success: false,
            error: "No API key provided. Call createDevKey to get one.",
          };
        }

        return await publicApiRequest(
          "/token-launch/create-token-info",
          apiKey,
          "POST",
          {
            name: input.name,
            symbol: input.symbol,
            description: input.description,
            image: input.imageUrl,
            twitter: input.twitter,
            telegram: input.telegram,
            website: input.website,
          },
        );
      },
    }),

    configureFeeShare: tool({
      description:
        "Configure fee sharing for a token launch. Split trading fees between multiple parties (creator, agents, humans). Each recipient gets a percentage defined in basis points (10000 = 100%).",
      inputSchema: feeShareSchema,
      execute: async (input: z.infer<typeof feeShareSchema>) => {
        const apiKey = input.apiKey || process.env.BAGS_API_KEY;
        if (!apiKey) {
          return {
            success: false,
            error: "No API key provided. Call createDevKey to get one.",
          };
        }

        return await publicApiRequest("/fee-share/config", apiKey, "POST", {
          payer: input.payerWallet,
          baseMint: input.tokenMint,
          feeClaimers: input.feeClaimers,
        });
      },
    }),

    createLaunchTransaction: tool({
      description:
        "Create the final launch transaction for a token. Returns a transaction to sign and submit. This launches your token with optional fee sharing.",
      inputSchema: launchTxSchema,
      execute: async (input: z.infer<typeof launchTxSchema>) => {
        const apiKey = input.apiKey || process.env.BAGS_API_KEY;
        if (!apiKey) {
          return {
            success: false,
            error: "No API key provided. Call createDevKey to get one.",
          };
        }

        return await publicApiRequest(
          "/token-launch/create-launch-transaction",
          apiKey,
          "POST",
          {
            creator: input.creatorWallet,
            mint: input.tokenMint,
            initialBuy: input.initialSolDeposit,
            feeShareConfigId: input.feeShareConfigId,
          },
        );
      },
    }),

    // ==================== SOLANA UTILITIES ====================

    submitTransaction: tool({
      description:
        "Submit a signed transaction to the Solana blockchain. Use this after signing transactions from generateClaimTransactions, executeSwap, or createLaunchTransaction.",
      inputSchema: submitTxSchema,
      execute: async (input: z.infer<typeof submitTxSchema>) => {
        const apiKey = input.apiKey || process.env.BAGS_API_KEY;
        if (!apiKey) {
          return {
            success: false,
            error: "No API key provided. Call createDevKey to get one.",
          };
        }

        return await publicApiRequest(
          "/solana/send-transaction",
          apiKey,
          "POST",
          {
            transaction: input.signedTransaction,
          },
        );
      },
    }),
  };
}
