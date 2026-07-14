CREATE TABLE IF NOT EXISTS "ClientDocument" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'SYSTEM',
  "url" TEXT NOT NULL,
  "originalName" TEXT,
  "mimeType" TEXT,
  "size" INTEGER,
  "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientDocument_pkey" PRIMARY KEY ("id")
);
CREATE TABLE IF NOT EXISTS "FinancialRecord" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EGP',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "dueDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ClientDocument_clientId_createdat_idx" ON "ClientDocument" ("clientId", "createdat" DESC);
CREATE INDEX IF NOT EXISTS "FinancialRecord_clientId_createdat_idx" ON "FinancialRecord" ("clientId", "createdat" DESC);
DO $$ BEGIN
  ALTER TABLE "ClientDocument" ADD CONSTRAINT "ClientDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FinancialRecord" ADD CONSTRAINT "FinancialRecord_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
