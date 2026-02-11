// External URLs - centralized for easy updates

export const SOCIAL_URLS = {
  twitter: "https://x.com/agentincdotfun",
  discord: "https://discord.com/invite/agentinc",
  github: "https://github.com/ChristopherTrimboli/agentinc",
  erc8041Spec:
    "https://ethereum-magicians.org/t/erc-8041-fixed-supply-agent-nft-collections/25656",
} as const;

export const EXTERNAL_APIS = {
  bagsApi:
    process.env.BAGS_API_BASE_URL || "https://public-api-v2.bags.fm/api/v1",
  bagsFm: "https://bags.fm",
  dexscreener: "https://dexscreener.com/solana",
  solscan: "https://solscan.io",
} as const;

// Helper to get Solscan URLs
export function getSolscanUrl(
  type: "account" | "token" | "tx",
  address: string,
): string {
  return `${EXTERNAL_APIS.solscan}/${type}/${address}`;
}

// Helper to get DexScreener URL
export function getDexScreenerUrl(tokenMint: string): string {
  return `${EXTERNAL_APIS.dexscreener}/${tokenMint}`;
}

// Helper to get Bags.fm URL
export function getBagsFmUrl(tokenMint: string): string {
  return `${EXTERNAL_APIS.bagsFm}/${tokenMint}`;
}
