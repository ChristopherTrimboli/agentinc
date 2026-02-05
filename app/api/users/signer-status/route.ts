import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPrivyClient } from "@/lib/auth/verifyRequest";

/**
 * Update signer status for user's wallet
 * Called by client after successfully adding server signer via useSigners().addSigners()
 */
export async function POST(req: NextRequest) {
  try {
    const idToken = req.headers.get("privy-id-token");

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing identity token" },
        { status: 401 },
      );
    }

    // Verify identity token and get user
    const privy = getPrivyClient();
    const privyUser = await privy.users().get({ id_token: idToken });

    // Update signer status
    const user = await prisma.user.update({
      where: { id: privyUser.id },
      data: { walletSignerAdded: true },
    });

    return NextResponse.json({
      success: true,
      walletSignerAdded: user.walletSignerAdded,
    });
  } catch (error) {
    console.error("Signer status update error:", error);
    return NextResponse.json(
      { error: "Failed to update signer status" },
      { status: 500 },
    );
  }
}
