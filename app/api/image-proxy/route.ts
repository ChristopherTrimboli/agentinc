import { NextRequest, NextResponse } from "next/server";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT = 10_000;

const IPFS_GATEWAYS = [
  "https://dweb.link/ipfs/",
  "https://w3s.link/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://nftstorage.link/ipfs/",
];

const IMAGE_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  "image/bmp",
  "image/tiff",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

function isBlockedHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("172.") ||
    host === "::1"
  );
}

const IMAGE_MAGIC_BYTES: [number[], string][] = [
  [[0x89, 0x50, 0x4e, 0x47], "image/png"],
  [[0xff, 0xd8, 0xff], "image/jpeg"],
  [[0x47, 0x49, 0x46], "image/gif"],
  [[0x52, 0x49, 0x46, 0x46], "image/webp"],
  [[0x00, 0x00, 0x01, 0x00], "image/x-icon"],
  [[0x00, 0x00, 0x02, 0x00], "image/x-icon"],
];

function detectImageType(
  contentType: string | null,
  buffer: ArrayBuffer,
): string | null {
  if (contentType) {
    const ct = contentType.split(";")[0].trim().toLowerCase();
    if (IMAGE_CONTENT_TYPES.has(ct)) return ct;
  }
  const bytes = new Uint8Array(buffer, 0, Math.min(16, buffer.byteLength));
  for (const [magic, mime] of IMAGE_MAGIC_BYTES) {
    if (magic.every((b, i) => bytes[i] === b)) return mime;
  }
  if (contentType?.includes("svg") || looksLikeSvg(bytes))
    return "image/svg+xml";
  if (contentType?.includes("avif")) return "image/avif";
  return null;
}

function looksLikeSvg(bytes: Uint8Array): boolean {
  const str = String.fromCharCode(...bytes);
  return str.includes("<svg") || str.includes("<?xml");
}

function extractIpfsCid(url: string): string | null {
  const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
  if (match) return match[1];
  try {
    const u = new URL(url);
    if (
      u.hostname.endsWith(".ipfs.dweb.link") ||
      u.hostname.endsWith(".ipfs.w3s.link")
    ) {
      return u.hostname.split(".")[0];
    }
  } catch {}
  return null;
}

function isValidIpfsCid(cid: string): boolean {
  if (cid.startsWith("Qm") && cid.length >= 44 && cid.length <= 50) return true;
  if (cid.startsWith("bafy") && cid.length >= 50) return true;
  return false;
}

async function fetchWithFallback(url: string): Promise<Response> {
  const cid = extractIpfsCid(url);

  if (cid) {
    if (!isValidIpfsCid(cid)) {
      throw new Error(`Invalid IPFS CID: ${cid}`);
    }
    const path = url.replace(/^https?:\/\/[^/]+\/ipfs\/[a-zA-Z0-9]+/, "");
    for (const gateway of IPFS_GATEWAYS) {
      try {
        const gatewayUrl = `${gateway}${cid}${path}`;
        const resp = await fetch(gatewayUrl, {
          headers: {
            "User-Agent": "AgentInc-ImageProxy/1.0",
            Accept: "image/*,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(FETCH_TIMEOUT),
          redirect: "follow",
        });
        if (resp.ok) return resp;
      } catch {
        continue;
      }
    }
    throw new Error("All IPFS gateways failed");
  }

  const resp = await fetch(url, {
    headers: {
      "User-Agent": "AgentInc-ImageProxy/1.0",
      Accept: "image/*,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
    redirect: "follow",
  });
  return resp;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 },
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return NextResponse.json(
      { error: "Only http(s) URLs allowed" },
      { status: 400 },
    );
  }

  if (isBlockedHost(parsed.hostname)) {
    return NextResponse.json(
      { error: "Private IPs not allowed" },
      { status: 403 },
    );
  }

  try {
    const resp = await fetchWithFallback(url);

    if (!resp.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${resp.status}` },
        { status: 502 },
      );
    }

    const contentType = resp.headers.get("content-type") || "";

    const contentLength = resp.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    const buffer = await resp.arrayBuffer();
    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    const detectedType = detectImageType(contentType, buffer);
    if (!detectedType) {
      return NextResponse.json({ error: "Not an image" }, { status: 400 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": detectedType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fetch failed";
    console.error("[image-proxy] Failed to fetch:", url, msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
