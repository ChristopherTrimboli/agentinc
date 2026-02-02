// Shared constants for agent minting

// Base URL for agent pages (used in token metadata)
export const APP_BASE_URL = "https://agentinc.fun";

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
