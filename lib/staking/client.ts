import { SolanaStakingClient } from "@streamflow/staking";
import { ICluster } from "@streamflow/common";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import prisma from "@/lib/prisma";
import BN from "bn.js";

// ─── Singleton client ──────────────────────────────────────────────

let _client: SolanaStakingClient | null = null;

export function getStakingClient(): SolanaStakingClient {
  if (!_client) {
    _client = new SolanaStakingClient({
      clusterUrl: SOLANA_RPC_URL,
      cluster: ICluster.Mainnet,
    });
  }
  return _client;
}

let _connection: Connection | null = null;

export function getStakingConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(SOLANA_RPC_URL, "confirmed");
  }
  return _connection;
}

// ─── Fake invoker for prepare* methods ────────────────────────────
// Streamflow's prepare methods need invoker.publicKey for PDA derivation.
// We cast to `any` because the full SignerWalletAdapter interface has many
// properties we don't need for prepare (read-only) operations.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createReadOnlyInvoker(walletAddress: string): any {
  return {
    publicKey: new PublicKey(walletAddress),
    signTransaction: async () => {
      throw new Error("Read-only invoker cannot sign");
    },
    signAllTransactions: async () => {
      throw new Error("Read-only invoker cannot sign");
    },
  };
}

// ─── Utility helpers ──────────────────────────────────────────────

/**
 * Safely extract a number from a BN-like value.
 * Handles both BN objects (with .toNumber()) and raw numbers.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function bnToNumber(val: any): number {
  if (val != null && typeof val.toNumber === "function") {
    return val.toNumber();
  }
  return Number(val ?? 0);
}

/**
 * Convert a human-readable token amount to raw (smallest unit) BN.
 * Uses string manipulation to avoid floating-point precision loss.
 */
export function toRawAmount(amount: number, decimals: number): BN {
  const str = amount.toString();
  const [whole, frac = ""] = str.split(".");
  const paddedFrac = frac.padEnd(decimals, "0").slice(0, decimals);
  return new BN(whole + paddedFrac);
}

// ─── Staking pool defaults ────────────────────────────────────────

/** Minimum stake duration: 7 days in seconds */
export const MIN_STAKE_DURATION = 7 * 24 * 60 * 60;
/** Maximum stake duration: 180 days in seconds */
export const MAX_STAKE_DURATION = 180 * 24 * 60 * 60;
/** Reward multiplier: 4x for max duration (powered by 10^9) */
export const MAX_WEIGHT = new BN(4_000_000_000);

// Lock duration options (seconds)
export const LOCK_DURATIONS: Record<number, number> = {
  7: 7 * 24 * 60 * 60,
  30: 30 * 24 * 60 * 60,
  90: 90 * 24 * 60 * 60,
  180: 180 * 24 * 60 * 60,
};

// ─── Read helpers ─────────────────────────────────────────────────

/**
 * Search for existing staking pools for a token mint.
 */
export async function findStakePool(tokenMint: string) {
  const client = getStakingClient();
  const pools = await client.searchStakePools({
    mint: new PublicKey(tokenMint),
  });
  // Return the first pool found for this mint
  return pools.length > 0 ? pools[0] : null;
}

/**
 * Resolve the stake pool address for an agent, checking DB first then on-chain.
 */
export async function resolveStakePoolAddress(
  agentId: string,
  tokenMint: string,
): Promise<string | null> {
  const trackedPool = await prisma.stakingPool.findUnique({
    where: { agentId },
    select: { stakePoolAddress: true },
  });
  if (trackedPool?.stakePoolAddress) return trackedPool.stakePoolAddress;

  const found = await findStakePool(tokenMint);
  return found ? found.publicKey.toBase58() : null;
}

/**
 * Get all stake entries for a user in a specific pool.
 */
export async function getUserStakeEntries(
  walletAddress: string,
  stakePoolAddress: string,
) {
  const client = getStakingClient();
  const entries = await client.searchStakeEntries({
    payer: new PublicKey(walletAddress),
    stakePool: new PublicKey(stakePoolAddress),
  });
  return entries;
}

/**
 * Get reward pools for a stake pool.
 */
export async function getRewardPools(stakePoolAddress: string) {
  const client = getStakingClient();
  const pools = await client.searchRewardPools({
    stakePool: new PublicKey(stakePoolAddress),
  });
  return pools;
}

/**
 * Get user's SPL token balance for a specific mint.
 */
export async function getTokenBalance(
  walletAddress: string,
  tokenMint: string,
): Promise<number> {
  const connection = getStakingConnection();
  try {
    const wallet = new PublicKey(walletAddress);
    const mint = new PublicKey(tokenMint);
    const ata = await getAssociatedTokenAddress(mint, wallet);
    const account = await connection.getTokenAccountBalance(ata);
    return account.value.uiAmount ?? 0;
  } catch {
    // Account doesn't exist or other error
    return 0;
  }
}

/**
 * Get SPL token decimals for a mint.
 */
export async function getTokenDecimals(tokenMint: string): Promise<number> {
  const connection = getStakingConnection();
  try {
    const mintPk = new PublicKey(tokenMint);
    const mintInfo = await connection.getParsedAccountInfo(mintPk);
    if (mintInfo.value && "parsed" in mintInfo.value.data) {
      return mintInfo.value.data.parsed?.info?.decimals ?? 6;
    }
    return 6;
  } catch {
    return 6;
  }
}

// ─── ATA helpers ──────────────────────────────────────────────────

/**
 * Detect which token program owns a mint (SPL Token vs Token-2022).
 * Falls back to classic TOKEN_PROGRAM_ID if detection fails.
 */
async function detectTokenProgram(
  connection: Connection,
  mint: PublicKey,
): Promise<PublicKey> {
  try {
    const mintAccount = await connection.getAccountInfo(mint);
    if (mintAccount) {
      // Check if the mint is owned by Token-2022
      if (mintAccount.owner.equals(TOKEN_2022_PROGRAM_ID)) {
        return TOKEN_2022_PROGRAM_ID;
      }
    }
  } catch {
    // Fall through to default
  }
  return TOKEN_PROGRAM_ID;
}

/**
 * Build an instruction to create an ATA if it doesn't already exist.
 * Auto-detects Token Program vs Token-2022 from the mint's on-chain owner.
 * Returns null if the ATA already exists.
 */
async function createAtaIfNeeded(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
): Promise<TransactionInstruction | null> {
  // Auto-detect which token program this mint belongs to
  const tokenProgram = await detectTokenProgram(connection, mint);
  const ata = await getAssociatedTokenAddress(mint, owner, true, tokenProgram);
  try {
    const account = await connection.getAccountInfo(ata);
    if (account) return null; // Already exists
  } catch {
    // Account doesn't exist, need to create
  }
  return createAssociatedTokenAccountInstruction(
    payer,
    ata,
    owner,
    mint,
    tokenProgram,
  );
}

// ─── Transaction builders ─────────────────────────────────────────

/**
 * Build a create stake pool transaction. Returns serialized unsigned transaction.
 */
export async function buildCreatePoolTransaction(params: {
  walletAddress: string;
  tokenMint: string;
  nonce?: number;
}): Promise<{ transaction: string; stakePoolAddress: string }> {
  const client = getStakingClient();
  const connection = getStakingConnection();
  const invoker = createReadOnlyInvoker(params.walletAddress);
  const mint = new PublicKey(params.tokenMint);
  const nonce = params.nonce ?? 0;

  // Get the instructions + derived public key
  const result = await client.prepareCreateStakePoolInstructions(
    {
      maxWeight: MAX_WEIGHT,
      maxDuration: new BN(MAX_STAKE_DURATION),
      minDuration: new BN(MIN_STAKE_DURATION),
      mint,
      permissionless: true,
      nonce,
    },
    { invoker },
  );

  // Result has .ixs (instructions array) and .publicKey (the pool PDA)
  const ixs = result.ixs;
  const stakePoolAddress = result.publicKey.toBase58();

  // Build transaction
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction();
  transaction.add(...ixs);
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = new PublicKey(params.walletAddress);

  const transactionBase64 = Buffer.from(
    transaction.serialize({ requireAllSignatures: false }),
  ).toString("base64");

  return { transaction: transactionBase64, stakePoolAddress };
}

/**
 * Build a create reward pool transaction for an existing stake pool.
 * This sets up the rewards distribution so stakers can earn.
 *
 * @param rewardRate - Reward rate per period per staked token (e.g., 0.001 = 0.1%)
 * @param rewardPeriodSeconds - How often rewards accrue (default: 86400 = daily)
 */
export async function buildCreateRewardPoolTransaction(params: {
  walletAddress: string;
  stakePoolAddress: string;
  tokenMint: string;
  stakePoolNonce?: number;
  rewardRate?: number;
  rewardPeriodSeconds?: number;
  nonce?: number;
}): Promise<string> {
  const client = getStakingClient();
  const connection = getStakingConnection();
  const invoker = createReadOnlyInvoker(params.walletAddress);

  const stakePool = new PublicKey(params.stakePoolAddress);
  const rewardMint = new PublicKey(params.tokenMint);
  const payer = new PublicKey(params.walletAddress);
  const nonce = params.nonce ?? 0;
  const stakePoolNonce = params.stakePoolNonce ?? 0;

  // Get token decimals
  const decimals = await getTokenDecimals(params.tokenMint);

  // Calculate reward amount from rate
  // Default: 0.1% of staked tokens per day
  const rate = params.rewardRate ?? 0.001;
  const { calculateRewardAmountFromRate } = await import("@streamflow/staking");
  const rewardAmount = calculateRewardAmountFromRate(rate, decimals, decimals);

  // Reward period: default 1 day
  const rewardPeriod = new BN(params.rewardPeriodSeconds ?? 86400);

  // Detect the token program for the reward mint
  const tokenProgram = await detectTokenProgram(connection, rewardMint);

  // Create reward pool instructions
  const result = await client.prepareCreateRewardPoolInstructions(
    {
      stakePool,
      stakePoolMint: rewardMint,
      stakePoolNonce,
      rewardMint,
      rewardAmount,
      rewardPeriod,
      permissionless: true, // Anyone can fund the reward pool
      nonce,
      lastClaimPeriodOpt: null,
      tokenProgramId: tokenProgram,
    },
    { invoker },
  );

  // Fix: Borsh version mismatch can cause Option<u64> to not be serialized.
  // The on-chain program expects lastClaimPeriodOpt as a Borsh Option (1 byte None tag).
  // If the instruction data is missing that byte (26 instead of 27), append it.
  const expectedMinLength = 8 + 1 + 8 + 8 + 1 + 1; // disc + nonce + amount + period + bool + option_none
  for (const ix of result.ixs) {
    if (ix.data.length === expectedMinLength - 1) {
      // Missing the Option None tag - append 0x00
      console.log(
        "[Staking] Patching reward pool instruction: adding missing Option None byte",
      );
      const patched = Buffer.alloc(ix.data.length + 1);
      patched.set(ix.data);
      patched[ix.data.length] = 0; // None tag
      ix.data = patched;
    }
  }

  // Build transaction
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction();
  transaction.add(...result.ixs);
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = payer;

  return Buffer.from(
    transaction.serialize({ requireAllSignatures: false }),
  ).toString("base64");
}

/**
 * Build a fund reward pool transaction. Transfers tokens from the funder into the reward vault.
 */
export async function buildFundRewardPoolTransaction(params: {
  walletAddress: string;
  stakePoolAddress: string;
  tokenMint: string;
  amount: number; // Human-readable amount (e.g., 1000 = 1000 tokens)
  rewardPoolNonce?: number;
}): Promise<string> {
  const client = getStakingClient();
  const connection = getStakingConnection();
  const invoker = createReadOnlyInvoker(params.walletAddress);

  const stakePool = new PublicKey(params.stakePoolAddress);
  const rewardMint = new PublicKey(params.tokenMint);
  const payer = new PublicKey(params.walletAddress);
  const nonce = params.rewardPoolNonce ?? 0;

  // Get decimals and convert amount
  const decimals = await getTokenDecimals(params.tokenMint);
  const rawAmount = toRawAmount(params.amount, decimals);

  // Detect token program
  const tokenProgram = await detectTokenProgram(connection, rewardMint);

  // Build fund instructions
  const result = await client.prepareFundPoolInstructions(
    {
      stakePool,
      stakePoolMint: rewardMint,
      amount: rawAmount,
      nonce,
      rewardMint,
      feeValue: null,
      tokenProgramId: tokenProgram,
    },
    { invoker },
  );

  // Build transaction
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction();
  transaction.add(...result.ixs);
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = payer;

  return Buffer.from(
    transaction.serialize({ requireAllSignatures: false }),
  ).toString("base64");
}

/**
 * Build a stake transaction. Returns serialized unsigned transaction.
 *
 * Handles:
 * - Pre-creating ATAs for the stake mint (receipt token) and original token
 * - Falling back to plain stake if no reward pools exist
 */
export async function buildStakeTransaction(params: {
  walletAddress: string;
  stakePoolAddress: string;
  stakePoolMint: string;
  amount: number;
  durationSeconds: number;
  nonce: number;
  rewardPools: Array<{ nonce: number; mint: string }>;
}): Promise<string> {
  const client = getStakingClient();
  const connection = getStakingConnection();
  const invoker = createReadOnlyInvoker(params.walletAddress);

  const stakePool = new PublicKey(params.stakePoolAddress);
  const stakePoolMint = new PublicKey(params.stakePoolMint);
  const payer = new PublicKey(params.walletAddress);

  // Get token decimals for amount conversion
  const decimals = await getTokenDecimals(params.stakePoolMint);
  const rawAmount = toRawAmount(params.amount, decimals);
  const duration = new BN(params.durationSeconds);

  // ── Read the real stake mint from pool's on-chain data ──────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const poolData = (await client.getStakePool(params.stakePoolAddress)) as any;
  const stakeMint: PublicKey = poolData.stakeMint;

  // ── Pre-create necessary ATAs ──────────────────────────────
  const preIxs: TransactionInstruction[] = [];

  // 1. ATA for the original token (user should have it, but ensure)
  const tokenAtaIx = await createAtaIfNeeded(
    connection,
    payer,
    stakePoolMint,
    payer,
  );
  if (tokenAtaIx) preIxs.push(tokenAtaIx);

  // 2. ATA for the stake mint (receipt token from Streamflow pool data)
  const stakeMintAtaIx = await createAtaIfNeeded(
    connection,
    payer,
    stakeMint,
    payer,
  );
  if (stakeMintAtaIx) preIxs.push(stakeMintAtaIx);

  // ── Build stake instructions ───────────────────────────────
  let stakeIxs: TransactionInstruction[];

  if (params.rewardPools.length > 0) {
    // Stake + create reward entries in one go
    const result = await client.prepareStakeAndCreateEntriesInstructions(
      {
        stakePool,
        stakePoolMint,
        amount: rawAmount,
        duration,
        nonce: params.nonce,
        rewardPools: params.rewardPools.map((rp) => ({
          nonce: rp.nonce,
          mint: new PublicKey(rp.mint),
          rewardPoolType: "fixed" as const,
        })),
      },
      { invoker },
    );
    stakeIxs = result.ixs;
  } else {
    // No reward pools - plain stake only
    const result = await client.prepareStakeInstructions(
      {
        stakePool,
        stakePoolMint,
        amount: rawAmount,
        duration,
        nonce: params.nonce,
      },
      { invoker },
    );
    stakeIxs = result.ixs;
  }

  // ── Build full transaction ─────────────────────────────────
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction();
  // Add ATA creation first, then stake
  if (preIxs.length > 0) transaction.add(...preIxs);
  transaction.add(...stakeIxs);
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = payer;

  // Serialize unsigned
  return Buffer.from(
    transaction.serialize({ requireAllSignatures: false }),
  ).toString("base64");
}

/**
 * Build an unstake + claim rewards transaction. Returns serialized unsigned transaction.
 */
export async function buildUnstakeTransaction(params: {
  walletAddress: string;
  stakePoolAddress: string;
  stakePoolMint: string;
  stakeNonce: number;
  rewardPools: Array<{ nonce: number; mint: string }>;
}): Promise<string> {
  const client = getStakingClient();
  const connection = getStakingConnection();
  const invoker = createReadOnlyInvoker(params.walletAddress);

  const stakePool = new PublicKey(params.stakePoolAddress);
  const stakePoolMint = new PublicKey(params.stakePoolMint);
  const payer = new PublicKey(params.walletAddress);

  // ── Pre-create ATAs for reward mints if needed ─────────────
  const preIxs: TransactionInstruction[] = [];

  for (const rp of params.rewardPools) {
    const rewardMint = new PublicKey(rp.mint);
    const ataIx = await createAtaIfNeeded(connection, payer, rewardMint, payer);
    if (ataIx) preIxs.push(ataIx);
  }

  // ── Build unstake instructions ─────────────────────────────
  let unstakeIxs: TransactionInstruction[];

  if (params.rewardPools.length > 0) {
    // Unstake + claim all rewards
    const result = await client.prepareUnstakeAndClaimInstructions(
      {
        stakePool,
        stakePoolMint,
        nonce: params.stakeNonce,
        rewardPools: params.rewardPools.map((rp) => ({
          nonce: rp.nonce,
          mint: new PublicKey(rp.mint),
          rewardPoolType: "fixed" as const,
        })),
      },
      { invoker },
    );
    unstakeIxs = result.ixs;
  } else {
    // Plain unstake without reward claiming
    const result = await client.prepareUnstakeInstructions(
      {
        stakePool,
        stakePoolMint,
        nonce: params.stakeNonce,
      },
      { invoker },
    );
    unstakeIxs = result.ixs;
  }

  // ── Build full transaction ─────────────────────────────────
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction();
  if (preIxs.length > 0) transaction.add(...preIxs);
  transaction.add(...unstakeIxs);
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = payer;

  return Buffer.from(
    transaction.serialize({ requireAllSignatures: false }),
  ).toString("base64");
}

/**
 * Build a claim rewards transaction (without unstaking).
 * Claims accrued rewards for a staked position while keeping it staked.
 */
export async function buildClaimRewardsTransaction(params: {
  walletAddress: string;
  stakePoolAddress: string;
  stakePoolMint: string;
  stakeNonce: number;
  rewardPools: Array<{ nonce: number; mint: string }>;
}): Promise<string> {
  const client = getStakingClient();
  const connection = getStakingConnection();
  const invoker = createReadOnlyInvoker(params.walletAddress);

  const stakePool = new PublicKey(params.stakePoolAddress);
  const stakePoolMint = new PublicKey(params.stakePoolMint);
  const payer = new PublicKey(params.walletAddress);

  // ── Pre-create ATAs for reward mints if needed ─────────────
  const preIxs: TransactionInstruction[] = [];

  for (const rp of params.rewardPools) {
    const rewardMint = new PublicKey(rp.mint);
    const ataIx = await createAtaIfNeeded(connection, payer, rewardMint, payer);
    if (ataIx) preIxs.push(ataIx);
  }

  // ── Build claim instructions for each reward pool ──────────
  const claimIxs: TransactionInstruction[] = [];

  for (const rp of params.rewardPools) {
    const result = await client.prepareClaimRewardsInstructions(
      {
        stakePool,
        stakePoolMint,
        depositNonce: params.stakeNonce,
        rewardPoolNonce: rp.nonce,
        rewardMint: new PublicKey(rp.mint),
        rewardPoolType: "fixed" as const,
      },
      { invoker },
    );
    claimIxs.push(...result.ixs);
  }

  // ── Build full transaction ─────────────────────────────────
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const transaction = new Transaction();
  if (preIxs.length > 0) transaction.add(...preIxs);
  transaction.add(...claimIxs);
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = payer;

  return Buffer.from(
    transaction.serialize({ requireAllSignatures: false }),
  ).toString("base64");
}

/**
 * Find next available nonce for a new stake entry.
 */
export async function findAvailableStakeNonce(
  walletAddress: string,
  stakePoolAddress: string,
): Promise<number> {
  const entries = await getUserStakeEntries(walletAddress, stakePoolAddress);
  const usedNonces = new Set(
    entries.map((e) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = e.account as any;
      return data.nonce ?? 0;
    }),
  );
  // Find first unused nonce (0-255)
  for (let i = 0; i < 256; i++) {
    if (!usedNonces.has(i)) return i;
  }
  throw new Error("No available stake nonce (max 256 positions reached)");
}
