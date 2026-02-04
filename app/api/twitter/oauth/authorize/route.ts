/**
 * Twitter OAuth 2.0 Authorization - Step 1
 * Redirects user to Twitter for authorization
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID!;
const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/twitter/oauth/callback`
  : "http://localhost:3000/api/twitter/oauth/callback";

// Generate PKCE challenge
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { codeVerifier, codeChallenge };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const agentId = searchParams.get("agentId");
    const chatId = searchParams.get("chatId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 },
      );
    }

    // Generate PKCE challenge
    const { codeVerifier, codeChallenge } = generatePKCE();
    const state = crypto.randomBytes(16).toString("hex");

    // Store code_verifier and state in a cookie for verification in callback
    const response = NextResponse.redirect(
      `https://x.com/i/oauth2/authorize?` +
        new URLSearchParams({
          response_type: "code",
          client_id: TWITTER_CLIENT_ID,
          redirect_uri: CALLBACK_URL,
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
          ].join(" "),
          state,
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
        }),
    );

    // Set cookies to remember state and code_verifier
    response.cookies.set("twitter_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });

    response.cookies.set("twitter_oauth_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });

    response.cookies.set("twitter_oauth_user_id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });

    // Store chat context to restore after OAuth
    if (agentId) {
      response.cookies.set("twitter_oauth_agent_id", agentId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
      });
    }

    if (chatId) {
      response.cookies.set("twitter_oauth_chat_id", chatId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
      });
    }

    return response;
  } catch (error) {
    console.error("Twitter OAuth authorize error:", error);
    return NextResponse.json(
      { error: "Failed to start OAuth flow" },
      { status: 500 },
    );
  }
}
