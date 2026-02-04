/**
 * Twitter OAuth 2.0 Callback - Step 2
 * Handles the redirect from Twitter after authorization
 */

import { NextRequest, NextResponse } from "next/server";
import { TwitterApi } from "twitter-api-v2";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/utils/encryption";

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET!;
const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/twitter/oauth/callback`
  : "http://localhost:3000/api/twitter/oauth/callback";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Check for OAuth errors
    if (error) {
      // Try to preserve context even on error
      const agentIdFromCookie = request.cookies.get(
        "twitter_oauth_agent_id",
      )?.value;
      const chatIdFromCookie = request.cookies.get(
        "twitter_oauth_chat_id",
      )?.value;

      const errorParams = new URLSearchParams({ twitter_error: error });
      if (agentIdFromCookie) errorParams.set("agent", agentIdFromCookie);
      if (chatIdFromCookie) errorParams.set("chatId", chatIdFromCookie);

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/chat?${errorParams.toString()}`,
      );
    }

    // Verify required parameters
    if (!code || !state) {
      return NextResponse.json(
        { error: "Missing code or state parameter" },
        { status: 400 },
      );
    }

    // Retrieve stored values from cookies
    const storedState = request.cookies.get("twitter_oauth_state")?.value;
    const codeVerifier = request.cookies.get("twitter_oauth_verifier")?.value;
    const userId = request.cookies.get("twitter_oauth_user_id")?.value;
    const agentId = request.cookies.get("twitter_oauth_agent_id")?.value;
    const chatId = request.cookies.get("twitter_oauth_chat_id")?.value;

    // Verify state matches (CSRF protection)
    if (state !== storedState) {
      return NextResponse.json(
        { error: "Invalid state parameter" },
        { status: 400 },
      );
    }

    if (!codeVerifier || !userId) {
      return NextResponse.json(
        { error: "Missing OAuth session data" },
        { status: 400 },
      );
    }

    // Exchange authorization code for access token
    const client = new TwitterApi({
      clientId: TWITTER_CLIENT_ID,
      clientSecret: TWITTER_CLIENT_SECRET,
    });

    const { accessToken, refreshToken, expiresIn } =
      await client.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: CALLBACK_URL,
      });

    // Get user info from Twitter
    const authenticatedClient = new TwitterApi(accessToken);
    const { data: twitterUser } = await authenticatedClient.v2.me();

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Encrypt tokens before storing in database
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;

    // Store encrypted tokens in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        twitterAccessToken: encryptedAccessToken,
        twitterRefreshToken: encryptedRefreshToken,
        twitterTokenExpiresAt: expiresAt,
        twitterUserId: twitterUser.id,
        twitterUsername: twitterUser.username,
        twitterConnectedAt: new Date(),
      },
    });

    // Build redirect URL with preserved context
    const redirectParams = new URLSearchParams({ twitter_connected: "true" });
    if (agentId) redirectParams.set("agent", agentId);
    if (chatId) redirectParams.set("chatId", chatId);

    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/chat?${redirectParams.toString()}`;

    // Clear OAuth cookies
    const response = NextResponse.redirect(redirectUrl);

    response.cookies.delete("twitter_oauth_state");
    response.cookies.delete("twitter_oauth_verifier");
    response.cookies.delete("twitter_oauth_user_id");
    response.cookies.delete("twitter_oauth_agent_id");
    response.cookies.delete("twitter_oauth_chat_id");

    return response;
  } catch (error: unknown) {
    // Log detailed error for debugging
    console.error("Twitter OAuth callback error:", error);

    // Extract more details from twitter-api-v2 errors
    const err = error as Error & {
      data?: { error?: string; error_description?: string };
      code?: number;
    };

    if (err.data) {
      console.error("Twitter API error details:", {
        error: err.data.error,
        description: err.data.error_description,
        code: err.code,
      });
    }

    // Log credentials check (without exposing secrets)
    console.error("Credentials check:", {
      hasClientId: !!TWITTER_CLIENT_ID,
      clientIdLength: TWITTER_CLIENT_ID?.length,
      hasClientSecret: !!TWITTER_CLIENT_SECRET,
      clientSecretLength: TWITTER_CLIENT_SECRET?.length,
      callbackUrl: CALLBACK_URL,
    });

    // Try to preserve context even on error
    const agentIdFromCookie = request.cookies.get(
      "twitter_oauth_agent_id",
    )?.value;
    const chatIdFromCookie = request.cookies.get(
      "twitter_oauth_chat_id",
    )?.value;

    const errorParams = new URLSearchParams({
      twitter_error: "callback_failed",
    });
    if (agentIdFromCookie) errorParams.set("agent", agentIdFromCookie);
    if (chatIdFromCookie) errorParams.set("chatId", chatIdFromCookie);

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/chat?${errorParams.toString()}`,
    );
  }
}
