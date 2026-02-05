import { NextResponse } from "next/server";
import { SOL_NETWORK } from "@/lib/x402/sol-middleware";

/**
 * Agent Inc. Native SOL Facilitator
 *
 * A public x402 facilitator service that accepts native SOL payments.
 * Unlike USDC-based facilitators, this converts USD prices to SOL
 * at the current market rate.
 */

const FACILITATOR_VERSION = "1.0.0";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const facilitatorUrl = `${baseUrl}/api/x402/facilitator`;

  return NextResponse.json({
    name: "Agent Inc. Native SOL Facilitator",
    version: FACILITATOR_VERSION,
    description:
      "x402 payment facilitator for native SOL on Solana. Prices are set in USD and converted to SOL at current market rate.",
    network: SOL_NETWORK,
    scheme: "exact",
    asset: "native SOL",

    // Facilitator URL for client configuration
    facilitatorUrl,

    // Available endpoints
    endpoints: {
      supported: {
        method: "GET",
        url: `${facilitatorUrl}/supported`,
        description: "Returns supported networks and payment schemes",
      },
      price: {
        method: "GET",
        url: `${facilitatorUrl}/price`,
        description: "Convert USD to SOL/lamports at current rate",
        parameters: {
          usd: "USD amount to convert (e.g., ?usd=0.01)",
        },
      },
      verify: {
        method: "POST",
        url: `${facilitatorUrl}/verify`,
        description: "Verify a payment transaction before settlement",
        body: {
          paymentPayload: {
            transaction: "base64-encoded signed Solana transaction",
          },
          paymentRequirements: {
            scheme: "exact",
            network: "solana | solana-devnet",
            maxAmountRequired: "amount in lamports as string",
            resource: "API endpoint being paid for",
            description: "Human-readable description",
            mimeType: "application/json",
            payTo: "Solana wallet address to receive payment",
            maxTimeoutSeconds: 60,
            asset: "solana:native",
          },
        },
      },
      settle: {
        method: "POST",
        url: `${facilitatorUrl}/settle`,
        description: "Submit and confirm a verified payment transaction",
        body: "Same as /verify",
      },
    },

    // Integration example
    example: {
      clientSetup: `
// Configure your x402 client to use this facilitator
const facilitatorUrl = "${facilitatorUrl}";

// 1. Get current pricing
const priceRes = await fetch(\`\${facilitatorUrl}/price?usd=0.01\`);
const { lamports, sol } = await priceRes.json();

// 2. Create payment transaction (transfer native SOL)
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: userWallet,
    toPubkey: new PublicKey(payTo),
    lamports: BigInt(lamports),
  })
);

// 3. Sign and encode
const signed = await wallet.signTransaction(transaction);
const encoded = Buffer.from(signed.serialize()).toString('base64');

// 4. Verify before API call
const verifyRes = await fetch(\`\${facilitatorUrl}/verify\`, {
  method: 'POST',
  body: JSON.stringify({
    paymentPayload: { transaction: encoded },
    paymentRequirements: { /* from 402 response */ }
  })
});

// 5. Make API call with payment header
const apiRes = await fetch(protectedEndpoint, {
  headers: { 'X-PAYMENT': encoded }
});
      `.trim(),
    },

    // Links
    links: {
      documentation: "https://github.com/anthropics/x402",
      agentInc: baseUrl,
    },
  });
}
