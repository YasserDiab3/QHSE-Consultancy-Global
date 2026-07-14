-- Training portal: courses, questions, learner progress, attempts, and certificates.
-- Uses IF NOT EXISTS so it can safely be applied to databases that were already
-- initialized by the application before Prisma migrations were introduced.

CREATE TABLE IF NOT EXISTS "TrainingCourse" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "titleAr" TEXT,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "descriptionAr" TEXT,
  "content" TEXT NOT NULL,
  "contentAr" TEXT,
  "passingScore" INTEGER NOT NULL DEFAULT 80,
  "isPublished" BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TrainingQuestion" (
  "id" TEXT PRIMARY KEY,
  "courseId" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "questionAr" TEXT,
  "optionA" TEXT NOT NULL,
  "optionAAr" TEXT,
  "optionB" TEXT NOT NULL,
  "optionBAr" TEXT,
  "optionC" TEXT NOT NULL,
  "optionCAr" TEXT,
  "optionD" TEXT NOT NULL,
  "optionDAr" TEXT,
  "correctOption" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TrainingEnrollment" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "score" INTEGER,
  "passed" BOOLEAN NOT NULL DEFAULT FALSE,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "certificateCode" TEXT UNIQUE,
  "certificateIssuedAt" TIMESTAMP,
  "completedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId", "courseId")
);

CREATE TABLE IF NOT EXISTS "TrainingAttempt" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "passed" BOOLEAN NOT NULL DEFAULT FALSE,
  "answers" JSONB NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "TrainingCourse_published_sort_idx"
  ON "TrainingCourse" ("isPublished", "sortOrder");
CREATE INDEX IF NOT EXISTS "TrainingQuestion_course_sort_idx"
  ON "TrainingQuestion" ("courseId", "sortOrder");
CREATE INDEX IF NOT EXISTS "TrainingEnrollment_user_idx"
  ON "TrainingEnrollment" ("userId");
CREATE INDEX IF NOT EXISTS "TrainingAttempt_user_course_idx"
  ON "TrainingAttempt" ("userId", "courseId");
CREATE INDEX IF NOT EXISTS "TrainingAttempt_created_idx"
  ON "TrainingAttempt" ("createdAt" DESC);
