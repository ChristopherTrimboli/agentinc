import { NextRequest, NextResponse } from "next/server";
import { BagsSDK } from "@bagsfm/bags-sdk";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";
import { getConnection } from "@/lib/constants/solana";
import { isValidPublicKey, validatePublicKey } from "@/lib/utils/validation";
import { rateLimitByUser } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!isAuthResult(auth)) return auth;

  const limited = await rateLimitByUser(auth.userId, "task-mint-launch", 10);
  if (limited) return limited;

  try {
    const apiKey = process.env.BAGS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Bags API key not configured" },
        { status: 500 },
      );
    }

    if (!auth.walletAddress) {
      return NextResponse.json(
        { error: "No active wallet found" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { tokenMint, metadataUrl, initialBuyLamports, configKey } = body;

    if (!tokenMint || !metadataUrl || !configKey) {
      return NextResponse.json(
        {
          error: "Missing required fields: tokenMint, metadataUrl, configKey",
        },
        { status: 400 },
      );
    }

    const invalidKeys: string[] = [];
    if (!isValidPublicKey(tokenMint)) invalidKeys.push("tokenMint");
    if (!isValidPublicKey(configKey)) invalidKeys.push("configKey");
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `Invalid Solana public key(s): ${invalidKeys.join(", ")}` },
        { status: 400 },
      );
    }

    if (initialBuyLamports !== undefined && initialBuyLamports !== null) {
      if (
        typeof initialBuyLamports !== "number" ||
        initialBuyLamports < 0 ||
        !Number.isFinite(initialBuyLamports)
      ) {
        return NextResponse.json(
          { error: "initialBuyLamports must be a non-negative finite number" },
          { status: 400 },
        );
      }
    }

    if (typeof metadataUrl !== "string" || metadataUrl.length > 500) {
      return NextResponse.json(
        { error: "metadataUrl must be a string of 500 chars or less" },
        { status: 400 },
      );
    }

    const connection = getConnection();
    const sdk = new BagsSDK(apiKey, connection, "confirmed");

    const tokenMintPubkey = validatePublicKey(tokenMint, "tokenMint");
    const walletPubkey = validatePublicKey(auth.walletAddress, "wallet");
    const configKeyPubkey = validatePublicKey(configKey, "configKey");

    const launchTransaction = await sdk.tokenLaunch.createLaunchTransaction({
      metadataUrl,
      tokenMint: tokenMintPubkey,
      launchWallet: walletPubkey,
      initialBuyLamports: initialBuyLamports ?? 0,
      configKey: configKeyPubkey,
    });

    const transactionBase64 = Buffer.from(
      launchTransaction.serialize(),
    ).toString("base64");

    return NextResponse.json({ transaction: transactionBase64 });
  } catch (error) {
    console.error("[Task Token Launch] Error:", error);
    return NextResponse.json(
      { error: "Failed to create task token launch transaction" },
      { status: 500 },
    );
  }
}
