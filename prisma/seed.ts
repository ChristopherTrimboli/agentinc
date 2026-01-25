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

  console.log("Seeding complete.");
}

main();
