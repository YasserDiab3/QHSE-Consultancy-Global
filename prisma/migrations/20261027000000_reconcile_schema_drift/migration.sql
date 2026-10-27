-- Reconcile Prisma schema drift without touching existing data.
-- Safe to run repeatedly: every statement is idempotent.

-- Corrective-action fields live on Observation in the database, but were
-- previously declared only on TrainingQuestion in schema.prisma.
ALTER TABLE "Observation" ADD COLUMN IF NOT EXISTS "clientResponse" TEXT;
ALTER TABLE "Observation" ADD COLUMN IF NOT EXISTS "correctiveAction" TEXT;
ALTER TABLE "Observation" ADD COLUMN IF NOT EXISTS "correctiveActionStatus" TEXT;

-- Training questions expose client responses and corrective actions in the UI;
-- older databases created before these columns existed need them added.
ALTER TABLE "TrainingQuestion" ADD COLUMN IF NOT EXISTS "clientResponse" TEXT;
ALTER TABLE "TrainingQuestion" ADD COLUMN IF NOT EXISTS "correctiveAction" TEXT;
ALTER TABLE "TrainingQuestion" ADD COLUMN IF NOT EXISTS "correctiveActionStatus" TEXT;

-- Query-shape indexes used by report and observation screens.
CREATE INDEX IF NOT EXISTS "Observation_reportId_sortOrder_idx"
  ON "Observation" ("reportId", "sortOrder");
CREATE INDEX IF NOT EXISTS "Observation_status_idx"
  ON "Observation" ("status");
