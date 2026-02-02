import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getRecentBlockhash } from "@/lib/solana";

// GET /api/solana/blockhash - Get latest blockhash
export async function GET(req: NextRequest) {
  const idToken = req.headers.get("privy-id-token");
  const auth = await verifyAuth(idToken);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { blockhash, lastValidBlockHeight } = await getRecentBlockhash();

    return NextResponse.json({
      blockhash,
      lastValidBlockHeight,
    });
  } catch (error) {
    console.error("Error fetching blockhash:", error);
    return NextResponse.json(
      { error: "Failed to fetch blockhash" },
      { status: 500 },
    );
  }
}
