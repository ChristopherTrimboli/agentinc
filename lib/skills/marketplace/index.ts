/**
 * Marketplace Skill
 *
 * The Web3 hiring protocol for AI agents and humans. Search listings,
 * hire workers, post bounties, bid on tasks, and manage escrow payments.
 */

import type { Skill, SkillConfig } from "../types";
import { tool } from "ai";
import { z } from "zod";
import {
  searchListings,
  hireListing,
  postBounty,
  submitBid,
  checkTaskStatus,
  approveDelivery,
  getListingDetail,
  getTaskDetail,
} from "@/lib/marketplace/tools";

export const MARKETPLACE_SYSTEM_PROMPT = `
## Marketplace Integration

You have access to the Agent Inc Marketplace — a Web3 hiring protocol where humans and AI agents can be hired for tasks.

### Available Marketplace Tools:
- **marketplace_search**: Search for humans and agents available for hire
- **marketplace_get_listing**: Get full details of a specific listing
- **marketplace_hire**: Directly hire someone from a listing (creates task + escrow)
- **marketplace_post_bounty**: Post a task bounty for workers to bid on
- **marketplace_bid**: Submit a bid on an open task
- **marketplace_check_task**: Check the status of a task
- **marketplace_approve_delivery**: Approve a completed delivery and release payment
- **marketplace_get_task**: Get full details of a task

### When to use Marketplace tools:
- User asks to hire someone → Use marketplace_search then marketplace_hire
- User needs a task done → Use marketplace_post_bounty
- User wants to check on a task → Use marketplace_check_task
- User needs IRL help (photos, delivery, verification) → Search for humans in the marketplace
- User wants to bid on available work → Use marketplace_bid

### Guidelines:
- Always confirm budget with the user before creating escrow
- For IRL tasks, filter by location when possible
- Show price in SOL with USD estimate when available
`;

export const MARKETPLACE_FUNCTIONS = [
  {
    id: "search",
    name: "Search Marketplace",
    description: "Find humans and agents for hire",
  },
  {
    id: "get_listing",
    name: "Get Listing",
    description: "View listing details",
  },
  { id: "hire", name: "Hire", description: "Directly hire from a listing" },
  {
    id: "post_bounty",
    name: "Post Bounty",
    description: "Post a task for bids",
  },
  { id: "bid", name: "Submit Bid", description: "Bid on an open task" },
  { id: "check_task", name: "Check Task", description: "Check task status" },
  {
    id: "approve_delivery",
    name: "Approve Delivery",
    description: "Approve and release payment",
  },
  { id: "get_task", name: "Get Task", description: "View task details" },
];

export const marketplaceSkill: Skill = {
  metadata: {
    id: "marketplace",
    name: "Marketplace",
    version: "1.0.0",
    description:
      "Hire humans and AI agents for tasks via the Web3 hiring protocol",
    category: "productivity",
    icon: "🛒",
    tags: ["hiring", "marketplace", "tasks", "bounties", "x402"],
    functions: MARKETPLACE_FUNCTIONS,
  },

  systemPrompt: MARKETPLACE_SYSTEM_PROMPT,

  validate(): true | string {
    return true;
  },

  createTools(config: SkillConfig) {
    const userId = config.options?.userId as string | undefined;
    const agentId = config.options?.agentId as string | undefined;

    const searchSchema = z.object({
      query: z.string().optional().describe("Search query"),
      category: z.string().optional().describe("Category filter"),
      type: z
        .enum(["agent", "human", "corporation"])
        .optional()
        .describe("Listing type"),
      maxPriceSol: z.number().optional().describe("Maximum price in SOL"),
    });

    const listingIdSchema = z.object({
      listingId: z.string().describe("The listing ID"),
    });

    const taskIdSchema = z.object({
      taskId: z.string().describe("The task ID"),
    });

    const hireSchema = z.object({
      listingId: z.string().describe("The listing ID to hire from"),
      taskTitle: z.string().describe("Title for the task"),
      taskDescription: z
        .string()
        .describe("Detailed description of what needs to be done"),
      budgetSol: z.number().describe("Budget in SOL to lock in escrow"),
    });

    const bountySchema = z.object({
      title: z.string().describe("Task title"),
      description: z.string().describe("Detailed task description"),
      category: z.string().describe("Task category"),
      budgetSol: z.number().describe("Budget in SOL"),
      requirements: z
        .array(z.string())
        .optional()
        .describe("List of requirements"),
    });

    const bidSchema = z.object({
      taskId: z.string().describe("The task ID to bid on"),
      amountSol: z.number().describe("Bid amount in SOL"),
      message: z.string().optional().describe("Message to the task poster"),
    });

    return {
      search: tool({
        description:
          "Search the marketplace for humans and agents available for hire",
        inputSchema: searchSchema,
        execute: async (params: z.infer<typeof searchSchema>) => {
          return searchListings({ ...params, limit: 10 });
        },
      }),

      get_listing: tool({
        description: "Get full details of a marketplace listing",
        inputSchema: listingIdSchema,
        execute: async ({ listingId }: z.infer<typeof listingIdSchema>) => {
          return getListingDetail(listingId);
        },
      }),

      hire: tool({
        description:
          "Directly hire someone from a marketplace listing. Creates a task with SOL escrow.",
        inputSchema: hireSchema,
        execute: async (params: z.infer<typeof hireSchema>) => {
          if (!userId)
            return {
              success: false,
              error: "Authentication required for hiring",
            };
          return hireListing({ ...params, userId });
        },
      }),

      post_bounty: tool({
        description:
          "Post a task bounty on the marketplace for workers to bid on",
        inputSchema: bountySchema,
        execute: async (params: z.infer<typeof bountySchema>) => {
          if (!userId)
            return { success: false, error: "Authentication required" };
          return postBounty({ ...params, userId });
        },
      }),

      bid: tool({
        description: "Submit a bid on an open marketplace task",
        inputSchema: bidSchema,
        execute: async (params: z.infer<typeof bidSchema>) => {
          return submitBid({ ...params, userId, agentId });
        },
      }),

      check_task: tool({
        description: "Check the current status of a marketplace task",
        inputSchema: taskIdSchema,
        execute: async ({ taskId }: z.infer<typeof taskIdSchema>) => {
          return checkTaskStatus(taskId);
        },
      }),

      approve_delivery: tool({
        description:
          "Approve a task delivery and release the escrow payment to the worker",
        inputSchema: taskIdSchema,
        execute: async ({ taskId }: z.infer<typeof taskIdSchema>) => {
          if (!userId)
            return { success: false, error: "Authentication required" };
          return approveDelivery(taskId, userId);
        },
      }),

      get_task: tool({
        description:
          "Get full details of a marketplace task including bids and status",
        inputSchema: taskIdSchema,
        execute: async ({ taskId }: z.infer<typeof taskIdSchema>) => {
          return getTaskDetail(taskId);
        },
      }),
    };
  },
};

export default marketplaceSkill;
