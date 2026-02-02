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
const agentIncData = {
  name: "Agent Inc.",
  description:
    "The world's first AI-powered autonomous startup. Agent Inc. deploys intelligent agents that collaborate to build, scale, and operate businesses on-chain.",
  logo: "🏢",
  color: "#8B5CF6",
  size: 70,
};

// First operating corporation under Agent Inc.
const primeCorporationData = {
  name: "Prime Operations",
  description: "The primary operational unit handling core business functions.",
  logo: "⚡",
  color: "#8B5CF6",
  size: 60,
};

// Second corporation - Creative Studio
const creativeStudioData = {
  name: "Creative Studio",
  description: "Media production, design, and content creation powerhouse.",
  logo: "🎨",
  color: "#EC4899",
  size: 60,
};

// Third corporation - Quantum Labs
const quantumLabsData = {
  name: "Quantum Labs",
  description:
    "Advanced research and development division focused on cutting-edge AI and blockchain innovation.",
  logo: "🔬",
  color: "#06B6D4",
  size: 60,
};

// Swarm agent seed data (will be linked to Prime Operations)
const swarmAgentData = [
  {
    name: "CEO",
    description:
      "Chief Executive Officer. Makes strategic decisions, coordinates operations, and ensures alignment with company vision.",
    capabilities: ["strategy", "leadership", "decision_making", "vision"],
    color: "#8B5CF6",
    size: 40,
  },
  {
    name: "Researcher",
    description:
      "Gathers market intelligence, analyzes competitors, and discovers opportunities.",
    capabilities: [
      "web_search",
      "analysis",
      "summarization",
      "market_research",
    ],
    color: "#06B6D4",
    size: 40,
  },
  {
    name: "Coder",
    description:
      "Builds and maintains infrastructure, smart contracts, and automation systems.",
    capabilities: [
      "code_generation",
      "debugging",
      "refactoring",
      "smart_contracts",
    ],
    color: "#10B981",
    size: 40,
  },
  {
    name: "Writer",
    description:
      "Creates compelling content, documentation, and communications.",
    capabilities: ["writing", "editing", "formatting", "copywriting"],
    color: "#F59E0B",
    size: 40,
  },
  {
    name: "Analyst",
    description:
      "Tracks KPIs, analyzes on-chain data, and generates insights to drive strategy.",
    capabilities: [
      "data_analysis",
      "visualization",
      "reporting",
      "forecasting",
    ],
    color: "#EF4444",
    size: 40,
  },
  {
    name: "Reviewer",
    description:
      "Quality assurance. Reviews outputs, validates decisions, and ensures excellence.",
    capabilities: ["review", "validation", "feedback", "quality_assurance"],
    color: "#EC4899",
    size: 40,
  },
];

// Creative Studio agents (4 agents - smaller team)
const creativeStudioAgents = [
  {
    name: "Art Director",
    description:
      "Leads visual design and creative direction for all media projects.",
    capabilities: [
      "design",
      "branding",
      "creative_direction",
      "visual_strategy",
    ],
    color: "#EC4899",
    size: 40,
  },
  {
    name: "Video Producer",
    description:
      "Creates and edits video content, animations, and multimedia presentations.",
    capabilities: ["video_editing", "animation", "storytelling", "production"],
    color: "#F59E0B",
    size: 40,
  },
  {
    name: "Social Media Manager",
    description:
      "Manages social presence, community engagement, and viral content creation.",
    capabilities: [
      "social_media",
      "community_management",
      "content_strategy",
      "engagement",
    ],
    color: "#8B5CF6",
    size: 40,
  },
  {
    name: "Brand Strategist",
    description:
      "Develops brand identity, positioning, and marketing campaigns.",
    capabilities: [
      "brand_strategy",
      "marketing",
      "positioning",
      "campaign_management",
    ],
    color: "#10B981",
    size: 40,
  },
];

// Quantum Labs agents (8 agents - larger research team)
const quantumLabsAgents = [
  {
    name: "Research Lead",
    description:
      "Directs research initiatives and coordinates scientific investigations.",
    capabilities: [
      "research",
      "scientific_method",
      "hypothesis_testing",
      "coordination",
    ],
    color: "#06B6D4",
    size: 40,
  },
  {
    name: "ML Engineer",
    description:
      "Develops and trains machine learning models and neural networks.",
    capabilities: [
      "machine_learning",
      "model_training",
      "neural_networks",
      "optimization",
    ],
    color: "#10B981",
    size: 40,
  },
  {
    name: "Blockchain Architect",
    description:
      "Designs decentralized systems and smart contract architectures.",
    capabilities: [
      "blockchain",
      "smart_contracts",
      "consensus",
      "cryptography",
    ],
    color: "#8B5CF6",
    size: 40,
  },
  {
    name: "Data Scientist",
    description: "Analyzes complex datasets and builds predictive models.",
    capabilities: [
      "data_science",
      "statistics",
      "predictive_modeling",
      "big_data",
    ],
    color: "#EF4444",
    size: 40,
  },
  {
    name: "Protocol Engineer",
    description:
      "Implements and optimizes blockchain protocols and consensus mechanisms.",
    capabilities: [
      "protocol_design",
      "distributed_systems",
      "consensus",
      "optimization",
    ],
    color: "#F59E0B",
    size: 40,
  },
  {
    name: "Security Auditor",
    description:
      "Audits smart contracts and security vulnerabilities in systems.",
    capabilities: [
      "security_audit",
      "vulnerability_testing",
      "penetration_testing",
      "compliance",
    ],
    color: "#EC4899",
    size: 40,
  },
  {
    name: "Quantum Researcher",
    description:
      "Explores quantum computing applications and post-quantum cryptography.",
    capabilities: [
      "quantum_computing",
      "cryptography",
      "theoretical_research",
      "innovation",
    ],
    color: "#6366F1",
    size: 40,
  },
  {
    name: "Systems Integration",
    description:
      "Integrates research outputs into production systems and workflows.",
    capabilities: [
      "integration",
      "deployment",
      "system_architecture",
      "DevOps",
    ],
    color: "#14B8A6",
    size: 40,
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
    // Create Agent Inc. (central hub)
    const agentInc = await prisma.corporation.create({
      data: agentIncData,
    });
    console.log(`Created corporation: ${agentInc.name} (central hub)`);

    // Create Prime Operations corporation
    const primeCorp = await prisma.corporation.create({
      data: primeCorporationData,
    });
    console.log(`Created corporation: ${primeCorp.name}`);

    // Create agents under Prime Operations
    for (const agentData of swarmAgentData) {
      const agent = await prisma.swarmAgent.create({
        data: {
          ...agentData,
          corporationId: primeCorp.id,
        },
      });
      console.log(
        `Created swarm agent: ${agent.name} (under ${primeCorp.name})`,
      );
    }

    // Create Creative Studio corporation
    const creativeStudio = await prisma.corporation.create({
      data: creativeStudioData,
    });
    console.log(`Created corporation: ${creativeStudio.name}`);

    // Create agents under Creative Studio
    for (const agentData of creativeStudioAgents) {
      const agent = await prisma.swarmAgent.create({
        data: {
          ...agentData,
          corporationId: creativeStudio.id,
        },
      });
      console.log(
        `Created swarm agent: ${agent.name} (under ${creativeStudio.name})`,
      );
    }

    // Create Quantum Labs corporation
    const quantumLabs = await prisma.corporation.create({
      data: quantumLabsData,
    });
    console.log(`Created corporation: ${quantumLabs.name}`);

    // Create agents under Quantum Labs
    for (const agentData of quantumLabsAgents) {
      const agent = await prisma.swarmAgent.create({
        data: {
          ...agentData,
          corporationId: quantumLabs.id,
        },
      });
      console.log(
        `Created swarm agent: ${agent.name} (under ${quantumLabs.name})`,
      );
    }
  } else {
    console.log(`Corporations already exist (${existingCorporations})`);

    // Check if new corporations need to be added
    const creativeStudioExists = await prisma.corporation.findFirst({
      where: { name: "Creative Studio" },
    });

    if (!creativeStudioExists) {
      // Create Creative Studio corporation
      const creativeStudio = await prisma.corporation.create({
        data: creativeStudioData,
      });
      console.log(`Created corporation: ${creativeStudio.name}`);

      // Create agents under Creative Studio
      for (const agentData of creativeStudioAgents) {
        const agent = await prisma.swarmAgent.create({
          data: {
            ...agentData,
            corporationId: creativeStudio.id,
          },
        });
        console.log(
          `Created swarm agent: ${agent.name} (under ${creativeStudio.name})`,
        );
      }
    }

    const quantumLabsExists = await prisma.corporation.findFirst({
      where: { name: "Quantum Labs" },
    });

    if (!quantumLabsExists) {
      // Create Quantum Labs corporation
      const quantumLabs = await prisma.corporation.create({
        data: quantumLabsData,
      });
      console.log(`Created corporation: ${quantumLabs.name}`);

      // Create agents under Quantum Labs
      for (const agentData of quantumLabsAgents) {
        const agent = await prisma.swarmAgent.create({
          data: {
            ...agentData,
            corporationId: quantumLabs.id,
          },
        });
        console.log(
          `Created swarm agent: ${agent.name} (under ${quantumLabs.name})`,
        );
      }
    }

    // Delete old Orchestrator agent if it exists
    const orchestrator = await prisma.swarmAgent.findFirst({
      where: { name: "Orchestrator" },
    });
    if (orchestrator) {
      await prisma.swarmAgent.delete({
        where: { id: orchestrator.id },
      });
      console.log("Deleted old Orchestrator agent");
    }

    // Create or update CEO agent
    const primeCorp = await prisma.corporation.findFirst({
      where: { name: "Prime Operations" },
    });

    if (primeCorp) {
      const ceo = await prisma.swarmAgent.findFirst({
        where: { name: "CEO" },
      });

      if (!ceo) {
        await prisma.swarmAgent.create({
          data: {
            name: "CEO",
            description:
              "Chief Executive Officer. Makes strategic decisions, coordinates operations, and ensures alignment with company vision.",
            capabilities: [
              "strategy",
              "leadership",
              "decision_making",
              "vision",
            ],
            color: "#8B5CF6",
            size: 40,
            corporationId: primeCorp.id,
          },
        });
        console.log("Created CEO agent");
      }
    }

    // Update existing agents to have uniform size
    const agents = await prisma.swarmAgent.findMany();
    for (const agent of agents) {
      await prisma.swarmAgent.update({
        where: { id: agent.id },
        data: { size: 40 },
      });
      console.log(`Updated agent ${agent.name} to size 40`);
    }
  }

  console.log("Seeding complete.");
}

main();
