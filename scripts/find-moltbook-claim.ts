import { PrismaClient } from "../app/generated/prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL!,
}).$extends(withAccelerate());

async function main() {
  // Get ALL assistant messages that mention "register" in content
  // and look at their parts for moltbook registration results
  const messages = await prisma.chatMessage.findMany({
    where: {
      role: "assistant",
      content: { contains: "Moltbook" },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
    select: {
      id: true,
      content: true,
      parts: true,
      createdAt: true,
      chatId: true,
    },
  });

  console.log(
    `Total assistant messages mentioning Moltbook: ${messages.length}\n`,
  );

  // Filter those that have moltbook_register with successful output
  for (const msg of messages) {
    const partsStr = msg.parts ? JSON.stringify(msg.parts) : "";
    if (
      partsStr.includes("moltbook_register") &&
      partsStr.includes('"success":true')
    ) {
      console.log(
        `=== SUCCESS REGISTRATION [${msg.createdAt.toISOString()}] chat: ${msg.chatId} ===`,
      );
      console.log(`Content: ${msg.content.substring(0, 200)}`);
      console.log(`Parts: ${partsStr}`);
      console.log("");
    }
  }

  // Also check for messages with "I'll register" that have claim_url in parts
  console.log("\n=== All messages with claim_url in parts ===\n");
  for (const msg of messages) {
    const partsStr = msg.parts ? JSON.stringify(msg.parts) : "";
    if (partsStr.includes("claim_url") || partsStr.includes("claim")) {
      // Show the name from the register input
      const nameMatch = partsStr.match(/"name"\s*:\s*"([^"]+)"/);
      const claimMatch = partsStr.match(/claim_url[^"]*"([^"]+)"/);
      const apiKeyMatch = partsStr.match(/api_key[^"]*"([^"]+)"/);
      console.log(`[${msg.createdAt.toISOString()}] chat: ${msg.chatId}`);
      console.log(`  Name: ${nameMatch ? nameMatch[1] : "N/A"}`);
      console.log(`  Claim URL: ${claimMatch ? claimMatch[1] : "N/A"}`);
      console.log(`  API Key: ${apiKeyMatch ? apiKeyMatch[1] : "N/A"}`);
      console.log("");
    }
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
