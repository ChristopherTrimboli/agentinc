// src/agentinc-provider.ts
import {
  createOpenAICompatible
} from "@ai-sdk/openai-compatible";
import { withoutTrailingSlash } from "@ai-sdk/provider-utils";

// src/agentinc-x402-fetch.ts
var SYSTEM_PROGRAM = "11111111111111111111111111111111";
var DEFAULT_RPC = {
  solana: "https://api.mainnet-beta.solana.com",
  "solana-devnet": "https://api.devnet.solana.com"
};
function buildTransferInstruction(source, destination, amount) {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true);
  view.setBigUint64(4, amount, true);
  return {
    programAddress: SYSTEM_PROGRAM,
    accounts: [
      {
        address: source.address,
        role: 3,
        signer: source
      },
      {
        address: destination,
        role: 1
        /* WRITABLE */
      }
    ],
    data
  };
}
function uint8ArrayToBase64(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
function stringToBase64(str) {
  return uint8ArrayToBase64(new TextEncoder().encode(str));
}
function createX402Fetch(options) {
  const baseFetch = options.baseFetch ?? globalThis.fetch;
  const network = options.network ?? "solana";
  let signerPromise = null;
  async function getSigner() {
    if (!signerPromise) {
      signerPromise = (async () => {
        try {
          const { createKeyPairSignerFromBytes } = await import("@solana/kit");
          return await createKeyPairSignerFromBytes(options.secretKey);
        } catch {
          signerPromise = null;
          throw new Error(
            "@solana/kit is required for x402 payment mode. Install it: bun add @solana/kit"
          );
        }
      })();
    }
    return signerPromise;
  }
  return async (input, init) => {
    const response = await baseFetch(input, init);
    if (response.status !== 402) return response;
    let body;
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
        `x402: network mismatch \u2014 server requires ${requirements.network}, provider configured for ${network}`
      );
    }
    const solana = await import("@solana/kit");
    const signer = await getSigner();
    const rpcUrl = options.rpcUrl ?? DEFAULT_RPC[network];
    const rpc = solana.createSolanaRpc(rpcUrl);
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
    const destination = solana.address(requirements.payTo);
    const amount = BigInt(requirements.maxAmountRequired);
    const transferIx = buildTransferInstruction(signer, destination, amount);
    const emptyMsg = solana.createTransactionMessage({ version: 0 });
    const withPayer = solana.setTransactionMessageFeePayerSigner(
      signer,
      emptyMsg
    );
    const withLifetime = solana.setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      withPayer
    );
    const fullMsg = solana.appendTransactionMessageInstructions(
      [transferIx],
      withLifetime
    );
    const signedTx = await solana.signTransactionMessageWithSigners(fullMsg);
    const txEncoder = solana.getTransactionEncoder();
    const txBytes = txEncoder.encode(
      signedTx
    );
    const txBase64 = uint8ArrayToBase64(new Uint8Array(txBytes));
    const paymentPayload = {
      x402Version: 1,
      scheme: "exact",
      network,
      payload: { transaction: txBase64 }
    };
    const paymentHeader = stringToBase64(JSON.stringify(paymentPayload));
    const retryHeaders = new Headers(init?.headers);
    retryHeaders.set("X-PAYMENT", paymentHeader);
    const retryInit = {
      ...init,
      headers: Object.fromEntries(retryHeaders.entries())
    };
    const paidResponse = await baseFetch(input, retryInit);
    if (paidResponse.status === 402) {
      throw new Error(
        "x402: payment was rejected by the server after retry \u2014 check wallet balance and network"
      );
    }
    return paidResponse;
  };
}

// src/agentinc-provider.ts
var DEFAULT_BASE_URL = "https://agentinc.fun/api/v1";
function createAgentInc(options = {}) {
  const baseURL = withoutTrailingSlash(options.baseURL) ?? DEFAULT_BASE_URL;
  const isX402Mode = !!options.solanaSecretKey && !options.apiKey;
  const fetchFn = isX402Mode ? createX402Fetch({
    secretKey: options.solanaSecretKey,
    network: options.solanaNetwork ?? "solana",
    rpcUrl: options.solanaRpcUrl,
    baseFetch: options.fetch
  }) : options.fetch;
  const apiKey = isX402Mode ? void 0 : options.apiKey ?? void 0;
  const inner = createOpenAICompatible({
    name: "agentinc",
    baseURL,
    apiKey: apiKey ?? process.env.AGENTINC_API_KEY,
    headers: options.headers,
    fetch: fetchFn
  });
  const provider = function agentinc2(modelId) {
    return inner.chatModel(modelId);
  };
  provider.chatModel = (modelId) => inner.chatModel(modelId);
  provider.embeddingModel = (modelId) => inner.embeddingModel(modelId);
  return provider;
}
var agentinc = createAgentInc();
export {
  agentinc,
  createAgentInc
};
//# sourceMappingURL=index.js.map