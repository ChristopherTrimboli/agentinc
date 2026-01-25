import { PrismaClient, Prisma } from "../app/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate());

// Seed data matching the Privy User schema
const userData: Prisma.UserCreateInput[] = [
  {
    id: "did:privy:seed-user-1",
    email: "alice@example.com",
  },
  {
    id: "did:privy:seed-user-2",
    email: "bob@example.com",
  },
];

// Corporation seed data
const corporationData = {
  name: "Agent Inc.",
  description: "The world's first AI-powered autonomous startup. Agent Inc. deploys intelligent agents that collaborate to build, scale, and operate businesses on-chain.",
  logo: "🏢",
  color: "#8B5CF6",
  size: 70,
};

// Swarm agent seed data (will be linked to Agent Inc.)
const swarmAgentData = [
  {
    name: "Orchestrator",
    description: "The brain of Agent Inc. Coordinates tasks between agents, manages workflows, and ensures optimal resource allocation.",
    capabilities: ["planning", "delegation", "monitoring", "scheduling"],
    color: "#8B5CF6",
    size: 50,
  },
  {
    name: "Researcher",
    description: "Gathers market intelligence, analyzes competitors, and discovers opportunities for Agent Inc.",
    capabilities: ["web_search", "analysis", "summarization", "market_research"],
    color: "#06B6D4",
    size: 40,
  },
  {
    name: "Coder",
    description: "Builds and maintains Agent Inc.'s infrastructure, smart contracts, and automation systems.",
    capabilities: ["code_generation", "debugging", "refactoring", "smart_contracts"],
    color: "#10B981",
    size: 40,
  },
  {
    name: "Writer",
    description: "Creates compelling content, documentation, and communications for Agent Inc.",
    capabilities: ["writing", "editing", "formatting", "copywriting"],
    color: "#F59E0B",
    size: 35,
  },
  {
    name: "Analyst",
    description: "Tracks KPIs, analyzes on-chain data, and generates insights to drive Agent Inc.'s strategy.",
    capabilities: ["data_analysis", "visualization", "reporting", "forecasting"],
    color: "#EF4444",
    size: 35,
  },
  {
    name: "Reviewer",
    description: "Quality assurance for Agent Inc. Reviews outputs, validates decisions, and ensures excellence.",
    capabilities: ["review", "validation", "feedback", "quality_assurance"],
    color: "#EC4899",
    size: 35,
  },
];

export async function main() {
  console.log("Seeding database...");

  // Seed users
  for (const u of userData) {
    const user = await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: u,
    });
    console.log(`Created user: ${user.id}`);
  }

  // Seed corporation and agents
  const existingCorporations = await prisma.corporation.count();
  if (existingCorporations === 0) {
    // Create Agent Inc. corporation
    const corporation = await prisma.corporation.create({
      data: corporationData,
    });
    console.log(`Created corporation: ${corporation.name}`);

    // Create agents under Agent Inc.
    for (const agentData of swarmAgentData) {
      const agent = await prisma.swarmAgent.create({
        data: {
          ...agentData,
          corporationId: corporation.id,
        },
      });
      console.log(`Created swarm agent: ${agent.name} (under ${corporation.name})`);
    }
  } else {
    console.log(`Skipping corporations (${existingCorporations} already exist)`);
  }

  console.log("Seeding complete.");
}

main();
