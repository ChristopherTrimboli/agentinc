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

import { z } from "zod";
import {
  createResource,
  findRelevantContent,
  deleteResource,
} from "@/lib/ai/embedding";
import { billedTool } from "./billedTool";
import { KNOWLEDGE_PRICING } from "@/lib/x402/config";
import type { BillingContext } from "@/lib/x402";

/**
 * Create knowledge tools scoped to a specific user (and optionally agent).
 *
 * Each tool is wrapped with billedTool() which auto-charges the user
 * the real OpenAI embedding cost via x402 when the tool succeeds.
 * Costs are sourced from KNOWLEDGE_PRICING (lib/x402/config.ts).
 *
 * @param userId - User ID for scoping the knowledge base
 * @param agentId - Optional agent ID for per-agent knowledge
 * @param billingContext - Optional x402 billing context for usage charging
 */
export function createKnowledgeTools(
  userId: string,
  agentId?: string,
  billingContext?: BillingContext,
) {
  const addResource = billedTool(
    "addResource",
    {
      description: `Add a resource to your knowledge base. Use this to store information the user shares, including facts, preferences, documents, or any knowledge they want you to remember. If the user provides a piece of knowledge unprompted, use this tool without asking for confirmation.`,
      inputSchema: z.object({
        content: z
          .string()
          .max(10 * 1024 * 1024, "Content must be less than 10MB")
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
      category: "Knowledge",
      cost: KNOWLEDGE_PRICING.addResource,
      execute: async ({ content }: { content: string }) =>
        createResource({ content, userId, agentId }),
    },
    billingContext,
  );

  const getInformation = billedTool(
    "getInformation",
    {
      description: `Search your knowledge base to find relevant information for answering questions. Always check the knowledge base before answering questions that might have been previously stored. If no relevant information is found, say so.`,
      inputSchema: z.object({
        question: z
          .string()
          .describe(
            "The question or topic to search for in the knowledge base.",
          ),
      }),
      inputExamples: [
        { input: { question: "When was the company founded?" } },
        {
          input: {
            question: "What authentication method does the API use?",
          },
        },
      ],
      category: "Knowledge",
      cost: KNOWLEDGE_PRICING.getInformation,
      execute: async ({ question }: { question: string }) =>
        findRelevantContent({ userQuery: question, userId, agentId }),
    },
    billingContext,
  );

  const removeResource = billedTool(
    "removeResource",
    {
      description: `Delete a resource from the knowledge base. Use this when the user wants to remove previously stored information.`,
      inputSchema: z.object({
        resourceId: z
          .string()
          .describe(
            "The ID of the resource to delete from the knowledge base.",
          ),
      }),
      category: "Knowledge",
      cost: KNOWLEDGE_PRICING.removeResource,
      execute: async ({ resourceId }: { resourceId: string }) =>
        deleteResource({ resourceId, userId }),
    },
    billingContext,
  );

  return {
    addResource,
    getInformation,
    removeResource,
  };
}
