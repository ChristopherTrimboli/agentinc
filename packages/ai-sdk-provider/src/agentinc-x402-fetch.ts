/**
 * x402 Payment-Aware Fetch Wrapper
 *
 * Intercepts HTTP 402 responses and automatically handles the x402 payment
 * protocol: builds a SOL transfer transaction, signs it, and retries the
 * request with an X-PAYMENT header. Uses @solana/kit (optional peer dep).
 */

// Static type-only imports (erased at runtime — no crash if @solana/kit missing)
import type { Address, KeyPairSigner, TransactionSigner } from "@solana/kit";

/** x402 payment requirements returned in a 402 response body */
interface X402PaymentRequirements {
  scheme: "exact";
  network: "solana" | "solana-devnet";
  maxAmountRequired: string;
  asset: "native";
  payTo: string;
  resource: string;
  description: string;
  maxTimeoutSeconds: number;
  extra?: { usdAmount?: string; solPrice?: number };
}

export interface X402FetchOptions {
  /** 64-byte Solana keypair (32 private + 32 public) */
  secretKey: Uint8Array;
  /** Solana network. Defaults to "solana" (mainnet). */
  network?: "solana" | "solana-devnet";
  /** Custom Solana RPC URL. Falls back to public endpoints per network. */
  rpcUrl?: string;
  /** Base fetch implementation to wrap. Defaults to globalThis.fetch. */
  baseFetch?: typeof fetch;
}

const SYSTEM_PROGRAM = "11111111111111111111111111111111";

const DEFAULT_RPC: Record<string, string> = {
  solana: "https://api.mainnet-beta.solana.com",
  "solana-devnet": "https://api.devnet.solana.com",
};

/**
 * Build a SOL transfer instruction using raw @solana/kit primitives.
 * Avoids requiring @solana-program/system as a peer dependency.
 *
 * SystemProgram.Transfer layout: [u32 type=2 LE, u64 lamports LE]
 */
function buildTransferInstruction(
  source: TransactionSigner,
  destination: Address,
  amount: bigint,
) {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true);
  view.setBigUint64(4, amount, true);

  // AccountRole enum: 0=READONLY, 1=WRITABLE, 2=READONLY_SIGNER, 3=WRITABLE_SIGNER
  return {
    programAddress: SYSTEM_PROGRAM as Address,
    accounts: [
      {
        address: source.address,
        role: 3 as const /* WRITABLE_SIGNER */,
        signer: source,
      },
      { address: destination, role: 1 as const /* WRITABLE */ },
    ],
    data,
  };
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function stringToBase64(str: string): string {
  return uint8ArrayToBase64(new TextEncoder().encode(str));
}

/**
 * Create a fetch function that transparently handles x402 SOL payments.
 *
 * On a 402 response the wrapper:
 * 1. Parses payment requirements from the response body
 * 2. Builds and signs a SOL transfer transaction via @solana/kit
 * 3. Attaches the signed tx as a base64 X-PAYMENT header
 * 4. Retries the original request
 */
export function createX402Fetch(options: X402FetchOptions): typeof fetch {
  const baseFetch = options.baseFetch ?? globalThis.fetch;
  const network = options.network ?? "solana";

  let signerPromise: Promise<KeyPairSigner> | null = null;

  async function getSigner(): Promise<KeyPairSigner> {
    if (!signerPromise) {
      signerPromise = (async () => {
        try {
          const { createKeyPairSignerFromBytes } = await import("@solana/kit");
          return await createKeyPairSignerFromBytes(options.secretKey);
        } catch {
          signerPromise = null;
          throw new Error(
            "@solana/kit is required for x402 payment mode. Install it: bun add @solana/kit",
          );
        }
      })();
    }
    return signerPromise;
  }

  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const response = await baseFetch(input, init);

    if (response.status !== 402) return response;

    // ── Parse 402 payment requirements ──────────────────────────────────
    let body: { accepts?: X402PaymentRequirements[] };
    try {
      body = await response.json();
    } catch {
      throw new Error("x402: could not parse 402 response body as JSON");
    }

    const requirements = body.accepts?.[0];
    if (!requirements) {
      throw new Error("x402: 402 response missing payment requirements");
    }

    if (requirements.network !== network) {
      throw new Error(
        `x402: network mismatch — server requires ${requirements.network}, provider configured for ${network}`,
      );
    }

    // ── Build and sign SOL transfer ─────────────────────────────────────
    const solana = await import("@solana/kit");
    const signer = await getSigner();

    const rpcUrl = options.rpcUrl ?? DEFAULT_RPC[network];
    const rpc = solana.createSolanaRpc(rpcUrl);
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    const destination = solana.address(requirements.payTo);
    const amount = BigInt(requirements.maxAmountRequired);

    const transferIx = buildTransferInstruction(signer, destination, amount);

    // Build transaction message step-by-step (avoids complex pipe generics)
    const emptyMsg = solana.createTransactionMessage({ version: 0 });
    const withPayer = solana.setTransactionMessageFeePayerSigner(
      signer,
      emptyMsg,
    );
    const withLifetime = solana.setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      withPayer as typeof withPayer & { readonly instructions: readonly [] },
    );
    const fullMsg = solana.appendTransactionMessageInstructions(
      [transferIx],
      withLifetime,
    );

    const signedTx = await solana.signTransactionMessageWithSigners(fullMsg);

    // Serialize the signed transaction to base64
    const txEncoder = solana.getTransactionEncoder();
    const txBytes = txEncoder.encode(
      signedTx as Parameters<typeof txEncoder.encode>[0],
    );
    const txBase64 = uint8ArrayToBase64(new Uint8Array(txBytes));

    // ── Build x402 payment header ───────────────────────────────────────
    const paymentPayload = {
      x402Version: 1,
      scheme: "exact",
      network,
      payload: { transaction: txBase64 },
    };

    const paymentHeader = stringToBase64(JSON.stringify(paymentPayload));

    // ── Retry with payment attached ─────────────────────────────────────
    const retryHeaders = new Headers(init?.headers as HeadersInit | undefined);
    retryHeaders.set("X-PAYMENT", paymentHeader);

    const retryInit: RequestInit = {
      ...init,
      headers: Object.fromEntries(retryHeaders.entries()),
    };

    const paidResponse = await baseFetch(input, retryInit);

    if (paidResponse.status === 402) {
      throw new Error(
        "x402: payment was rejected by the server after retry — check wallet balance and network",
      );
    }

    return paidResponse;
  };
}
