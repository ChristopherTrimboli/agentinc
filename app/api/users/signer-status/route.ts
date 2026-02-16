import { NextResponse } from "next/server";

/**
 * DEPRECATED — Signer status endpoint is no longer needed.
 *
 * Server-owned wallets don't require client-side signer ceremonies.
 * This route is kept as a no-op to avoid 404s from older clients
 * that might still call it during the transition period.
 */
export async function POST() {
  return NextResponse.json({
    success: true,
    deprecated: true,
    message: "Signer status is no longer needed. Wallets are now server-owned.",
  });
}
