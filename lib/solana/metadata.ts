import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  fetchDigitalAsset,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";
import { SOLANA_RPC_URL } from "@/lib/constants/solana";

// ── Constants ──────────────────────────────────────────────────────────────────

const METADATA_FETCH_TIMEOUT_MS = 15000;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface OnChainTokenMetadata {
  name: string;
  symbol: string;
  uri: string; // On-chain metadata URI (IPFS/Arweave)
  description: string | null;
  image: string | null;
}

interface MetadataJson {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  [key: string]: unknown;
}

// ── Fetch Token Metadata ───────────────────────────────────────────────────────

/**
 * Fetch on-chain token metadata for a Solana SPL token via Metaplex.
 * Resolves the metadata URI to get the full JSON (image, description, etc.).
 *
 * @param mintAddress - Base58-encoded token mint address
 * @returns Token metadata including name, symbol, description, and image URL
 */
export async function fetchTokenMetadataFromChain(
  mintAddress: string,
): Promise<OnChainTokenMetadata> {
  const umi = createUmi(SOLANA_RPC_URL).use(mplTokenMetadata());

  // Fetch the on-chain digital asset (metadata PDA)
  const asset = await fetchDigitalAsset(umi, publicKey(mintAddress));

  const name = asset.metadata.name.replace(/\0/g, "").trim();
  const symbol = asset.metadata.symbol.replace(/\0/g, "").trim();
  const uri = asset.metadata.uri.replace(/\0/g, "").trim();

  // Fetch the off-chain JSON metadata from the URI
  let description: string | null = null;
  let image: string | null = null;

  if (uri) {
    try {
      const response = await fetch(uri, {
        signal: AbortSignal.timeout(METADATA_FETCH_TIMEOUT_MS),
      });

      if (response.ok) {
        const json = (await response.json()) as MetadataJson;
        description = json.description ?? null;
        image = json.image ?? null;
      } else {
        console.warn(
          `[Metadata] Failed to fetch URI ${uri}: ${response.status}`,
        );
      }
    } catch (error) {
      console.warn(`[Metadata] Error fetching URI ${uri}:`, error);
    }
  }

  return { name, symbol, uri, description, image };
}
