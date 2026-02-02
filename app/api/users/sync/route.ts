import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getPrivyClient } from "@/lib/auth/verifyRequest";

export async function POST(req: NextRequest) {
  try {
    const idToken = req.headers.get("privy-id-token");

    if (!idToken) {
      return NextResponse.json(
        { error: "Missing identity token" },
        { status: 401 },
      );
    }

    // Verify identity token and get user data (email comes from verified token)
    const privy = getPrivyClient();
    const privyUser = await privy.users().get({ id_token: idToken });

    // Extract email from linked_accounts
    const emailAccount = privyUser.linked_accounts?.find(
      (account) => account.type === "email",
    ) as { type: "email"; address: string } | undefined;

    const user = await prisma.user.upsert({
      where: { id: privyUser.id },
      create: {
        id: privyUser.id,
        email: emailAccount?.address ?? null,
      },
      update: {
        email: emailAccount?.address ?? null,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("User sync error:", error);
    return NextResponse.json({ error: "Failed to sync user" }, { status: 401 });
  }
}
