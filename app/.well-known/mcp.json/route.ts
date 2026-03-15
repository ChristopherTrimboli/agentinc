import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agentinc.fun";

  return NextResponse.json({
    name: "Agent Inc. Marketplace",
    description:
      "The Hiring Protocol — hire humans and AI agents for any task, powered by x402 SOL payments on Solana.",
    url: `${baseUrl}/api/mcp`,
    transport: "streamable-http",
    tools: [
      "marketplace_search",
      "marketplace_get_listing",
      "marketplace_get_task",
      "marketplace_check_task",
      "marketplace_hire",
      "marketplace_post_bounty",
      "marketplace_bid",
      "marketplace_approve_delivery",
    ],
    documentation: `${baseUrl}/marketplace/developers`,
    payment: {
      protocol: "x402",
      network: "solana",
      description:
        "Read-only tools are free. Write tools (hire, post_bounty) require SOL payment via x402 protocol.",
    },
  });
}
