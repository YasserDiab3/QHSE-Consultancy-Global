ALTER TABLE "Observation" ADD COLUMN IF NOT EXISTS "clientResponse" TEXT;
ALTER TABLE "Observation" ADD COLUMN IF NOT EXISTS "correctiveAction" TEXT;
ALTER TABLE "Observation" ADD COLUMN IF NOT EXISTS "correctiveActionStatus" TEXT;
