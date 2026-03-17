/**
 * Marketplace Types — The Hiring Protocol
 *
 * Shared types, enums, and constants for the marketplace feature.
 */

// ── Categories ──────────────────────────────────────────────────────────

export const MARKETPLACE_CATEGORIES = [
  "development",
  "design",
  "research",
  "trading",
  "social_media",
  "irl_task",
  "writing",
  "data",
  "other",
] as const;

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  development: "Development",
  design: "Design",
  research: "Research",
  trading: "Trading",
  social_media: "Social Media",
  irl_task: "IRL Task",
  writing: "Writing",
  data: "Data",
  other: "Other",
};

// ── Listing Types ───────────────────────────────────────────────────────

export const LISTING_TYPES = ["agent", "human", "corporation"] as const;
export type ListingType = (typeof LISTING_TYPES)[number];

export const PRICE_TYPES = ["hourly", "fixed", "per_use", "bidding"] as const;
export type PriceType = (typeof PRICE_TYPES)[number];

// ── Task Status ─────────────────────────────────────────────────────────

export const TASK_STATUSES = [
  "pending_escrow",
  "open",
  "assigned",
  "in_progress",
  "review",
  "completed",
  "disputed",
  "cancelled",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending_escrow: "Pending Escrow",
  open: "Open",
  assigned: "Assigned",
  in_progress: "In Progress",
  review: "In Review",
  completed: "Completed",
  disputed: "Disputed",
  cancelled: "Cancelled",
};

// ── Escrow Status ───────────────────────────────────────────────────────

export const ESCROW_STATUSES = [
  "none",
  "held",
  "released",
  "refunded",
] as const;
export type EscrowStatus = (typeof ESCROW_STATUSES)[number];

// ── Bid Status ──────────────────────────────────────────────────────────

export const BID_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "withdrawn",
] as const;
export type BidStatus = (typeof BID_STATUSES)[number];

// ── Milestone ───────────────────────────────────────────────────────────

export interface Milestone {
  title: string;
  amountSol: number;
  status: "pending" | "completed" | "released";
}

// ── API Types ───────────────────────────────────────────────────────────

export interface CreateListingInput {
  type: ListingType;
  title: string;
  description: string;
  category: MarketplaceCategory;
  skills: string[];
  priceType: PriceType;
  priceSol?: number;
  priceToken?: string;
  location?: string;
  isRemote?: boolean;
  availableHours?: string;
  agentId?: string;
  corporationId?: string;
  featuredImage?: string;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  category: MarketplaceCategory;
  requirements: string[];
  budgetSol: number;
  budgetToken?: string;
  milestones?: Milestone[];
  listingId?: string;
  location?: string;
  isRemote?: boolean;
  deadline?: string;
  tokenMint?: string;
  tokenSymbol?: string;
  tokenMetadata?: string;
  tokenLaunchWallet?: string;
  tokenLaunchSignature?: string;
  tokenConfigKey?: string;
}

// ── Escrow Types ────────────────────────────────────────────────────────

export type EscrowResult =
  | { success: true; txSignature?: string }
  | { success: false; error: string };

// ── Task Token Types ────────────────────────────────────────────────────

export const TASK_TOKEN_LAUNCH_STEP_IDS = {
  METADATA: "metadata",
  FEE_SHARE: "feeShare",
  SIGN: "sign",
  BROADCAST: "broadcast",
} as const;

export const DEFAULT_TASK_TOKEN_LAUNCH_STEPS = [
  { id: TASK_TOKEN_LAUNCH_STEP_IDS.METADATA, label: "Creating token metadata" },
  { id: TASK_TOKEN_LAUNCH_STEP_IDS.FEE_SHARE, label: "Configuring fee share" },
  { id: TASK_TOKEN_LAUNCH_STEP_IDS.SIGN, label: "Signing launch transaction" },
  { id: TASK_TOKEN_LAUNCH_STEP_IDS.BROADCAST, label: "Broadcasting to Solana" },
] as const;

export interface TaskTokenLaunchStep {
  id: string;
  label: string;
  status: "pending" | "loading" | "complete" | "error";
  error?: string;
}

export interface TaskTokenLaunchResult {
  tokenMint: string;
  tokenSymbol: string;
  tokenMetadata: string;
  launchSignature: string;
  configKey: string;
}
