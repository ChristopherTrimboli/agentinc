import { NextRequest, NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/node";

// Singleton Privy client
let _privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient {
  if (!_privyClient) {
    _privyClient = new PrivyClient({
      appId: process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      appSecret: process.env.PRIVY_APP_SECRET!,
    });
  }
  return _privyClient;
}

export interface AuthResult {
  userId: string;
  walletAddress?: string;
  walletId?: string;
}

/**
 * Verify authentication from request headers.
 * Returns user info if authenticated, null otherwise.
 */
export async function verifyAuth(
  req: NextRequest
): Promise<AuthResult | null> {
  const idToken = req.headers.get("privy-id-token");
  if (!idToken) return null;

  const privy = getPrivyClient();

  try {
    const user = await privy.users().get({ id_token: idToken });

    // Find the Solana embedded wallet
    const solanaWallet = user.linked_accounts?.find((account) => {
      if (account.type !== "wallet") return false;

      const wallet = account as {
        chain_type?: string;
        chainType?: string;
        chain?: string;
      };

      return (
        wallet.chain_type === "solana" ||
        wallet.chainType === "solana" ||
        wallet.chain === "solana"
      );
    });

    const walletData = solanaWallet as
      | { id: string; address: string }
      | undefined;

    return {
      userId: user.id,
      walletAddress: walletData?.address,
      walletId: walletData?.id,
    };
  } catch (error) {
    console.error("[Auth] verifyAuth error:", error);
    return null;
  }
}

/**
 * Middleware helper that returns an unauthorized response if auth fails.
 * Use this to reduce boilerplate in API routes.
 */
export async function requireAuth(
  req: NextRequest
): Promise<AuthResult | NextResponse> {
  const auth = await verifyAuth(req);

  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return auth;
}

/**
 * Type guard to check if the result is an auth object or a response.
 */
export function isAuthResult(
  result: AuthResult | NextResponse
): result is AuthResult {
  return "userId" in result;
}
