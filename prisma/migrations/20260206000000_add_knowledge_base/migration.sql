-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable: Resources - source material for the knowledge base
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Embeddings - vector chunks of resources
CREATE TABLE "Embedding" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,

    CONSTRAINT "Embedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Resource indexes
CREATE INDEX "Resource_userId_idx" ON "Resource"("userId");
CREATE INDEX "Resource_agentId_idx" ON "Resource"("agentId");
CREATE INDEX "Resource_userId_agentId_idx" ON "Resource"("userId", "agentId");
CREATE INDEX "Resource_createdAt_idx" ON "Resource"("createdAt");

-- CreateIndex: Embedding HNSW index for fast cosine similarity search
CREATE INDEX "Embedding_embedding_idx" ON "Embedding" USING hnsw ("embedding" vector_cosine_ops);

-- CreateIndex: Embedding resource lookup
CREATE INDEX "Embedding_resourceId_idx" ON "Embedding"("resourceId");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
