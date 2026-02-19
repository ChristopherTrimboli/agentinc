import { NextRequest, NextResponse } from "next/server";

const ALLOWED_FLOWER_IMAGE_HOSTS = new Set([
  "cdn.floristone.com",
  "www.floristone.com",
  "floristone.com",
]);

/**
 * Proxy florist images through our origin so chat markdown image rendering
 * doesn't fail on browser CORS checks.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUrl = searchParams.get("url");

    if (!rawUrl) {
      return NextResponse.json(
        { error: "Missing required query param: url" },
        { status: 400 },
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
    }

    if (parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only https image URLs are allowed" },
        { status: 400 },
      );
    }

    if (!ALLOWED_FLOWER_IMAGE_HOSTS.has(parsed.hostname)) {
      return NextResponse.json(
        { error: "Image host is not allowed" },
        { status: 400 },
      );
    }

    const upstream = await fetch(parsed.toString(), {
      // Let Next/server cache image bytes for repeated browsing requests.
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: upstream.status },
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const imageBuffer = await upstream.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("[FlowerImageProxy] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to proxy flower image" },
      { status: 500 },
    );
  }
}
