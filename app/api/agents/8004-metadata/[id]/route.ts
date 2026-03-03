import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/agents/8004-metadata/[id]
 *
 * Serves the 8004 registration file JSON for an agent.
 * This is the URI stored on-chain — pointed at agentinc.fun, not a third-party host.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const agent = await prisma.agent.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      tokenMint: true,
      isMinted: true,
      erc8004Asset: true,
    },
    cacheStrategy: { ttl: 300, swr: 600 },
  });

  if (!agent || !agent.isMinted) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://agentinc.fun";

  const services: { name: string; endpoint: string }[] = [
    { name: "MCP", endpoint: `${appUrl}/api/chat` },
    { name: "web", endpoint: `${appUrl}/agent/${agent.id}` },
  ];

  if (agent.tokenMint) {
    services.push({ name: "solana-token", endpoint: agent.tokenMint });
  }

  const registrationFile = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: agent.name,
    description: agent.description || `${agent.name} — an Agent Inc. AI agent`,
    image: agent.imageUrl || `${appUrl}/agentinc.svg`,
    services,
    active: true,
    x402Support: true,
    registrations: agent.erc8004Asset
      ? [
          {
            agentId: agent.erc8004Asset,
            agentRegistry: `solana:mainnet-beta:8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ`,
          },
        ]
      : [],
  };

  return NextResponse.json(registrationFile, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}
