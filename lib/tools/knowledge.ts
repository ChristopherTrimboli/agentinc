/**
 * Knowledge Base Tools (RAG)
 *
 * Allows agents to store and retrieve information from a per-user knowledge base.
 * Uses pgvector for vector similarity search with OpenAI text-embedding-3-large embeddings.
 *
 * Tools:
 * - addResource: Store new knowledge (chunks, embeds, and saves)
 * - getInformation: Retrieve relevant knowledge via semantic search
 * - deleteResource: Remove knowledge from the base
 *
 * Knowledge is scoped per-user and optionally per-agent, so different users
 * on the same agent maintain separate knowledge bases.
 */

import { tool } from "ai";
import { z } from "zod";
import {
  createResource,
  findRelevantContent,
  deleteResource,
} from "@/lib/ai/embedding";

/**
 * Create knowledge tools scoped to a specific user (and optionally agent).
 * This factory pattern matches the Twitter tools pattern where user context is needed.
 */
export function createKnowledgeTools(userId: string, agentId?: string) {
  const addResource = tool({
    description: `Add a resource to your knowledge base. Use this to store information the user shares, including facts, preferences, documents, or any knowledge they want you to remember. If the user provides a piece of knowledge unprompted, use this tool without asking for confirmation.`,
    inputSchema: z.object({
      content: z
        .string()
        .describe(
          "The content or resource to add to the knowledge base. Can be any text: facts, preferences, documents, notes, etc.",
        ),
    }),
    inputExamples: [
      {
        input: {
          content:
            "My company was founded in 2020 by Jane Doe and focuses on AI solutions for healthcare.",
        },
      },
      {
        input: {
          content:
            "Our API uses OAuth 2.0 for authentication. The base URL is https://api.example.com/v2.",
        },
      },
    ],
    execute: async ({ content }) =>
      createResource({ content, userId, agentId }),
  });

  const getInformation = tool({
    description: `Search your knowledge base to find relevant information for answering questions. Always check the knowledge base before answering questions that might have been previously stored. If no relevant information is found, say so.`,
    inputSchema: z.object({
      question: z
        .string()
        .describe("The question or topic to search for in the knowledge base."),
    }),
    inputExamples: [
      { input: { question: "When was the company founded?" } },
      { input: { question: "What authentication method does the API use?" } },
    ],
    execute: async ({ question }) =>
      findRelevantContent({ userQuery: question, userId, agentId }),
  });

  const removeResource = tool({
    description: `Delete a resource from the knowledge base. Use this when the user wants to remove previously stored information.`,
    inputSchema: z.object({
      resourceId: z
        .string()
        .describe("The ID of the resource to delete from the knowledge base."),
    }),
    execute: async ({ resourceId }) => deleteResource({ resourceId, userId }),
  });

  return {
    addResource,
    getInformation,
    removeResource,
  };
}
