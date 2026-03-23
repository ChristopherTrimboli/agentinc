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

const APP_URL = "https://agentinc.fun";

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

/** Get the 8004 SDK with a signer keypair for write operations (feedback, etc.). */
export function getSignedErc8004Sdk(): SolanaSDK {
  const key = process.env.ERC8004_SIGNER_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      "ERC8004_SIGNER_PRIVATE_KEY required for signed SDK operations",
    );
  }
  const signer = Keypair.fromSecretKey(bs58.decode(key));
  return new SolanaSDK({
    cluster: ERC8004_CLUSTER,
    rpcUrl: SOLANA_RPC_URL,
    signer,
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
    throw new Error("ERC8004_SIGNER_PRIVATE_KEY required for collection setup");
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
    image: `${APP_URL}/agentinc.jpg`,
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
 * On-chain metadata URI for an agent. Uses the token mint (CA) as the slug
 * so the public URL matches Bags-style routing, not internal IDs.
 * Served by GET /api/agents/8004-metadata/[id] (supports both CA and DB ID).
 */
export function getMetadataUri(
  tokenMint: string | undefined,
  agentId: string,
): string {
  return `${APP_URL}/api/agents/8004-metadata/${tokenMint || agentId}`;
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
 *   2. SDK builds unsigned register tx with skipSend (user wallet = payer)
 *   3. Server partial-signs with the asset keypair (required by Metaplex Core)
 *   4. Privy signs with the user's wallet
 *   5. Send register tx via Jito/RPC
 *   6. If collection pointer is configured, send a second tx to attach it
 *      (the SDK silently skips collectionPointer when skipSend=true)
 */
export async function registerAgentOn8004(
  input: RegisterAgentInput,
): Promise<RegisterAgentResult> {
  const sdk = getErc8004Sdk();

  const metadataUri = getMetadataUri(input.tokenMint, input.agentId);

  const assetKeypair = Keypair.generate();
  const userPubkey = new PublicKey(input.walletAddress);
  const collectionPointer = COLLECTION_POINTER;

  const prepared = await sdk.registerAgent(metadataUri, {
    skipSend: true,
    signer: userPubkey,
    assetPubkey: assetKeypair.publicKey,
    atomEnabled: true,
  });

  if ("signature" in prepared) {
    throw new Error(
      `[ERC8004] Expected PreparedTransaction but got TransactionResult`,
    );
  }

  // Deserialize, partial-sign with asset keypair, re-serialize
  const tx = Transaction.from(Buffer.from(prepared.transaction, "base64"));
  tx.partialSign(assetKeypair);
  const partialSignedBase64 = Buffer.from(
    tx.serialize({ requireAllSignatures: false }),
  ).toString("base64");

  // Privy signs with the user's wallet (they become the owner)
  const signedBase64 = await signTransaction(
    input.walletId,
    partialSignedBase64,
  );

  // Send register tx to network
  const { signature } = await sendSignedTransaction(signedBase64, {
    useJito: true,
  });

  // Attach collection pointer in a separate transaction
  // (skipSend mode skips this, so we must do it explicitly)
  if (collectionPointer) {
    try {
      const pointerPrepared = await sdk.setCollectionPointer(
        assetKeypair.publicKey,
        collectionPointer,
        { skipSend: true, signer: userPubkey, lock: true },
      );

      if (!("transaction" in pointerPrepared)) {
        throw new Error(
          "Expected PreparedTransaction for setCollectionPointer",
        );
      }

      const pointerTx = Transaction.from(
        Buffer.from(pointerPrepared.transaction, "base64"),
      );
      const pointerBase64 = Buffer.from(
        pointerTx.serialize({ requireAllSignatures: false }),
      ).toString("base64");

      const pointerSigned = await signTransaction(
        input.walletId,
        pointerBase64,
      );
      await sendSignedTransaction(pointerSigned, { useJito: true });
    } catch (err) {
      console.error(
        "[ERC8004] Agent registered but collection pointer failed:",
        err,
      );
    }
  }

  return {
    asset: assetKeypair.publicKey.toBase58(),
    metadataUri,
    collectionPointer: collectionPointer || undefined,
    signature,
  };
}

// ── Corporation Collection ───────────────────────────────────────────────────

interface CorporationCollectionInput {
  name: string;
  description: string;
  logo?: string;
  tokenSymbol?: string;
  tokenMint?: string;
}

interface CorporationCollectionResult {
  cid: string;
  uri: string;
  pointer: string;
}

/**
 * Create an 8004 on-chain collection for a corporation.
 * Uses the server signer key — the collection represents the corporation
 * on the 8004 registry with its agents as members.
 */
export async function createCorporationCollection(
  input: CorporationCollectionInput,
): Promise<CorporationCollectionResult> {
  const key = process.env.ERC8004_SIGNER_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      "ERC8004_SIGNER_PRIVATE_KEY required for corporation collection",
    );
  }

  const ipfs = getIpfsClient();
  if (!ipfs) {
    throw new Error("PINATA_JWT required for corporation collection (IPFS)");
  }

  const signer = Keypair.fromSecretKey(bs58.decode(key));

  const sdk = new SolanaSDK({
    cluster: ERC8004_CLUSTER,
    rpcUrl: SOLANA_RPC_URL,
    signer,
    ipfsClient: ipfs,
  });

  const socials: Record<string, string> = {
    website: APP_URL,
    x: "https://x.com/agentincdotfun",
  };

  if (input.tokenMint) {
    socials.bags = `https://bags.fm/b/${input.tokenMint}`;
  }

  const result = await sdk.createCollection({
    name: input.name,
    symbol: input.tokenSymbol || input.name.slice(0, 6).toUpperCase(),
    description:
      input.description ||
      `${input.name} — an AI corporation on Agent Inc.`,
    image: input.logo || `${APP_URL}/agentinc.jpg`,
    banner_image: `${APP_URL}/og-image.png`,
    socials,
  });

  if (!result.cid || !result.pointer) {
    throw new Error(
      "[ERC8004] Corporation collection creation failed — no CID or pointer",
    );
  }

  return {
    cid: result.cid,
    uri: result.uri!,
    pointer: result.pointer,
  };
}

/**
 * Update an agent's 8004 collection pointer to a corporation's collection.
 * Requires the agent to already be registered on 8004.
 */
export async function setAgentCorporationPointer(
  agentAsset: string,
  corporationPointer: string,
  walletAddress: string,
  walletId: string,
): Promise<string> {
  const sdk = getErc8004Sdk();
  const userPubkey = new PublicKey(walletAddress);
  const assetPubkey = new PublicKey(agentAsset);

  const prepared = await sdk.setCollectionPointer(
    assetPubkey,
    corporationPointer,
    { skipSend: true, signer: userPubkey, lock: false },
  );

  if (!("transaction" in prepared)) {
    throw new Error("Expected PreparedTransaction for setCollectionPointer");
  }

  const tx = Transaction.from(
    Buffer.from(prepared.transaction, "base64"),
  );
  const txBase64 = Buffer.from(
    tx.serialize({ requireAllSignatures: false }),
  ).toString("base64");

  const signed = await signTransaction(walletId, txBase64);
  const { signature } = await sendSignedTransaction(signed, {
    useJito: true,
  });

  return signature;
}

// ── Re-exports ───────────────────────────────────────────────────────────────

export { SolanaSDK, ServiceType, Tag } from "8004-solana";
