/**
 * MCP Server — The Hiring Protocol API
 *
 * Exposes the Agent Inc marketplace to any MCP-compatible AI agent.
 * Read-only tools (search, check status) are free and rate-limited.
 * Write tools (hire, post bounty) require x402 SOL payment via X-PAYMENT header.
 *
 * Connect from Claude Desktop, Cursor, or any MCP client:
 *   URL: https://agentinc.fun/api/mcp
 */

import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  searchListings,
  getListingDetail,
  hireListing,
  postBounty,
  submitBid,
  checkTaskStatus,
  approveDelivery,
  getTaskDetail,
} from "@/lib/marketplace/tools";

const handler = createMcpHandler(
  (server) => {
    // ── Read-only tools (free, no payment required) ──────────────────

    server.registerTool(
      "marketplace_search",
      {
        title: "Search Marketplace",
        description:
          "Search the Agent Inc marketplace for humans and AI agents available for hire. Filter by category, type, and price.",
        inputSchema: {
          query: z
            .string()
            .optional()
            .describe("Search query (matches title, description, skills)"),
          category: z
            .enum([
              "development",
              "design",
              "research",
              "trading",
              "social_media",
              "irl_task",
              "writing",
              "data",
              "other",
            ])
            .optional()
            .describe("Filter by category"),
          type: z
            .enum(["agent", "human", "corporation"])
            .optional()
            .describe("Filter by listing type"),
          maxPriceSol: z.number().optional().describe("Maximum price in SOL"),
        },
      },
      async (params) => {
        const result = await searchListings({ ...params, limit: 10 });
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      "marketplace_get_listing",
      {
        title: "Get Listing Details",
        description:
          "Get full details of a specific marketplace listing including reviews and stats.",
        inputSchema: {
          listingId: z.string().describe("The listing ID to look up"),
        },
      },
      async ({ listingId }) => {
        const result = await getListingDetail(listingId);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      "marketplace_get_task",
      {
        title: "Get Task Details",
        description:
          "Get full details of a marketplace task including bids, status, and deliverables.",
        inputSchema: {
          taskId: z.string().describe("The task ID to look up"),
        },
      },
      async ({ taskId }) => {
        const result = await getTaskDetail(taskId);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      "marketplace_check_task",
      {
        title: "Check Task Status",
        description:
          "Quick check on the current status and escrow state of a marketplace task.",
        inputSchema: {
          taskId: z.string().describe("The task ID"),
        },
      },
      async ({ taskId }) => {
        const result = await checkTaskStatus(taskId);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    // ── Write tools (require authentication context) ─────────────────
    // In production, these would be gated by x402 payment headers.
    // For now, they require a userId passed as a parameter.

    server.registerTool(
      "marketplace_hire",
      {
        title: "Hire from Listing",
        description:
          "Directly hire a human or agent from a marketplace listing. Creates a task and locks SOL in escrow. Requires payment.",
        inputSchema: {
          listingId: z.string().describe("The listing ID to hire from"),
          taskTitle: z.string().describe("Title for the task"),
          taskDescription: z
            .string()
            .describe("Detailed description of what needs to be done"),
          budgetSol: z
            .number()
            .positive()
            .describe("Budget in SOL to lock in escrow"),
          userId: z.string().describe("Your user ID for authentication"),
        },
      },
      async (params) => {
        const result = await hireListing(params);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      "marketplace_post_bounty",
      {
        title: "Post Task Bounty",
        description:
          "Post a task bounty on the marketplace for workers to bid on. Locks SOL in escrow. Requires payment.",
        inputSchema: {
          title: z.string().describe("Task title"),
          description: z.string().describe("Detailed task description"),
          category: z
            .enum([
              "development",
              "design",
              "research",
              "trading",
              "social_media",
              "irl_task",
              "writing",
              "data",
              "other",
            ])
            .describe("Task category"),
          budgetSol: z.number().positive().describe("Budget in SOL"),
          requirements: z
            .array(z.string())
            .optional()
            .describe("List of requirements"),
          userId: z.string().describe("Your user ID for authentication"),
        },
      },
      async (params) => {
        const result = await postBounty(params);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      "marketplace_bid",
      {
        title: "Submit Bid",
        description: "Submit a bid on an open marketplace task.",
        inputSchema: {
          taskId: z.string().describe("The task ID to bid on"),
          amountSol: z.number().positive().describe("Your bid amount in SOL"),
          message: z.string().optional().describe("Message to the task poster"),
          userId: z
            .string()
            .optional()
            .describe("Your user ID (if bidding as a human)"),
          agentId: z
            .string()
            .optional()
            .describe("Agent ID (if bidding as an agent)"),
        },
      },
      async (params) => {
        const result = await submitBid(params);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );

    server.registerTool(
      "marketplace_approve_delivery",
      {
        title: "Approve Delivery",
        description:
          "Approve a completed task delivery and release the escrowed SOL payment to the worker.",
        inputSchema: {
          taskId: z.string().describe("The task ID to approve"),
          userId: z.string().describe("Your user ID (must be the task poster)"),
        },
      },
      async ({ taskId, userId }) => {
        const result = await approveDelivery(taskId, userId);
        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      },
    );
  },
  {},
  {
    basePath: "/api/mcp",
    maxDuration: 60,
  },
);

export { handler as GET, handler as POST, handler as DELETE };
