"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, "default", { value: mod, enumerable: true })
      : target,
    mod,
  )
);
var __toCommonJS = (mod) =>
  __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  agentinc: () => agentinc,
  createAgentInc: () => createAgentInc,
});
module.exports = __toCommonJS(index_exports);

// src/agentinc-provider.ts
var import_openai_compatible = require("@ai-sdk/openai-compatible");
var import_provider_utils = require("@ai-sdk/provider-utils");

// src/agentinc-x402-fetch.ts
var SYSTEM_PROGRAM = "11111111111111111111111111111111";
var DEFAULT_RPC = {
  solana: "https://api.mainnet-beta.solana.com",
  "solana-devnet": "https://api.devnet.solana.com",
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
        signer: source,
      },
      {
        address: destination,
        role: 1,
        /* WRITABLE */
      },
    ],
    data,
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
            "@solana/kit is required for x402 payment mode. Install it: bun add @solana/kit",
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
        `x402: network mismatch \u2014 server requires ${requirements.network}, provider configured for ${network}`,
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
      emptyMsg,
    );
    const withLifetime = solana.setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      withPayer,
    );
    const fullMsg = solana.appendTransactionMessageInstructions(
      [transferIx],
      withLifetime,
    );
    const signedTx = await solana.signTransactionMessageWithSigners(fullMsg);
    const txEncoder = solana.getTransactionEncoder();
    const txBytes = txEncoder.encode(signedTx);
    const txBase64 = uint8ArrayToBase64(new Uint8Array(txBytes));
    const paymentPayload = {
      x402Version: 1,
      scheme: "exact",
      network,
      payload: { transaction: txBase64 },
    };
    const paymentHeader = stringToBase64(JSON.stringify(paymentPayload));
    const retryHeaders = new Headers(init?.headers);
    retryHeaders.set("X-PAYMENT", paymentHeader);
    const retryInit = {
      ...init,
      headers: Object.fromEntries(retryHeaders.entries()),
    };
    const paidResponse = await baseFetch(input, retryInit);
    if (paidResponse.status === 402) {
      throw new Error(
        "x402: payment was rejected by the server after retry \u2014 check wallet balance and network",
      );
    }
    return paidResponse;
  };
}

// src/agentinc-provider.ts
var DEFAULT_BASE_URL = "https://agentinc.fun/api/v1";
function createAgentInc(options = {}) {
  const baseURL =
    (0, import_provider_utils.withoutTrailingSlash)(options.baseURL) ??
    DEFAULT_BASE_URL;
  const isX402Mode = !!options.solanaSecretKey && !options.apiKey;
  const fetchFn = isX402Mode
    ? createX402Fetch({
        secretKey: options.solanaSecretKey,
        network: options.solanaNetwork ?? "solana",
        rpcUrl: options.solanaRpcUrl,
        baseFetch: options.fetch,
      })
    : options.fetch;
  const apiKey = isX402Mode ? void 0 : (options.apiKey ?? void 0);
  const inner = (0, import_openai_compatible.createOpenAICompatible)({
    name: "agentinc",
    baseURL,
    apiKey: apiKey ?? process.env.AGENTINC_API_KEY,
    headers: options.headers,
    fetch: fetchFn,
  });
  const provider = function agentinc2(modelId) {
    return inner.chatModel(modelId);
  };
  provider.chatModel = (modelId) => inner.chatModel(modelId);
  provider.embeddingModel = (modelId) => inner.embeddingModel(modelId);
  return provider;
}
var agentinc = createAgentInc();
// Annotate the CommonJS export names for ESM import in node:
0 &&
  (module.exports = {
    agentinc,
    createAgentInc,
  });
//# sourceMappingURL=index.cjs.map
