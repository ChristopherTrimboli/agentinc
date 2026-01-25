/*
  Warnings:

  - You are about to drop the column `incorporationId` on the `SwarmAgent` table. All the data in the column will be lost.
  - You are about to drop the `Incorporation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SwarmAgent" DROP CONSTRAINT "SwarmAgent_incorporationId_fkey";

-- DropIndex
DROP INDEX "SwarmAgent_incorporationId_idx";

-- AlterTable
ALTER TABLE "SwarmAgent" DROP COLUMN "incorporationId",
ADD COLUMN     "corporationId" TEXT;

-- DropTable
DROP TABLE "Incorporation";

-- CreateTable
CREATE TABLE "Corporation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "color" TEXT,
    "size" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Corporation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Corporation_name_idx" ON "Corporation"("name");

-- CreateIndex
CREATE INDEX "SwarmAgent_corporationId_idx" ON "SwarmAgent"("corporationId");

-- AddForeignKey
ALTER TABLE "SwarmAgent" ADD CONSTRAINT "SwarmAgent_corporationId_fkey" FOREIGN KEY ("corporationId") REFERENCES "Corporation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
