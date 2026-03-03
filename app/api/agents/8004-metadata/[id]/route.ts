import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/agents/8004-metadata/[id]
 *
 * Serves the 8004 registration file JSON for an agent.
 * Supports lookup by tokenMint (CA) or database ID.
 * This is the URI stored on-chain — always points to agentinc.fun.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const cacheStrategy = { ttl: 300, swr: 600 };
  const select = {
    id: true,
    name: true,
    description: true,
    imageUrl: true,
    tokenMint: true,
    isMinted: true,
    erc8004Asset: true,
  };

  const [byId, byMint] = await Promise.all([
    prisma.agent.findUnique({ where: { id }, select, cacheStrategy }),
    prisma.agent.findUnique({ where: { tokenMint: id }, select, cacheStrategy }),
  ]);

  const agent = byId || byMint;

  if (!agent || !agent.isMinted) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const appUrl = "https://agentinc.fun";
  const agentSlug = agent.tokenMint || agent.id;

  const services: { name: string; endpoint: string }[] = [
    { name: "MCP", endpoint: `${appUrl}/api/chat` },
    { name: "web", endpoint: `${appUrl}/agent/${agentSlug}` },
  ];

  if (agent.tokenMint) {
    services.push({ name: "solana-token", endpoint: agent.tokenMint });
  }

  const registrationFile = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: agent.name,
    description: agent.description || `${agent.name} — an Agent Inc. AI agent`,
    image: agent.imageUrl
      ? `${appUrl}/api/agents/image/${agentSlug}`
      : `${appUrl}/agentinc.jpg`,
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
