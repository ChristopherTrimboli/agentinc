-- AlterTable
ALTER TABLE "Corporation" ADD COLUMN "launchSignature" TEXT;
ALTER TABLE "Corporation" ADD COLUMN "launchWallet" TEXT;
ALTER TABLE "Corporation" ADD COLUMN "launchedAt" TIMESTAMP(3);
ALTER TABLE "Corporation" ADD COLUMN "tokenMetadata" TEXT;
ALTER TABLE "Corporation" ADD COLUMN "tokenMint" TEXT;
ALTER TABLE "Corporation" ADD COLUMN "tokenSymbol" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Corporation_tokenMint_key" ON "Corporation"("tokenMint");

-- CreateIndex
CREATE INDEX "Corporation_tokenMint_idx" ON "Corporation"("tokenMint");
