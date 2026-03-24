/**
 * API Key — Revoke
 *
 * DELETE /api/api-keys/[keyId] — Soft-revoke a key (sets revokedAt)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, isAuthResult } from "@/lib/auth/verifyRequest";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> },
) {
  try {
    const auth = await requireAuth(req);
    if (!isAuthResult(auth)) return auth;

    const { keyId } = await params;

    const existing = await prisma.apiKey.findUnique({
      where: { id: keyId },
      select: { userId: true, revokedAt: true },
    });

    if (!existing || existing.userId !== auth.userId) {
      return NextResponse.json({ error: "Key not found" }, { status: 404 });
    }

    if (existing.revokedAt) {
      return NextResponse.json(
        { error: "Key already revoked" },
        { status: 400 },
      );
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api-keys] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to revoke key" },
      { status: 500 },
    );
  }
}
