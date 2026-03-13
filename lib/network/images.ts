/**
 * Shared image URL resolution for the 8004 network visualization.
 *
 * Both NetworkCanvas (PixiJS) and NetworkDetails (React) need to resolve
 * agent/collection images from various sources (IPFS, Arweave, HTTP, data URIs).
 * This module provides a single source of truth for that logic.
 */

const PLACEHOLDER_RE = /example|placeholder|test|dummy/i;

const CORS_SAFE_HOSTS = [
  ".blob.vercel-storage.com",
  "ipfs.io",
  "arweave.net",
  "nftstorage.link",
  "dweb.link",
  "w3s.link",
  "cloudflare-ipfs.com",
];

function isValidIpfsCid(cid: string): boolean {
  if (cid.startsWith("Qm") && cid.length >= 44 && cid.length <= 50) return true;
  if (cid.startsWith("bafy") && cid.length >= 50) return true;
  return false;
}

/**
 * Resolve an image URL from various decentralized storage protocols.
 * Returns null for invalid, placeholder, or unresolvable URLs.
 *
 * Used by PixiJS canvas (loads via HTMLImageElement + CORS).
 */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url || url.trim() === "") return null;
  if (PLACEHOLDER_RE.test(url)) return null;

  if (url.startsWith("ipfs://")) {
    const cid = url.slice(7).split("/")[0];
    if (!isValidIpfsCid(cid)) return null;
    return `https://dweb.link/ipfs/${url.slice(7)}`;
  }
  if (url.startsWith("ar://")) return `https://arweave.net/${url.slice(5)}`;

  if (url.match(/\/ipfs\/([a-zA-Z0-9]+)/)) {
    const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    if (match && !isValidIpfsCid(match[1])) return null;
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("/")
  )
    return url;

  return null;
}

/**
 * Resolve an image URL for use in Next.js Image components.
 * Falls back to the image proxy for cross-origin URLs that aren't CORS-safe.
 */
export function resolveImageSrc(url: string | null | undefined): string | null {
  if (!url || url.trim() === "") return null;
  if (PLACEHOLDER_RE.test(url)) return null;

  if (url.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${url.slice(7)}`;
  if (url.startsWith("ar://")) return `https://arweave.net/${url.slice(5)}`;
  if (url.startsWith("data:") || url.startsWith("/")) return url;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const u = new URL(url);
      if (typeof window !== "undefined" && u.origin === window.location.origin)
        return url;
      const h = u.hostname;
      if (CORS_SAFE_HOSTS.some((s) => h === s || h.endsWith(s))) return url;
    } catch {
      /* fall through */
    }
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
  }

  return null;
}

/** Check if a URL can be loaded directly without a CORS proxy. */
export function canLoadDirectly(url: string): boolean {
  if (url.startsWith("/") || url.startsWith("data:")) return true;
  try {
    const u = new URL(url);
    if (u.origin === globalThis.location?.origin) return true;
    const h = u.hostname;
    return CORS_SAFE_HOSTS.some((s) => h === s || h.endsWith(s));
  } catch {
    return false;
  }
}

export function isPlaceholderUri(uri: string): boolean {
  return PLACEHOLDER_RE.test(uri) || uri.length < 10;
}
