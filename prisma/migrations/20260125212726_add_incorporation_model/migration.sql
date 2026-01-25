-- AlterTable
ALTER TABLE "SwarmAgent" ADD COLUMN     "incorporationId" TEXT;

-- CreateTable
CREATE TABLE "Incorporation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "color" TEXT,
    "size" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incorporation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Incorporation_name_idx" ON "Incorporation"("name");

-- CreateIndex
CREATE INDEX "SwarmAgent_incorporationId_idx" ON "SwarmAgent"("incorporationId");

-- AddForeignKey
ALTER TABLE "SwarmAgent" ADD CONSTRAINT "SwarmAgent_incorporationId_fkey" FOREIGN KEY ("incorporationId") REFERENCES "Incorporation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
