CREATE TABLE IF NOT EXISTS "KnowledgeFolder" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "parentId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'SYSTEM',
  "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeFolder_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ClientDocument" ADD COLUMN IF NOT EXISTS "folderId" TEXT;

CREATE INDEX IF NOT EXISTS "KnowledgeFolder_clientId_parentId_idx" ON "KnowledgeFolder"("clientId", "parentId");
CREATE INDEX IF NOT EXISTS "KnowledgeFolder_clientId_createdat_idx" ON "KnowledgeFolder"("clientId", "createdat" DESC);
CREATE INDEX IF NOT EXISTS "ClientDocument_folderId_idx" ON "ClientDocument"("folderId");

DO $$ BEGIN
  ALTER TABLE "KnowledgeFolder" ADD CONSTRAINT "KnowledgeFolder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "KnowledgeFolder" ADD CONSTRAINT "KnowledgeFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "KnowledgeFolder"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "KnowledgeFolder"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
