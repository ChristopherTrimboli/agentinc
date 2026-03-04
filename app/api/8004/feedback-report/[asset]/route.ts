import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy route for permanent verification feedback reports stored in Vercel Blob.
 * Provides a stable, self-hosted URI for on-chain feedback references.
 *
 * GET /api/8004/feedback-report/:asset?src=<blob_url>
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ asset: string }> },
): Promise<NextResponse> {
  const { asset } = await params;
  const src = req.nextUrl.searchParams.get("src");

  if (!src) {
    return NextResponse.json(
      { error: "Missing src parameter" },
      { status: 400 },
    );
  }

  try {
    const url = new URL(src);
    if (!url.hostname.endsWith(".vercel-storage.com")) {
      return NextResponse.json(
        { error: "Invalid source URL" },
        { status: 400 },
      );
    }

    if (!url.pathname.includes(asset)) {
      return NextResponse.json({ error: "Asset mismatch" }, { status: 400 });
    }

    const response = await fetch(src, { next: { revalidate: false } });
    if (!response.ok) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Verified-By": "Agent Inc.",
      },
    });
  } catch (error) {
    console.error("[FeedbackReport] Failed to fetch report:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 },
    );
  }
}
