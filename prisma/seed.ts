import { PrismaClient, Prisma } from "../app/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
}).$extends(withAccelerate());

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

const agentIncData = {
  name: "Agent Inc.",
  description:
    "The world's first AI-powered autonomous startup. Agent Inc. deploys intelligent agents that collaborate to build, scale, and operate businesses on-chain.",
  logo: "🏢",
  color: "#10B981",
  size: 80,
};

export async function main() {
  console.log("Seeding database...");

  for (const u of userData) {
    const user = await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: u,
    });
    console.log(`Created user: ${user.id}`);
  }

  const existingCorporations = await prisma.corporation.count();
  if (existingCorporations === 0) {
    const agentInc = await prisma.corporation.create({
      data: agentIncData,
    });
    console.log(`Created corporation: ${agentInc.name}`);
  } else {
    console.log(`Corporations already exist (${existingCorporations}), skipping.`);
  }

  console.log("Seeding complete.");
}

main();
