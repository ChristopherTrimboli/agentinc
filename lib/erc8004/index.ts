/**
 * ERC-8004 Solana Agent Registry Integration
 *
 * Registers Agent Inc. agents on the 8004 on-chain identity registry.
 * Users own their 8004 NFTs via their Privy wallets — the server builds
 * the transaction with skipSend, partial-signs with the asset keypair,
 * then Privy signs with the user's wallet so they are the NFT owner.
 *
 * Program IDs (mainnet):
 *   Agent Registry: 8oo4dC4JvBLwy5tGgiH3WwK4B9PWxL9Z4XjA2jzkQMbQ
 *   ATOM Engine:    AToMw53aiPQ8j7iHVb4fGt6nzUNxUhcPc3tbPBZuzVVb
 */

import { SolanaSDK, IPFSClient } from "8004-solana";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import bs58 from "bs58";

import { SOLANA_RPC_URL } from "@/lib/constants/solana";
import { signTransaction, sendSignedTransaction } from "@/lib/solana";

// ── Configuration ────────────────────────────────────────────────────────────

const ERC8004_CLUSTER =
  (process.env.ERC8004_CLUSTER as "mainnet-beta" | "devnet") || "mainnet-beta";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://agentinc.fun";

function getIpfsClient(): IPFSClient | undefined {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) return undefined;
  return new IPFSClient({ pinataEnabled: true, pinataJwt: jwt });
}

/** Get the 8004 SDK in read-only mode (no signer — used with skipSend). */
export function getErc8004Sdk(): SolanaSDK {
  return new SolanaSDK({
    cluster: ERC8004_CLUSTER,
    rpcUrl: SOLANA_RPC_URL,
  });
}

// ── Collection Management ────────────────────────────────────────────────────

export const COLLECTION_POINTER = process.env.ERC8004_COLLECTION_POINTER;

interface CollectionSetupResult {
  cid: string;
  uri: string;
  pointer: string;
}

/**
 * One-time admin setup: create the "Agent Inc." collection on 8004.
 * Run via `bun run scripts/setup-8004-collection.ts`.
 * This is the only operation that uses ERC8004_SIGNER_PRIVATE_KEY.
 */
export async function createAgentIncCollection(): Promise<CollectionSetupResult> {
  const key = process.env.ERC8004_SIGNER_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      "ERC8004_SIGNER_PRIVATE_KEY required for collection setup",
    );
  }
  const signer = Keypair.fromSecretKey(bs58.decode(key));
  const ipfs = getIpfsClient();
  if (!ipfs) {
    throw new Error(
      "PINATA_JWT is required for collection setup (the 8004 SDK needs IPFS to generate the collection pointer). Get a free JWT at https://pinata.cloud",
    );
  }

  const sdk = new SolanaSDK({
    cluster: ERC8004_CLUSTER,
    rpcUrl: SOLANA_RPC_URL,
    signer,
    ipfsClient: ipfs,
  });

  const result = await sdk.createCollection({
    name: "Agent Inc.",
    symbol: "AGINC",
    description:
      "AI agents minted on Agent Inc. — autonomous corporations with on-chain identity, Bags tokens, and x402 payments.",
    image: `${APP_URL}/agentinc.svg`,
    banner_image: `${APP_URL}/og-image.png`,
    socials: {
      website: APP_URL,
      x: "https://x.com/agentincdotfun",
    },
  });

  if (!result.cid || !result.pointer) {
    throw new Error("[ERC8004] Collection creation failed — no CID or pointer");
  }

  return {
    cid: result.cid,
    uri: result.uri!,
    pointer: result.pointer,
  };
}

// ── Metadata ─────────────────────────────────────────────────────────────────

/**
 * On-chain metadata URI for an agent. Points to our own domain so it
 * stays in sync with the DB automatically (no IPFS or blob storage needed).
 * Served by GET /api/agents/8004-metadata/[id].
 */
export function getMetadataUri(agentId: string): string {
  return `${APP_URL}/api/agents/8004-metadata/${agentId}`;
}

// ── Agent Registration (user-owned) ──────────────────────────────────────────

interface RegisterAgentInput {
  name: string;
  description: string;
  imageUrl?: string;
  tokenMint?: string;
  agentId: string;
  walletAddress: string;
  walletId: string;
}

interface RegisterAgentResult {
  asset: string;
  metadataUri: string;
  collectionPointer?: string;
  signature: string;
}

/**
 * Register an Agent Inc. agent on the 8004 Solana registry.
 *
 * The user's Privy wallet pays rent and becomes the NFT owner.
 * Flow:
 *   1. Metadata URI points to agentinc.fun/api/agents/8004-metadata/[id]
 *   2. SDK builds unsigned tx with skipSend (user wallet = payer)
 *   3. Server partial-signs with the asset keypair (required by Metaplex Core)
 *   4. Privy signs with the user's wallet
 *   5. Send via Jito/RPC
 */
export async function registerAgentOn8004(
  input: RegisterAgentInput,
): Promise<RegisterAgentResult> {
  const sdk = getErc8004Sdk();

  const metadataUri = getMetadataUri(input.agentId);

  const assetKeypair = Keypair.generate();
  const userPubkey = new PublicKey(input.walletAddress);
  const collectionPointer = COLLECTION_POINTER;

  const prepared = await sdk.registerAgent(metadataUri, {
    skipSend: true,
    signer: userPubkey,
    assetPubkey: assetKeypair.publicKey,
    atomEnabled: true,
    ...(collectionPointer ? { collectionPointer } : {}),
  });

  if ("signature" in prepared) {
    throw new Error(
      `[ERC8004] Expected PreparedTransaction but got TransactionResult`,
    );
  }

  // Deserialize, partial-sign with asset keypair, re-serialize
  const tx = Transaction.from(
    Buffer.from(prepared.transaction, "base64"),
  );
  tx.partialSign(assetKeypair);
  const partialSignedBase64 = Buffer.from(
    tx.serialize({ requireAllSignatures: false }),
  ).toString("base64");

  // Privy signs with the user's wallet (they become the owner)
  const signedBase64 = await signTransaction(
    input.walletId,
    partialSignedBase64,
  );

  // Send to network
  const { signature } = await sendSignedTransaction(signedBase64, {
    useJito: true,
  });

  return {
    asset: assetKeypair.publicKey.toBase58(),
    metadataUri,
    collectionPointer: collectionPointer || undefined,
    signature,
  };
}

// ── Re-exports ───────────────────────────────────────────────────────────────

export { SolanaSDK, ServiceType, Tag } from "8004-solana";
