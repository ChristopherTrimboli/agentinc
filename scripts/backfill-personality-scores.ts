#!/usr/bin/env bun
/**
 * Backfill Migration: Convert legacy personality types to Big Five OCEAN scores.
 *
 * Maps old personality IDs ("analytical", "creative", etc.) to Big Five dimension
 * scores with gaussian noise (+/-8) so agents of the same type aren't identical.
 * Derives MBTI type from the final scores and updates the personality field.
 *
 * Usage:
 *   bun run scripts/backfill-personality-scores.ts
 *   bun run scripts/backfill-personality-scores.ts --dry-run
 */

import { PrismaClient, Prisma } from "../app/generated/prisma/client.js";
import {
  LEGACY_TO_SCORES,
  deriveMBTI,
  gaussianNoise,
  type PersonalityScores,
  type DimensionKey,
} from "../lib/agentTraits";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. Set it in .env.local or pass it directly.",
  );
}

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL,
});
const isDryRun = process.argv.includes("--dry-run");

const DIMENSION_KEYS: DimensionKey[] = [
  "openness",
  "conscientiousness",
  "extraversion",
  "agreeableness",
  "neuroticism",
];

async function backfill() {
  console.log(
    `\n🧠 Personality Scores Backfill ${isDryRun ? "(DRY RUN)" : ""}\n`,
  );
  console.log("Finding agents with legacy personality types...\n");

  // Find all agents that have a personality set but no personalityScores yet
  const agents = await prisma.agent.findMany({
    where: {
      personality: { not: null },
      personalityScores: { equals: Prisma.DbNull },
    },
    select: {
      id: true,
      name: true,
      personality: true,
    },
  });

  console.log(`Found ${agents.length} agents to backfill.\n`);

  if (agents.length === 0) {
    console.log("Nothing to do. All agents already have personality scores.");
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const agent of agents) {
    const legacyType = agent.personality!;
    const baseScores = LEGACY_TO_SCORES[legacyType];

    if (!baseScores) {
      // Agent already has an MBTI type or unknown personality — skip
      console.log(
        `  ⏭️  ${agent.name} (${agent.id}): personality "${legacyType}" not in legacy map, skipping`,
      );
      skipped++;
      continue;
    }

    // Add gaussian noise (+/-8) to each dimension
    const noisyScores: PersonalityScores = { ...baseScores };
    for (const key of DIMENSION_KEYS) {
      const noisy = Math.round(noisyScores[key] + gaussianNoise(8));
      noisyScores[key] = Math.max(0, Math.min(100, noisy));
    }

    // Derive MBTI type from noisy scores
    const mbtiType = deriveMBTI(noisyScores);

    console.log(
      `  ✅ ${agent.name} (${agent.id}): ${legacyType} → ${mbtiType} | O:${noisyScores.openness} C:${noisyScores.conscientiousness} E:${noisyScores.extraversion} A:${noisyScores.agreeableness} N:${noisyScores.neuroticism}`,
    );

    if (!isDryRun) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          personality: mbtiType,
          personalityScores: noisyScores as unknown as Prisma.InputJsonValue,
        },
      });
    }

    updated++;
  }

  console.log(`\n${isDryRun ? "Would update" : "Updated"}: ${updated} agents`);
  console.log(`Skipped: ${skipped} agents`);
  console.log(`\nDone! ${isDryRun ? "(No changes made — dry run)" : ""}\n`);
}

backfill()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
