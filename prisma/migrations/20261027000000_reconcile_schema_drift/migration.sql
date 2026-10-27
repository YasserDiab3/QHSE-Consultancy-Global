-- Reconcile Prisma schema drift without touching existing data.
-- Safe to run repeatedly: every statement is idempotent and dynamic.

-- Corrective-action fields live on Observation in the database.
ALTER TABLE "Observation" ADD COLUMN IF NOT EXISTS "clientResponse" TEXT;
ALTER TABLE "Observation" ADD COLUMN IF NOT EXISTS "correctiveAction" TEXT;
ALTER TABLE "Observation" ADD COLUMN IF NOT EXISTS "correctiveActionStatus" TEXT;

-- Training questions expose client responses and corrective actions in the UI.
ALTER TABLE "TrainingQuestion" ADD COLUMN IF NOT EXISTS "clientResponse" TEXT;
ALTER TABLE "TrainingQuestion" ADD COLUMN IF NOT EXISTS "correctiveAction" TEXT;
ALTER TABLE "TrainingQuestion" ADD COLUMN IF NOT EXISTS "correctiveActionStatus" TEXT;

-- Query-shape indexes: dynamically detect column casing (reportId vs reportid vs report_id)
DO $$
DECLARE
  r_col text;
  s_col text;
BEGIN
  SELECT column_name INTO r_col
  FROM information_schema.columns
  WHERE table_name ILIKE 'observation' AND lower(column_name) IN ('reportid', 'report_id')
  LIMIT 1;

  SELECT column_name INTO s_col
  FROM information_schema.columns
  WHERE table_name ILIKE 'observation' AND lower(column_name) IN ('sortorder', 'sort_order')
  LIMIT 1;

  IF r_col IS NOT NULL AND s_col IS NOT NULL THEN
    EXECUTE format('CREATE INDEX IF NOT EXISTS "Observation_report_sort_idx" ON "Observation" (%I, %I)', r_col, s_col);
  ELSIF r_col IS NOT NULL THEN
    EXECUTE format('CREATE INDEX IF NOT EXISTS "Observation_report_idx" ON "Observation" (%I)', r_col);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name ILIKE 'observation' AND lower(column_name) = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS "Observation_status_idx" ON "Observation" ("status");
  END IF;
END $$;
