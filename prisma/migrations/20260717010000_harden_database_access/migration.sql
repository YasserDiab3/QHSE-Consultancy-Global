-- Defense in depth for the Supabase public schema.
-- The portal accesses these tables only through server-side Prisma code; direct
-- anon/authenticated access remains denied until explicit Supabase Auth policies exist.

ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContactRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Image" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobApplication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobOpening" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KnowledgeFolder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Observation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimitEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrainingAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrainingCourse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrainingEnrollment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TrainingQuestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VisitorSession" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;

-- Add referential integrity only when existing data is clean. This keeps a
-- deployment from discarding or corrupting historical training records.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TrainingQuestion_courseId_fkey')
     AND NOT EXISTS (
       SELECT 1 FROM "TrainingQuestion" q
       LEFT JOIN "TrainingCourse" c ON c."id" = q."courseId"
       WHERE c."id" IS NULL
     ) THEN
    ALTER TABLE "TrainingQuestion"
      ADD CONSTRAINT "TrainingQuestion_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TrainingEnrollment_userId_fkey')
     AND NOT EXISTS (
       SELECT 1 FROM "TrainingEnrollment" e
       LEFT JOIN "User" u ON u."id" = e."userId"
       WHERE u."id" IS NULL
     ) THEN
    ALTER TABLE "TrainingEnrollment"
      ADD CONSTRAINT "TrainingEnrollment_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TrainingEnrollment_courseId_fkey')
     AND NOT EXISTS (
       SELECT 1 FROM "TrainingEnrollment" e
       LEFT JOIN "TrainingCourse" c ON c."id" = e."courseId"
       WHERE c."id" IS NULL
     ) THEN
    ALTER TABLE "TrainingEnrollment"
      ADD CONSTRAINT "TrainingEnrollment_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TrainingAttempt_userId_fkey')
     AND NOT EXISTS (
       SELECT 1 FROM "TrainingAttempt" a
       LEFT JOIN "User" u ON u."id" = a."userId"
       WHERE u."id" IS NULL
     ) THEN
    ALTER TABLE "TrainingAttempt"
      ADD CONSTRAINT "TrainingAttempt_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TrainingAttempt_courseId_fkey')
     AND NOT EXISTS (
       SELECT 1 FROM "TrainingAttempt" a
       LEFT JOIN "TrainingCourse" c ON c."id" = a."courseId"
       WHERE c."id" IS NULL
     ) THEN
    ALTER TABLE "TrainingAttempt"
      ADD CONSTRAINT "TrainingAttempt_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "TrainingCourse"("id") ON DELETE CASCADE;
  END IF;
END $$;
