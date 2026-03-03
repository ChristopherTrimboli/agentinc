import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set<string>();
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

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

  // Block private/internal IPs
  const host = parsed.hostname;
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    host.startsWith("172.") ||
    host === "::1"
  ) {
    return NextResponse.json(
      { error: "Private IPs not allowed" },
      { status: 403 },
    );
  }

  // Optional allow-list for caching (auto-populated)
  if (ALLOWED_HOSTS.size > 0 && !ALLOWED_HOSTS.has(host)) {
    return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
  }

  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "AgentInc-ImageProxy/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${resp.status}` },
        { status: 502 },
      );
    }

    const contentType = resp.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image" }, { status: 400 });
    }

    const contentLength = resp.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    const buffer = await resp.arrayBuffer();
    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
