-- CreateTable
CREATE TABLE "SwarmAgent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "capabilities" TEXT[],
    "color" TEXT,
    "size" INTEGER NOT NULL DEFAULT 35,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwarmAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwarmEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceAgentId" TEXT NOT NULL,
    "targetAgentId" TEXT,

    CONSTRAINT "SwarmEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SwarmAgent_name_idx" ON "SwarmAgent"("name");

-- CreateIndex
CREATE INDEX "SwarmEvent_sourceAgentId_idx" ON "SwarmEvent"("sourceAgentId");

-- CreateIndex
CREATE INDEX "SwarmEvent_targetAgentId_idx" ON "SwarmEvent"("targetAgentId");

-- CreateIndex
CREATE INDEX "SwarmEvent_timestamp_idx" ON "SwarmEvent"("timestamp");

-- CreateIndex
CREATE INDEX "SwarmEvent_type_idx" ON "SwarmEvent"("type");

-- AddForeignKey
ALTER TABLE "SwarmEvent" ADD CONSTRAINT "SwarmEvent_sourceAgentId_fkey" FOREIGN KEY ("sourceAgentId") REFERENCES "SwarmAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwarmEvent" ADD CONSTRAINT "SwarmEvent_targetAgentId_fkey" FOREIGN KEY ("targetAgentId") REFERENCES "SwarmAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
