/**
 * One-time setup: create the "Agent Inc." collection on the 8004 Solana registry.
 *
 * Usage:
 *   bun run scripts/setup-8004-collection.ts
 *
 * Required env vars:
 *   ERC8004_SIGNER_PRIVATE_KEY  — base58-encoded Solana keypair secret key
 *   PINATA_JWT                  — Pinata JWT for IPFS upload (free at https://pinata.cloud)
 *   SOLANA_RPC_URL              — RPC endpoint (already in your .env.local)
 *
 * Optional:
 *   ERC8004_CLUSTER             — "mainnet-beta" (default) or "devnet"
 *   NEXT_PUBLIC_APP_URL         — app URL for metadata links
 *
 * After running, add the printed ERC8004_COLLECTION_POINTER value to .env.local
 */

import { createAgentIncCollection } from "../lib/erc8004";

async function main() {
  console.log("Creating Agent Inc. collection on 8004...\n");

  const result = await createAgentIncCollection();

  console.log("Collection created successfully!\n");
  console.log(`  CID:     ${result.cid}`);
  console.log(`  URI:     ${result.uri}`);
  console.log(`  Pointer: ${result.pointer}`);
  console.log("");
  console.log("Add this to your .env.local:");
  console.log(`  ERC8004_COLLECTION_POINTER=${result.pointer}`);
}

main().catch((err) => {
  console.error("Failed to create collection:", err);
  process.exit(1);
});
