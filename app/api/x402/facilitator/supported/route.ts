/**
 * X402 Facilitator - Supported Endpoint
 *
 * Returns supported networks and schemes.
 */

import { NextResponse } from "next/server";
import { getSupported } from "@/lib/x402/sol-facilitator";

export async function GET() {
  return NextResponse.json(getSupported());
}
