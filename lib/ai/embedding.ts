/**
 * RAG Embedding Logic
 *
 * Handles chunking, embedding generation, and similarity search
 * for the knowledge base. Uses OpenAI text-embedding-3-large via AI Gateway
 * (no separate OPENAI_API_KEY needed - uses AI_GATEWAY_API_KEY).
 *
 * Embedding dimensions: 1536 (text-embedding-3-large with reduced dimensions)
 * Using reduced dimensions keeps HNSW index compatibility (max 2000)
 * while retaining higher quality than text-embedding-3-small at the same dimension count.
 */

import { embed, embedMany } from "ai";
import prisma from "@/lib/prisma";

// Use AI Gateway model string - routes through AI Gateway with AI_GATEWAY_API_KEY
const EMBEDDING_MODEL = "openai/text-embedding-3-large";
const EMBEDDING_DIMENSIONS = 1536;
const SIMILARITY_THRESHOLD = 0.5;
const MAX_RESULTS = 4;

/**
 * Split source material into chunks for embedding.
 * Uses paragraph-based splitting with a fallback to sentence boundaries.
 * Each chunk targets ~500-1000 chars to produce quality embeddings.
 */
const MAX_CHUNK_LENGTH = 1000;

export function generateChunks(input: string): string[] {
  const text = input.trim();
  if (text.length === 0) return [];

  // First, try splitting by double newlines (paragraphs)
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the limit, flush current chunk
    if (
      currentChunk.length > 0 &&
      currentChunk.length + paragraph.length + 1 > MAX_CHUNK_LENGTH
    ) {
      chunks.push(currentChunk);
      currentChunk = "";
    }

    // If a single paragraph is too long, split it by sentence boundaries
    if (paragraph.length > MAX_CHUNK_LENGTH) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = "";
      }
      // Split on sentence-ending punctuation followed by space (preserves abbreviations like "U.S.")
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if (
          currentChunk.length > 0 &&
          currentChunk.length + sentence.length + 1 > MAX_CHUNK_LENGTH
        ) {
          chunks.push(currentChunk);
          currentChunk = "";
        }
        currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
      }
    } else {
      currentChunk = currentChunk
        ? `${currentChunk}\n\n${paragraph}`
        : paragraph;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Generate embeddings for a piece of content.
 * Chunks the content, embeds each chunk, and returns pairs of (content, embedding).
 */
export async function generateEmbeddings(
  value: string,
): Promise<Array<{ embedding: number[]; content: string }>> {
  const chunks = generateChunks(value);

  if (chunks.length === 0) {
    return [];
  }

  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: chunks,
    providerOptions: {
      openai: { dimensions: EMBEDDING_DIMENSIONS },
    },
  });

  return embeddings.map((e, i) => ({ content: chunks[i], embedding: e }));
}

/**
 * Generate a single embedding vector for a query string.
 */
export async function generateEmbedding(value: string): Promise<number[]> {
  const input = value.replaceAll("\n", " ");
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: input,
    providerOptions: {
      openai: { dimensions: EMBEDDING_DIMENSIONS },
    },
  });
  return embedding;
}

/**
 * Create a resource and store its embeddings in the knowledge base.
 * Chunks the content, generates embeddings, and saves everything to the database.
 */
export async function createResource({
  content,
  userId,
  agentId,
}: {
  content: string;
  userId: string;
  agentId?: string;
}): Promise<string> {
  try {
    // Create the resource record
    const resource = await prisma.resource.create({
      data: {
        content,
        userId,
        agentId: agentId || null,
      },
    });

    // Generate embeddings for the content chunks
    const embeddings = await generateEmbeddings(content);

    if (embeddings.length > 0) {
      // Insert embeddings using raw SQL for the vector column
      for (const { content: chunkContent, embedding } of embeddings) {
        const vectorStr = `[${embedding.join(",")}]`;
        await prisma.$queryRawUnsafe(
          `INSERT INTO "Embedding" ("id", "resourceId", "content", "embedding")
           VALUES ($1, $2, $3, $4::vector(${EMBEDDING_DIMENSIONS}))`,
          crypto.randomUUID(),
          resource.id,
          chunkContent,
          vectorStr,
        );
      }
    }

    return `Resource successfully created and embedded (${embeddings.length} chunks).`;
  } catch (error) {
    console.error("[Knowledge] Failed to create resource:", error);
    return error instanceof Error && error.message.length > 0
      ? error.message
      : "Error creating resource, please try again.";
  }
}

/**
 * Find relevant content from the knowledge base using cosine similarity.
 * Embeds the user's query, searches for similar chunks, and returns the top matches.
 *
 * Scoped to a specific user, and optionally to a specific agent.
 */
export async function findRelevantContent({
  userQuery,
  userId,
  agentId,
}: {
  userQuery: string;
  userId: string;
  agentId?: string;
}): Promise<Array<{ content: string; similarity: number }> | string> {
  try {
    const queryEmbedding = await generateEmbedding(userQuery);
    const vectorStr = `[${queryEmbedding.join(",")}]`;

    // Query embeddings with cosine similarity, scoped to user (and optionally agent)
    let results: Array<{ content: string; similarity: number }>;

    if (agentId) {
      // Search within user's knowledge for a specific agent + global (no agent)
      results = await prisma.$queryRawUnsafe(
        `SELECT
          e."content",
          1 - (e."embedding" <=> $1::vector(${EMBEDDING_DIMENSIONS})) as similarity
        FROM "Embedding" e
        JOIN "Resource" r ON e."resourceId" = r."id"
        WHERE r."userId" = $2
          AND (r."agentId" = $3 OR r."agentId" IS NULL)
          AND 1 - (e."embedding" <=> $1::vector(${EMBEDDING_DIMENSIONS})) > $4
        ORDER BY similarity DESC
        LIMIT $5`,
        vectorStr,
        userId,
        agentId,
        SIMILARITY_THRESHOLD,
        MAX_RESULTS,
      );
    } else {
      // Search within user's global knowledge (no agent scope)
      results = await prisma.$queryRawUnsafe(
        `SELECT
          e."content",
          1 - (e."embedding" <=> $1::vector(${EMBEDDING_DIMENSIONS})) as similarity
        FROM "Embedding" e
        JOIN "Resource" r ON e."resourceId" = r."id"
        WHERE r."userId" = $2
          AND r."agentId" IS NULL
          AND 1 - (e."embedding" <=> $1::vector(${EMBEDDING_DIMENSIONS})) > $3
        ORDER BY similarity DESC
        LIMIT $4`,
        vectorStr,
        userId,
        SIMILARITY_THRESHOLD,
        MAX_RESULTS,
      );
    }

    if (results.length === 0) {
      return "No relevant information found in the knowledge base.";
    }

    return results;
  } catch (error) {
    console.error("[Knowledge] Failed to find relevant content:", error);
    return "Error searching knowledge base, please try again.";
  }
}

/**
 * Create multiple resources from parsed files in batch.
 * Uses embedMany for efficient batch embedding generation.
 * Returns results for each file processed.
 */
export async function createResourcesFromFiles({
  files,
  userId,
  agentId,
}: {
  files: Array<{ filename: string; textContent: string }>;
  userId: string;
  agentId?: string;
}): Promise<
  Array<{
    filename: string;
    success: boolean;
    resourceId?: string;
    chunks: number;
    error?: string;
  }>
> {
  const results: Array<{
    filename: string;
    success: boolean;
    resourceId?: string;
    chunks: number;
    error?: string;
  }> = [];

  // Process each file: create resource records and collect all chunks for batch embedding
  const allChunks: Array<{
    fileIndex: number;
    resourceId: string;
    content: string;
  }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      // Create the resource record
      const resource = await prisma.resource.create({
        data: {
          content: file.textContent,
          userId,
          agentId: agentId || null,
        },
      });

      // Generate chunks for this file
      const chunks = generateChunks(file.textContent);
      if (chunks.length === 0) {
        results.push({
          filename: file.filename,
          success: true,
          resourceId: resource.id,
          chunks: 0,
        });
        continue;
      }

      // Collect chunks for batch embedding
      for (const chunk of chunks) {
        allChunks.push({
          fileIndex: i,
          resourceId: resource.id,
          content: chunk,
        });
      }

      results.push({
        filename: file.filename,
        success: true,
        resourceId: resource.id,
        chunks: chunks.length,
      });
    } catch (error) {
      console.error(
        `[Knowledge] Failed to create resource for ${file.filename}:`,
        error,
      );
      results.push({
        filename: file.filename,
        success: false,
        chunks: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Batch embed all chunks at once with embedMany
  if (allChunks.length > 0) {
    try {
      const { embeddings } = await embedMany({
        model: EMBEDDING_MODEL,
        values: allChunks.map((c) => c.content),
        providerOptions: {
          openai: { dimensions: EMBEDDING_DIMENSIONS },
        },
      });

      // Insert all embeddings
      for (let i = 0; i < allChunks.length; i++) {
        const chunk = allChunks[i];
        const vectorStr = `[${embeddings[i].join(",")}]`;
        await prisma.$queryRawUnsafe(
          `INSERT INTO "Embedding" ("id", "resourceId", "content", "embedding")
           VALUES ($1, $2, $3, $4::vector(${EMBEDDING_DIMENSIONS}))`,
          crypto.randomUUID(),
          chunk.resourceId,
          chunk.content,
          vectorStr,
        );
      }
    } catch (error) {
      console.error("[Knowledge] Batch embedding failed:", error);
      // Mark all files with chunks as failed since embedding generation failed
      for (const result of results) {
        if (result.success && result.chunks > 0) {
          result.success = false;
          result.error = "Embedding generation failed";
        }
      }
    }
  }

  return results;
}

/**
 * Delete a resource and its embeddings from the knowledge base.
 * Cascade delete will remove associated embeddings automatically.
 */
export async function deleteResource({
  resourceId,
  userId,
}: {
  resourceId: string;
  userId: string;
}): Promise<string> {
  try {
    // Verify ownership before deleting
    const resource = await prisma.resource.findFirst({
      where: { id: resourceId, userId },
    });

    if (!resource) {
      return "Resource not found or you don't have permission to delete it.";
    }

    await prisma.resource.delete({ where: { id: resourceId } });
    return `Resource "${resourceId}" successfully deleted.`;
  } catch (error) {
    console.error("[Knowledge] Failed to delete resource:", error);
    return "Error deleting resource, please try again.";
  }
}
