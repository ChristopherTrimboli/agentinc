/**
 * Twitter OAuth 2.0 Callback - Step 2
 * Handles the redirect from Twitter after authorization
 * Uses @xdevplatform/xdk for token exchange and user info
 */

import { NextRequest, NextResponse } from "next/server";
import { OAuth2, Client } from "@xdevplatform/xdk";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/utils/encryption";

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID || "";
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || "";
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

    // Exchange authorization code for access token using XDK OAuth2
    const oauth2 = new OAuth2({
      clientId: TWITTER_CLIENT_ID,
      clientSecret: TWITTER_CLIENT_SECRET,
      redirectUri: CALLBACK_URL,
      scope: [
        "tweet.read",
        "tweet.write",
        "users.read",
        "follows.read",
        "follows.write",
        "offline.access",
        "like.read",
        "like.write",
        "bookmark.read",
        "bookmark.write",
        "dm.read",
        "dm.write",
        "list.read",
        "list.write",
      ],
    });

    const tokens = await oauth2.exchangeCode(code, codeVerifier);

    // Get user info from Twitter using XDK Client
    const xClient = new Client({ accessToken: tokens.access_token });
    const meResponse = await xClient.users.getMe({
      userFields: ["id", "username"],
    });

    const twitterUser = meResponse.data!;

    // Calculate token expiration
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Encrypt tokens before storing in database
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : null;

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

    // Extract more details from XDK API errors
    const err = error as Error & {
      status?: number;
      statusText?: string;
      data?: { error?: string; error_description?: string };
    };

    if (err.data) {
      console.error("X API error details:", {
        error: err.data.error,
        description: err.data.error_description,
        status: err.status,
      });
    }

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
