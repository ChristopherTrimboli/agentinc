// Shared constants for agent minting

// Base URL for agent pages (used in token metadata)
export const APP_BASE_URL = "https://agentinc.fun";

// Main AGENTINC platform token mint address (bags.fm)
// Holders get 20% off all AI chat costs when paying with SOL.
export const AGENTINC_TOKEN_MINT =
  "AwGg6CLP5P5LreVbgD4RuSmwXgnu71SmVr6GYsDaBAGS";

// Estimated transaction fees (in SOL) for minting process
// Covers: metadata creation, fee share config, launch transaction
export const MINT_TX_FEE_ESTIMATE = 0.02;

// Minimum SOL required for fees alone (without initial buy)
export const MIN_SOL_FOR_FEES = 0.01;

// Launch steps for the minting process
export const LAUNCH_STEP_IDS = {
  BALANCE: "balance",
  METADATA: "metadata",
  FEE_SHARE: "feeShare",
  SIGN: "sign",
  BROADCAST: "broadcast",
  SAVE: "save",
} as const;

// Step configuration
export const DEFAULT_LAUNCH_STEPS = [
  { id: LAUNCH_STEP_IDS.METADATA, label: "Creating metadata" },
  { id: LAUNCH_STEP_IDS.FEE_SHARE, label: "Fee config" },
  { id: LAUNCH_STEP_IDS.SIGN, label: "Signing transaction" },
  { id: LAUNCH_STEP_IDS.BROADCAST, label: "Broadcasting" },
  { id: LAUNCH_STEP_IDS.SAVE, label: "Saving agent" },
] as const;

// Wizard step configuration
export const MINT_WIZARD_STEPS = [
  { title: "Randomize", stepIndex: 0 },
  { title: "Generate Image", stepIndex: 1 },
  { title: "Configure", stepIndex: 2 },
  { title: "Launch", stepIndex: 3 },
] as const;

// Bags fee structure types (maps to BAGS_CONFIG_TYPE from @bagsfm/bags-sdk)
export const BAGS_FEE_STRUCTURES = {
  DEFAULT: {
    id: "fa29606e-5e48-4c37-827f-4b03d58ee23d",
    label: "Standard (2%)",
    description: "2% fees both pre and post migration",
    preFee: "2%",
    postFee: "2%",
    compounding: false,
  },
  LOW_PRE: {
    id: "d16d3585-6488-4a6c-9a6f-e6c39ca0fda3",
    label: "Low Pre-Migration (0.25%)",
    description: "0.25% fees pre-migration, 1% post-migration, 50% compounding",
    preFee: "0.25%",
    postFee: "1%",
    compounding: true,
  },
  LOW_POST: {
    id: "a7c8e1f2-3d4b-5a6c-9e0f-1b2c3d4e5f6a",
    label: "Low Post-Migration (0.25%)",
    description: "1% fees pre-migration, 0.25% post-migration, 50% compounding",
    preFee: "1%",
    postFee: "0.25%",
    compounding: true,
  },
} as const;

export type BagsFeeStructureKey = keyof typeof BAGS_FEE_STRUCTURES;
