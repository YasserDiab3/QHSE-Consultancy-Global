# Database & Storage Architecture Audit

**Project:** QHSSE Consultant Portal (`qhsse-consultant-portal`)
**Review date:** 27 October 2026
**Reviewer:** Backend Architecture
**Scope:** Prisma schema, migration history, seed data, database access layer (`lib/*-records.ts`), upload and list API routes, storage configuration, indexes, pagination, and migration operations.
**Status:** Read-only audit. No application code, migrations, database rows, or dependencies were changed. The only file written is this report.
**Method:** Static review of the repository at `D:\Apps\safety consulataint`, including every file under `prisma/migrations/`, `prisma/schema.prisma`, `prisma/seed.ts`, the `lib/` data-access modules, the affected `app/api/` routes, `package.json`, `vercel.json`, and the environment examples. Prisma/Supabase behavior was checked against the installed versions: Next.js `16.2.10`, Prisma `5.22.0`, `@supabase/supabase-js` `2.110.7`.
**Limitations:** The production `_prisma_migrations` table, live column types, row counts, and actual index definitions were not queried. Statements about production are inferred from the schema, migrations, and runtime code. Section 14 provides the exact queries to confirm the live state before executing any step in Section 13.

---

## 0. How to read this report

- **Section 1** is the decision-maker summary.
- **Section 3** documents what is verifiably true in the repository, with file and line references.
- **Section 4** contains the findings, each with evidence, impact, required change, and acceptance criteria.
- **Sections 5–11** are the target design: schema, migrations, storage, query layer, pagination, and indexes.
- **Section 12** covers security hardening that is coupled to the database work.
- **Section 13** is the ordered implementation plan with risk notes and rollback for each phase.
- **Section 14** contains verification SQL and test cases.
- **Section 15** is the exact file-change matrix.
- **Section 16** lists assumptions and open questions.

The report deliberately separates **expand** work (safe, additive, reversible) from **contract** work (destructive, later, gated by verification). Do not combine them in one deployment.

---

## 1. Executive summary

The application works, but its database lifecycle is not reproducible and its file storage model is on a collision course with production limits. The highest-impact issues are:

1. **There is no baseline migration.** Nine delta migrations exist, but none creates `User`, `Client`, `Report`, `Observation`, `Image`, `ActivityLog`, `JobOpening`, `JobApplication`, `ContactRequest`, or `VisitorSession`. Those tables were created with `prisma db push` (or manually). A fresh environment cannot be provisioned from `prisma/migrations/`, and `prisma migrate deploy` has no trustworthy history to replay.
2. **The corrective-action fields are declared on the wrong Prisma model.** `Observation.clientResponse`, `Observation.correctiveAction`, and `Observation.correctiveActionStatus` exist in the database (migration `20260715000000_add_client_corrective_actions`) and are read/written by the application, but they are **not** declared on `Observation` in `prisma/schema.prisma`. The same three fields are declared on `TrainingQuestion` (lines 315–317) but do not exist in the training migration or the runtime DDL. Running `prisma db push` would **drop the real Observation columns (data loss)** and add empty columns to `TrainingQuestion`.
3. **`sortOrder` is a SQL-injection sink.** `lib/observation-records.ts` interpolates `input.sortOrder` directly into SQL at lines 168 and 213. The observation POST/PUT routes do not validate the body with Zod. An admin-authenticated request can inject arbitrary SQL expressions into the `UPDATE`/`INSERT`; at minimum this permits unauthorized data modification, and depending on the driver protocol it may permit stacked statements.
4. **File bytes are stored as base64 in Postgres.** `Image.url` holds data URLs up to 8 MB, `JobApplication.resumeUrl` up to 5 MB, `ClientDocument.url` up to 3 MB (client cap) / 4.2 MB (schema cap), and `Client.contactInfo` holds a logo data URL up to 1.4 MB. Base64 adds ~33% size, so an 8 MB image becomes ~10.7 MB of text. This inflates WAL, backups, replication, and every JSON response that includes the row.
5. **The upload limits exceed the hosting request limit.** Vercel Functions have a ~4.5 MB request/response body limit. The image route accepts 8 MB and the resume route accepts 5 MB before base64 expansion. Requests fail at the platform edge with a 413 before the route's own validation runs. Conversely, admin list endpoints return every stored data URL, so a single response can exceed 4.5 MB and fail in the other direction.
6. **The training module performs runtime DDL and production seeding on first request.** `lib/training-records.ts` issues `CREATE TABLE`, `CREATE INDEX`, and inserts default courses/questions inside request handlers (`ensureTrainingTables()` is called by 11 exported functions). The application role therefore needs DDL privileges, concurrent cold starts race, migrations cannot be verified, and production content is created as a side effect of a read.
7. **List endpoints are unbounded and the risk filter runs in JavaScript.** `GET /api/reports` loads every report, every observation, and every image for the caller, then filters `riskLevel` in memory (`lib/report-records.ts:496–507`). `GET /api/job-applications`, `GET /api/knowledge-bank`, `GET /api/client-documents`, and `GET /api/clients` have the same shape. There is no cursor, no page size, and no stable ordering contract.
8. **Every admin `GET /api/reports` mutates data.** `backfillMissingReportConsultantIds(session.user.id)` runs on each admin request (`app/api/reports/route.ts:39`), updating every report with a null/empty consultant to the current admin. This is a read endpoint with write side effects, a full-table scan, and an audit-trail corruption risk.
9. **Seed credentials are unsafe and partially broken.** The admin hash is a valid bcrypt hash for `admin123` and is printed to the console. The client hash is 61 characters (bcrypt hashes are 60), so the advertised `client123` login does not work. Both are hard-coded in `prisma/seed.ts`.
10. **Indexes do not match the query shapes.** The hot paths order by `date`, `createdAt`, or `sortOrder` and filter by `status`, `riskLevel`, `clientId`, and `folderId`, but the schema mostly has single-column indexes. Several indexes are duplicated by unique constraints (`User.email`, `Client.userId`, `TrainingEnrollment.userId`).

**Target state:** one baseline migration plus idempotent reconcile migrations; `Observation` as the single owner of corrective-action fields; Prisma Client (or `Prisma.sql` tagged templates) for all runtime queries; no runtime DDL; private Supabase Storage buckets with server-issued signed upload/read URLs; cursor pagination with server-side filters; composite indexes aligned to the list queries; and a release process that runs `prisma migrate deploy` against `DIRECT_URL` before the application deploy.

---

## 2. Severity and priority

| Severity | Meaning | Required timing |
|---|---|---|
| **Blocker** | Prevents reproducible deployment or causes immediate data loss | Before the next production deploy |
| **Critical** | Exploitable security issue, data corruption, or production outage under normal use | Within 24–72 hours |
| **High** | Material reliability/performance problem that worsens with data volume | Current sprint |
| **Medium** | Maintainability, cost, or observability gap | Next 2–4 weeks |
| **Low** | Cleanup or consistency improvement | Backlog |

| ID | Finding | Severity | Effort |
|---|---|---|---|
| F-01 | No baseline migration; fresh database cannot be built from migrations | Blocker | 1–2 days |
| F-02 | Corrective-action fields split across `Observation`/`TrainingQuestion`; `db push` drops data | Blocker | 0.5 day schema + deploy |
| F-03 | SQL injection via unvalidated `sortOrder` | Critical | 2–4 hours hotfix |
| F-04 | Base64 file bytes in Postgres; limits exceed Vercel body cap | Critical | 5–7 days |
| F-05 | Admin list responses embed full files; unbounded payloads | Critical | 2–3 days |
| F-06 | Runtime DDL and seeding inside request handlers | High | 3–5 days |
| F-07 | Unbounded lists; `riskLevel` filtered in JavaScript | High | 2–3 days |
| F-08 | `GET /api/reports` performs a full-table backfill update | High | 2 hours + one-time script |
| F-09 | Schema introspection cached forever; missing columns silently degrade | High | Included in F-06/F-07 |
| F-10 | Hard-coded/invalid seed credentials | High | 0.5 day |
| F-11 | Raw database error messages returned to clients | Medium | 0.5 day |
| F-12 | Missing and duplicate indexes | Medium | 1 day + index build |
| F-13 | Inconsistent physical column naming and timestamp precision | Medium | 1–2 days (contract phase) |
| F-14 | RLS is enabled but bypassed by the table owner; false isolation confidence | Medium | 2–3 days |
| F-15 | No migration deploy step in build/release; `db:push` exposed | High | 0.5 day |
| F-16 | Storage env vars and service-role key absent; SDK installed but unused | High | Part of F-04 |
| F-17 | No database/storage SLOs, slow-query logging, or health checks | Medium | 1–2 days |
| F-18 | Document upload validation lacks deep signature checks and malware scanning | Medium | 1–2 days |

---

## 3. Verified current state

### 3.1 Repository and runtime facts

| Fact | Evidence |
|---|---|
| Working tree is not a git repository at audit time, although a `.git` directory exists | Environment metadata |
| Prisma 5.22.0, Next.js 16.2.10, `@supabase/supabase-js` 2.110.7 installed | `package.json:17–18,27,51` |
| Build runs `prisma generate && next build` only | `package.json:8` |
| No `db:migrate`, `migrate deploy`, or `migrate status` script | `package.json:5–14` |
| `db:push` is exposed as `npm run db:push` | `package.json:12` |
| Vercel build does not run migrations | `vercel.json:1–7` |
| Nine migration folders, zero `migration_lock.toml`, zero baseline | `prisma/migrations/` listing |
| Supabase SDK is installed but no `lib/` or `app/` file imports it | Repository-wide search |
| CSP already permits `https://*.supabase.co` for `connect-src` and all HTTPS images | `next.config.js:15` |
| `NEXT_PUBLIC_SUPABASE_URL` and anon key are documented; no service-role key | `.env.production.example:10–12` |

### 3.2 Schema drift matrix

“Effective production” is inferred from the migrations that are present. It must be confirmed with the queries in Section 14.

| Model / field | `prisma/schema.prisma` | Migration history | Runtime DDL | Effective production | Required action |
|---|---|---|---|---|---|
| `Observation.clientResponse` | **Missing** | Added by `20260715000000_add_client_corrective_actions` | Not created | Present | Add to `Observation` |
| `Observation.correctiveAction` | **Missing** | Added by `20260715000000` | Not created | Present | Add to `Observation` |
| `Observation.correctiveActionStatus` | **Missing** | Added by `20260715000000` | Not created | Present | Add to `Observation` |
| `TrainingQuestion.clientResponse` | Declared at `schema.prisma:315` | **Missing** | Not created | Absent (unless `db push` ran) | Remove from schema |
| `TrainingQuestion.correctiveAction` | Declared at `schema.prisma:316` | **Missing** | Not created | Absent (unless `db push` ran) | Remove from schema |
| `TrainingQuestion.correctiveActionStatus` | Declared at `schema.prisma:317` | **Missing** | Not created | Absent (unless `db push` ran) | Remove from schema |
| Core tables (`User`, `Client`, `Report`, `Observation`, `Image`, `ActivityLog`, `JobOpening`, `JobApplication`, `ContactRequest`, `VisitorSession`) | Declared | **No CREATE migration** | Not created | Created by `db push`/manual | Baseline |
| `TrainingCourse`, `TrainingQuestion`, `TrainingEnrollment`, `TrainingAttempt` | Declared | Created by `20260714000000_add_training_portal` | Created by `training-records.ts` | Present | Baseline + remove runtime DDL |
| `ClientDocument`, `FinancialRecord` | Declared | Created by `20260714030000_add_client_profile_bank` | Not created | Present | Baseline |
| `KnowledgeFolder`, `ClientDocument.folderId` | Declared | Created by `20260717000000_add_knowledge_folders` | Not created | Present | Baseline |
| `RateLimitEntry` | Declared | Created by `20260716000000_add_rate_limit_entries` | Not created | Present | Baseline |
| `User.phone` | Declared | Added by `20260714010000_add_user_phone` | Not created | Present | Baseline |
| `Report.assessmentScores` | Declared | Added by `20260714020000_add_report_assessment_scores` | Not created | Present | Baseline |
| Storage columns (`storageBucket`, `storagePath`, `resumeBucket`, `resumePath`, `logoBucket`, `logoPath`, etc.) | **Missing** | Missing | Not created | Absent | Add in expand migration |
| `UploadIntent` | **Missing** | Missing | Not created | Absent | Add to schema + migration |

**Timestamp precision drift:** Prisma's PostgreSQL `DateTime` maps to `timestamp(3)`. The training migration uses `TIMESTAMP` without precision (effectively `timestamp(6)`) for `TrainingCourse`, `TrainingQuestion`, `TrainingEnrollment`, and `TrainingAttempt`. `prisma migrate diff` will report this as drift even though the application works. Align these columns to `timestamp(3)` in the contract phase, during a low-traffic window.

### 3.3 Migration inventory

| Migration | What it does | Idempotent? | Issues |
|---|---|---|---|
| `20260714000000_add_training_portal` | Creates the four training tables and five indexes | Yes (`IF NOT EXISTS`) | Missing the three corrective-action columns that the schema declares on `TrainingQuestion`; uses `TIMESTAMP` not `TIMESTAMP(3)`; no foreign keys |
| `20260714010000_add_user_phone` | Adds `User.phone` | Yes | None |
| `20260714020000_add_report_assessment_scores` | Adds `Report.assessmentScores` JSONB | Yes | None |
| `20260714030000_add_client_profile_bank` | Creates `ClientDocument` and `FinancialRecord` | Mostly | Foreign keys wrapped in `duplicate_object` handlers; assumes `Client` already exists |
| `20260715000000_add_client_corrective_actions` | Adds three columns to `Observation` | Yes | Does not update the Prisma schema; source of F-02 |
| `20260716000000_add_rate_limit_entries` | Creates `RateLimitEntry`, enables RLS, revokes anon/authenticated | Mostly | `CREATE TABLE IF NOT EXISTS` but no conditional FK (none needed) |
| `20260716010000_enforce_supabase_rls_baseline` | Enables RLS and revokes anon/authenticated on existing tables | Yes | Superseded by `20260717010000`; duplicate work; `REVOKE ALL` can break a non-owner app role |
| `20260717000000_add_knowledge_folders` | Creates `KnowledgeFolder`, adds `ClientDocument.folderId`, indexes and FKs | Mostly | Adds a column with `IF NOT EXISTS`; FKs handled conditionally |
| `20260717010000_harden_database_access` | Re-enables RLS on all tables, revokes `PUBLIC`/`anon`/`authenticated`, conditionally adds training FKs | Yes | Does not force RLS; table owner (the likely Prisma role) still bypasses it |

**Conclusion:** the migration history is a set of additive patches, not a schema. `prisma migrate deploy` against an empty database creates only the training/document/folder/rate-limit tables and then fails when a later migration references `Client` or `User`. The history must be rebased on a generated baseline.

### 3.4 Base64 storage map

| Data | Column | Write path | Size cap | Expansion | Read path |
|---|---|---|---|---|---|
| Observation evidence images | `Image.url` | `app/api/upload/route.ts:39–55` | 8 MB (`route.ts:35`) | ~10.7 MB text | Every `GET /api/reports` includes all images (`lib/report-records.ts:347–358`) |
| Job applicant resumes | `JobApplication.resumeUrl` | `app/api/job-applications/route.ts:94–118` | 5 MB (`route.ts:23,78`) | ~6.7 MB text | `GET /api/job-applications` returns every application with `resumeUrl` (`route.ts:29–38`) |
| Knowledge-bank documents | `ClientDocument.url` | `app/api/knowledge-bank/route.ts:103–126` | 3 MB client cap; 4.2 MB schema cap (`lib/validation.ts:62–68`) | ~4 MB text at 3 MB | `GET /api/knowledge-bank` and `GET /api/client-documents` return every document |
| Client logo | `Client.contactInfo` JSON `logoDataUrl` | `app/api/client-profile/route.ts:67–75`; `components/ClientProfilePanel.tsx:41` | 1 MB client cap; 1.4 MB server string cap | ~1.33 MB text | `GET /api/clients` returns `contactInfo` for every client (`lib/client-records.ts:218`) |

No other `toString('base64')` call exists in `app/` or `lib/`. The four paths above are the complete inventory.

### 3.5 Raw SQL and runtime DDL inventory

| Module | Lines | Unsafe calls | What it does | Risk |
|---|---|---|---|---|
| `lib/report-records.ts` | 646 | 10+ `$queryRawUnsafe` / `$executeRawUnsafe` | Introspects `information_schema`, builds SELECT/INSERT/UPDATE/DELETE strings, loads observations and images, filters risk in JS, backfills consultant IDs | SQL injection surface, stale schema cache, unbounded reads, write-on-GET |
| `lib/observation-records.ts` | 240 | 3 | Introspects `Observation`, builds INSERT/UPDATE/DELETE strings | **Direct `sortOrder` injection** at lines 168 and 213 |
| `lib/image-records.ts` | 184 | 1 | Introspects `Image`, inserts a row | Manual escaping; unnecessary |
| `lib/client-records.ts` | 300+ | Several | Introspects `Client`/`User`/`Report`, lists clients, returns `contactInfo` | Manual SQL; base64 logo in list; no pagination |
| `lib/activity-log-records.ts` | 251 | 2 | Introspects `ActivityLog`, lists last 100 | Fixed limit, no cursor |
| `lib/training-records.ts` | 800+ | **31** | Runtime `CREATE TABLE`/`CREATE INDEX`, seeds default content, then all training queries | DDL in request path; production seed on read; race on cold start; 31 unsafe calls |

The `information_schema` queries themselves use `Prisma.sql` tagged templates and are parameterized. The danger is the string-built SQL that follows, plus the fact that the introspected schema is cached in a module-level promise for the lifetime of the process (`report-records.ts:144,287–296`; `observation-records.ts:44,132–141`; `image-records.ts:33,119–128`; `client-records.ts`; `activity-log-records.ts:54,153–162`).

### 3.6 List endpoint inventory

| Endpoint | Current behavior | Main problem |
|---|---|---|
| `GET /api/reports` | All reports + observations + images for the caller; optional `status`, `riskLevel`, `dateFrom`, `dateTo`, `category`; risk filtered in JS | Unbounded; huge JSON; backfill write; JS filter |
| `GET /api/job-applications` | All applications + job opening, including `resumeUrl` data URLs | Unbounded; multi-megabyte response; PII exposure |
| `GET /api/knowledge-bank?clientId=` | All folders + all documents for one client | Unbounded per client; data URLs in response |
| `GET /api/client-documents` | All folders + all documents for the signed-in client | Unbounded; data URLs |
| `GET /api/clients` | All clients + user + report count + `contactInfo` | Unbounded; base64 logos; admin-only but heavy |
| `GET /api/activity-log` | Last 100 rows | Fixed limit; no cursor; no filters |
| `GET /api/admin/training` | All enrollments + users | Unbounded admin table |
| `GET /api/jobs`, `GET /api/training/courses` | Published rows | Small today; should still use the contract for consistency |

Only `listActivityLogRecords` has a hard limit (`lib/activity-log-records.ts:203,231`). No endpoint implements a cursor or a page-size parameter.

### 3.7 Current index inventory (from `prisma/schema.prisma`)

| Table | Existing indexes | Gap |
|---|---|---|
| `User` | `email` unique + `@@index([email])` | Duplicate index |
| `Client` | `userId` unique + `@@index([userId])` | Duplicate; no `createdat` index for list order |
| `ClientDocument` | `(clientId, createdAt desc)`, `folderId` | Add `id` tiebreaker; `(clientId, folderId, createdAt)` for folder views |
| `KnowledgeFolder` | `(clientId, parentId)`, `(clientId, createdAt desc)` | Adequate |
| `FinancialRecord` | `(clientId, createdAt desc)` | Adequate |
| `ContactRequest` | `email`, `status`, `createdAt desc` | Add `(status, createdAt desc, id)` |
| `JobOpening` | `status`, `isPublished`, `sortOrder`, `createdAt desc` | Add `(status, isPublished, sortOrder)` |
| `JobApplication` | `jobOpeningId`, `status`, `createdAt desc` | Add `(status, createdAt desc, id)` and `(jobOpeningId, createdAt desc)` |
| `Report` | `clientId`, `date` | Add `(clientId, date desc, id)`, `(date desc, id)`, `(status, date desc, id)`, partial `consultantId` |
| `Observation` | `reportId` | Add `(reportId, sortOrder, id)` and `(reportId, riskLevel)` |
| `Image` | `observationId` | Add `(observationId, createdAt)`; unique `(storageBucket, storagePath)` |
| `ActivityLog` | `userId`, `createdAt desc` | Add `(createdAt desc, id)` and `(userId, createdAt desc)` |
| `TrainingQuestion` | `(courseId, sortOrder)` | Add `id` tiebreaker |
| `TrainingEnrollment` | `(userId, courseId)` unique + `@@index([userId])` | Duplicate (unique leftmost covers `userId`) |
| `TrainingAttempt` | `(userId, courseId)`, `createdAt desc` | Adequate |

---

## 4. Findings

### F-01 — No baseline migration; the schema is not reproducible

**Severity:** Blocker

**Evidence:**
- `prisma/migrations/` contains nine migrations, all of which are deltas. None creates `User`, `Client`, `Report`, `Observation`, `Image`, `ActivityLog`, `JobOpening`, `JobApplication`, `ContactRequest`, or `VisitorSession`.
- `prisma/migrations/migration_lock.toml` does not exist.
- `20260714030000_add_client_profile_bank` creates `ClientDocument` with a foreign key to `Client`; on an empty database this fails because `Client` does not exist.
- `20260716010000_enforce_supabase_rls_baseline` and `20260717010000_harden_database_access` reference tables that only exist because they were created outside migrations.
- `package.json` has no `migrate deploy` command; `vercel.json` does not run migrations.

**Impact:** A new developer, a preview environment, a disaster-recovery restore into an empty project, or a CI schema check cannot reproduce production. `prisma migrate deploy` either fails or produces a partial schema. Schema changes are applied manually with `db push`, which is exactly how the current drift arose. There is no way to prove that production matches the repository.

**Required change:** Generate a baseline from the corrected Prisma schema, timestamped before the first existing migration (`20260713000000_baseline`), add `migration_lock.toml`, and rebase the existing history on it. Existing databases are reconciled with an expand migration and then have the baseline marked as applied with `prisma migrate resolve --applied`. Fresh databases apply the baseline first. Full SQL and commands are in Section 7.

**Acceptance criteria:**
- `prisma migrate deploy` on an empty PostgreSQL 15+ database creates every table, index, and foreign key in `schema.prisma`.
- `prisma migrate deploy` on a restored production clone is a no-op after the reconcile migration.
- `prisma migrate status` reports “Database schema is up to date”.
- `prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --exit-code` exits 0.
- `migration_lock.toml` is committed and contains `provider = "postgresql"`.

---

### F-02 — Corrective-action fields are on the wrong model; `db push` causes data loss

**Severity:** Blocker

**Evidence:**
- `prisma/migrations/20260715000000_add_client_corrective_actions/migration.sql` adds `clientResponse`, `correctiveAction`, and `correctiveActionStatus` to `"Observation"`.
- `lib/report-records.ts:327–329` selects them from `Observation`; `lib/report-records.ts:389–391` maps them into the API response.
- `lib/observation-records.ts:123–125` introspects them on `Observation`; lines 215–217 read/write them.
- `app/api/observations/[id]/route.ts:27–35` accepts and returns them for clients.
- `prisma/schema.prisma` does **not** declare them on `Observation` (lines 226–243).
- `prisma/schema.prisma` **does** declare them on `TrainingQuestion` (lines 315–317), but `20260714000000_add_training_portal` does not create them and `lib/training-records.ts` does not create them.

**Impact:** `prisma db push` compares the schema to the database and makes the database match the schema. It will:
1. Drop `Observation.clientResponse`, `Observation.correctiveAction`, and `Observation.correctiveActionStatus`, destroying every client response and corrective action.
2. Add the same three empty columns to `TrainingQuestion`.
3. Potentially alter timestamp precision and drop indexes that are not represented in the schema.

This is not theoretical: `db:push` is an exposed npm script (`package.json:12`) and there is no migration workflow to replace it.

**Required change:** Make `Observation` the canonical owner. Add the three fields to `Observation` and remove them from `TrainingQuestion` in `schema.prisma`. The database already has the Observation columns, so the expand migration is idempotent. The TrainingQuestion columns are dropped only in a later contract migration, after confirming they are empty and unreferenced.

Exact model changes are in Section 6. Reconcile SQL is in Section 7.2.

**Acceptance criteria:**
- `prisma/schema.prisma` declares the three fields on `Observation` and not on `TrainingQuestion`.
- `prisma migrate diff` reports no drift for these fields.
- `prisma db push` is removed from `package.json` or guarded by an explicit `ALLOW_DB_PUSH=true` check that refuses `NODE_ENV=production`.
- A staging clone of production retains all non-null `Observation.clientResponse`, `correctiveAction`, and `correctiveActionStatus` values after the migration.
- The contract migration refuses to drop `TrainingQuestion` columns if any of them contain a non-null value.

---

### F-03 — SQL injection through `sortOrder`

**Severity:** Critical

**Evidence:**
- `app/api/observations/route.ts:19–36` reads `sortOrder` from the JSON body and passes it to `createObservationRecord` without Zod validation.
- `app/api/observations/[id]/route.ts:25–49` reads `sortOrder` from the JSON body and passes it to `updateObservationRecord` without Zod validation.
- `lib/observation-records.ts:166–169` builds `values.push(String(input.sortOrder ?? 0))` and interpolates it into the INSERT.
- `lib/observation-records.ts:212–214` builds `updates.push(\`${quoteIdentifier(schema.observation.sortOrder)} = ${input.sortOrder ?? 0}\`)` and interpolates it into the UPDATE.
- All other values in these modules go through `sqlValue()`, which escapes single quotes; `sortOrder` bypasses it entirely.

**Impact:** An authenticated admin can send a string such as `"0, \"title\" = 'compromised' WHERE \"id\" = '<any-id>'"` and alter rows outside the intended observation. A boolean/time-based subquery can exfiltrate data. If the driver uses the simple query protocol for parameterless `$executeRawUnsafe`, stacked statements are also possible. The route is admin-only, but admin accounts are the highest-value target and the seed password is known (F-10), so this is remotely exploitable.

**Required change:**
1. Hotfix: add a Zod schema for observation create/update with `sortOrder: z.coerce.number().int().min(0).max(1_000_000)`, `riskLevel: z.enum([...])`, and bounded strings for every text field. Use `.strict()` for the client-role schema so clients cannot send `title`, `status`, or `sortOrder`.
2. Replace the raw INSERT/UPDATE with `prisma.observation.create()` / `prisma.observation.update()`.
3. If raw SQL must remain temporarily, use `Prisma.sql` with a bound parameter (`${input.sortOrder}`), never string interpolation, and add an explicit integer check.
4. Add a regression test that sends `sortOrder: "0; SELECT pg_sleep(5)"` and asserts a 400 response in well under 5 seconds, plus a test that sends a valid numeric string and asserts it is stored as a number.

Exact schemas and code shape are in Section 9.2.

**Acceptance criteria:**
- No `${...}` interpolation of request-derived values remains in `lib/observation-records.ts`.
- Invalid `sortOrder`, `riskLevel`, and overlong strings return 400 with a stable error code.
- Client-role updates cannot change any field except `clientResponse`, `correctiveAction`, and `correctiveActionStatus`.
- A SQL injection payload cannot alter another row or introduce a delay.

---

### F-04 — Base64 file bytes in Postgres, with limits above the hosting cap

**Severity:** Critical

**Evidence:**
- `app/api/upload/route.ts:35,46`: accepts 8 MB, converts the whole buffer to a data URL, stores it in `Image.url`.
- `app/api/job-applications/route.ts:23,78,101`: accepts 5 MB, converts the whole buffer to a data URL, stores it in `JobApplication.resumeUrl`.
- `app/api/knowledge-bank/route.ts:114–125` stores a client-supplied data URL in `ClientDocument.url`; the client UI caps at 3 MB (`app/admin/admin-knowledge-bank-panel.tsx:80–92`, `app/admin/admin-knowledge-bank-workspace.tsx:28`, `app/admin/admin-knowledge-bank-explorer.tsx:49`), while the Zod schema allows a 4.2 MB string (`lib/validation.ts:62–68`).
- `app/api/client-profile/route.ts:67–75` stores `logoDataUrl` inside `Client.contactInfo`; the client cap is 1 MB (`components/ClientProfilePanel.tsx:41`), the server string cap is 1.4 MB.
- `next.config.js:15` already allows `https://*.supabase.co`, so signed storage URLs need no CSP change.
- `@supabase/supabase-js` is installed but never imported.

**Impact:**
- **Storage amplification:** base64 is ~4/3 of the binary size. 8 MB image → ~10.7 MB text; 5 MB resume → ~6.7 MB; 3 MB document → ~4 MB; 1 MB logo → ~1.33 MB.
- **Postgres cost:** every image update rewrites the full data URL, generating WAL and bloat. Autovacuum, backups, logical replication, and `pg_dump` all carry the bytes. TOAST helps but does not remove the cost.
- **Response cost:** `GET /api/reports` includes every image; a report with ten 8 MB images is ~107 MB of JSON. `GET /api/job-applications` includes every resume. Vercel's ~4.5 MB response limit will fail these requests at the platform edge.
- **Request cost:** Vercel's ~4.5 MB request limit rejects an 8 MB image or 5 MB resume before the route runs. The route's own size checks are unreachable for the largest files.
- **Security:** data URLs in JSON are cached by browsers, proxies, and logs; there is no signed-URL expiry, no per-object authorization, no malware scanning, and no way to revoke a copied URL.
- **Performance:** base64 decoding happens on the main thread; no CDN, range requests, or streaming.

**Required change:** Move all four asset classes to private Supabase Storage buckets. Store only `bucket` + `path` + detected MIME + size + original name in Postgres. Keep the legacy `url`/`contactInfo.logoDataUrl` readable during the transition. Issue short-lived signed upload URLs to the browser so the file never traverses Vercel. Issue short-lived signed read URLs (or 302 redirects) for downloads. Fail closed in production when storage is not configured.

The full design is in Section 8.

**Acceptance criteria:**
- No new row stores a `data:` URL in `Image.url`, `JobApplication.resumeUrl`, `ClientDocument.url`, or `Client.contactInfo.logoDataUrl`.
- An 8 MB image and a 5 MB resume upload successfully through the signed-upload flow without exceeding the Vercel body limit.
- An unauthenticated user cannot read another client's object, even with a guessed path.
- A signed read URL expires and returns 403 after its TTL.
- Deleting a domain row deletes the storage object (or enqueues deletion with a verifiable tombstone).
- Legacy data URLs remain readable until the backfill is verified and the contract migration runs.

---

### F-05 — Admin list endpoints return full files and are unbounded

**Severity:** Critical

**Evidence:**
- `GET /api/job-applications` (`app/api/job-applications/route.ts:25–46`) calls `prisma.jobApplication.findMany({ include: { jobOpening: true } })` with no `take` and returns the full rows, including `resumeUrl`. The admin UI fetches it at `app/admin/admin-jobs.tsx:184`.
- `GET /api/reports` (`app/api/reports/route.ts:44–53`) calls `listReportRecords` with no `take`; `lib/report-records.ts:463` only adds a `LIMIT` if `options.take` is truthy, and the route never passes it. Observations and images are loaded for every report (`lib/report-records.ts:493`).
- `GET /api/clients` (`app/api/clients/route.ts:13–20`) calls `listClientAccounts()`, which selects `contactInfo` for every client (`lib/client-records.ts:211–228`).
- `GET /api/knowledge-bank` and `GET /api/client-documents` return all documents for a client, including `url`.
- No endpoint accepts `limit` or `cursor`.

**Impact:** Response size and memory grow linearly with tenant history. A single client with 50 reports × 10 images can produce hundreds of megabytes. Vercel will reject the response, so the admin UI breaks precisely when the account becomes valuable. The database does the work and the function runs out of memory. Resume and document data URLs also expose PII in browser memory, devtools, and any proxy that logs response bodies.

**Required change:** Cursor pagination on every collection endpoint, a default page size of 25 and a hard maximum of 100, server-side filters, and a response shape that never embeds file bytes. Return file references (`hasResume`, `fileCount`, `url` only when it is a short-lived signed URL) and fetch binaries through dedicated download routes.

The contract is in Section 10; the endpoint mapping is in Section 10.4.

**Acceptance criteria:**
- No list response exceeds 1 MB for a 25-item page under normal data.
- `GET /api/job-applications` never returns `resumeUrl`, `resumeBucket`, or `resumePath`; it returns `hasResume` and `resumeOriginalName`.
- `GET /api/reports` returns at most `limit` reports and does not load images for reports outside the page.
- Traversing all pages yields every row exactly once, with no duplicates or gaps under concurrent inserts (keyset semantics).
- Invalid `limit` or `cursor` returns 400 with a stable error code.

---

### F-06 — Runtime DDL and production seeding inside request handlers

**Severity:** High

**Evidence:**
- `lib/training-records.ts:117–207` defines `createTrainingTables()`, which issues four `CREATE TABLE IF NOT EXISTS` statements and five `CREATE INDEX IF NOT EXISTS` statements through `$executeRawUnsafe`.
- `lib/training-records.ts:209–413` defines `seedDefaultTrainingContent()`, which inserts default courses and questions through `$executeRawUnsafe` if `TrainingCourse` is empty.
- `lib/training-records.ts:415–427` exposes `ensureTrainingTables()`, guarded by a module-level `ensurePromise`.
- `ensureTrainingTables()` is called by `listPublishedTrainingCourses` (line 430), `listAllTrainingCourses` (441), `getTrainingCourseBySlug` (457), `listTrainingQuestions` (567), `ensureTrainingEnrollment` (587), `recordTrainingAttempt` (620), `getTrainingCertificate` (701), `listAdminEnrollments` (733), and others. Any read can trigger DDL and seeding.
- The module contains **31** `$queryRawUnsafe` / `$executeRawUnsafe` call sites.

**Impact:**
- The runtime database role must own the tables or have `CREATE` on the schema. That is incompatible with least privilege and with a read-only analytics role.
- Cold starts in multiple serverless instances can race. `IF NOT EXISTS` reduces duplicate-table errors but does not prevent concurrent seed inserts; two instances can both see `count = 0` and insert duplicate courses.
- A read request can write production content. A typo in the seed changes production data on deploy.
- Migrations cannot be verified because the application silently repairs the schema at runtime. Drift is hidden until a migration fails.
- Every training query pays the cost of the `ensurePromise` check and, on a cold start, the DDL round trips.

**Required change:**
1. Delete `createTrainingTables()` and `seedDefaultTrainingContent()` from `lib/training-records.ts`.
2. Remove every `ensureTrainingTables()` call.
3. Move default content into `prisma/seed-training.ts` (or a section of `prisma/seed.ts`) using `upsert` on `slug`, run explicitly by an operator, never by a request.
4. Replace the remaining 22 training queries with Prisma Client.
5. Grant the runtime role only `SELECT`, `INSERT`, `UPDATE`, `DELETE` on application tables (Section 12.4).

**Acceptance criteria:**
- `lib/training-records.ts` contains zero `CREATE`, `ALTER`, or `DROP` statements.
- No request handler calls a function that can mutate schema.
- `prisma/seed-training.ts` is idempotent and can run twice without duplicates.
- A fresh database provisioned only by `prisma migrate deploy` serves training pages without triggering DDL.
- The runtime role cannot create a table (verified with `CREATE TABLE` denied).

---

### F-07 — Unbounded lists and JavaScript-side `riskLevel` filtering

**Severity:** High

**Evidence:**
- `lib/report-records.ts:438–508`: `listReportRecords` builds the query, optionally appends `LIMIT` only when `options.take` is set (line 463), loads observations for every returned report (line 493), then filters by risk in JS (lines 496–507).
- `app/api/reports/route.ts:44–51` never passes `take`, so the limit clause is always empty.
- `app/api/job-applications/route.ts:29–36` uses `findMany` with no `take`.
- `app/api/clients/route.ts:16` calls `listClientAccounts()` with no pagination.
- `app/api/knowledge-bank/route.ts:46–53` and `app/api/client-documents/route.ts:51–58` load every folder and document for a client.
- `app/api/admin/training/route.ts` lists all enrollments through `listAdminEnrollments`.

**Impact:** Query time and memory grow linearly. The risk filter cannot use an index because it runs after the rows are fetched. A client with a long history can make the admin dashboard unusable. The API has no way to ask for “the next page”, so the UI must load everything or implement client-side slicing, which does not reduce the payload.

**Required change:** Keyset pagination on all collection endpoints, server-side filters, and `EXISTS` for observation-based filters. The exact contract is in Section 10; the Prisma query shape is in Section 9.1.

**Acceptance criteria:**
- Every list endpoint accepts `limit` and `cursor` and returns `items` + `pageInfo`.
- `riskLevel` filtering is part of the SQL `WHERE` clause and uses the `(reportId, riskLevel)` index.
- A 100,000-report dataset returns the first page in under 200 ms at p95 on staging.
- The UI never requests more than 100 rows per call.

---

### F-08 — `GET /api/reports` mutates data on every admin request

**Severity:** High

**Evidence:**
- `app/api/reports/route.ts:38–40`: `else if (session.user.role === 'ADMIN') { await backfillMissingReportConsultantIds(session.user.id) }`.
- `lib/report-records.ts:510–523`: the function runs an `UPDATE` over every report where `consultantId IS NULL` or is an empty string.

**Impact:**
- A read endpoint performs a full-table write. Every admin page load generates WAL, takes row locks, and can block concurrent report updates.
- It silently assigns unassigned reports to whichever admin loaded the page first, corrupting attribution and audit history.
- It makes GET non-idempotent and non-cacheable; retries and prefetches have side effects.
- It runs before the list query, so it adds latency to every request even when there is nothing to backfill.

**Required change:** Remove the call from the route. Create a one-time, explicit script `scripts/backfill-report-consultants.ts` with `--dry-run`, `--consultant-id`, `--batch-size`, and a summary of affected rows. Require an operator to run it once, with the intended consultant ID, after reviewing the affected rows.

**Acceptance criteria:**
- `GET /api/reports` performs no writes (verified by `pg_stat_statements` or a trigger-based audit in staging).
- The one-time script reports the exact row count before and after and is idempotent.
- New reports always set `consultantId` explicitly (the POST route already defaults to the session user at lines 71–74, 87).
- No report is reassigned to an admin who did not create it.

---

### F-09 — Schema introspection is cached forever and silently degrades

**Severity:** High

**Evidence:**
- `lib/report-records.ts:144` declares `let schemaInfoPromise`; lines 287–296 cache the promise for the process lifetime.
- `lib/observation-records.ts:44,132–141`, `lib/image-records.ts:33,119–128`, `lib/activity-log-records.ts:54,153–162`, and `lib/client-records.ts` use the same pattern.
- Missing optional columns resolve to `null`; `selectExpr` then emits `NULL::text AS "alias"` (`report-records.ts:166–170`).
- `loadObservations` catches every error and returns an empty map (`report-records.ts:398–401`), so a missing `Observation` column makes reports appear to have no observations rather than failing loudly.
- The introspection queries normalize table and column names (`normalizeIdentifier`), which masks the physical naming inconsistency described in F-13.

**Impact:** After a migration adds a column, a running instance keeps using the old schema until it is recycled. Corrective actions can disappear from the UI for hours. A missing required column throws a generic 500; a missing optional column silently returns nulls. The code cannot be type-checked against the schema, and every module reimplements the same fragile resolver.

**Required change:** Delete the introspection layer. Use Prisma Client models, which are generated from `schema.prisma` and fail at build time if a field is wrong. Add a startup health check (`/api/health/db`) that runs `SELECT 1`, checks the expected migration count, and verifies a small set of required columns; alert if it fails. Do not silently degrade.

**Acceptance criteria:**
- No `information_schema` query remains in `lib/`.
- A missing column causes a build error or a failed health check, not an empty list.
- Deploying a migration does not require a separate “restart to refresh schema” step.
- The health endpoint returns 503 when the schema fingerprint does not match the expected migration.

---

### F-10 — Hard-coded and invalid seed credentials

**Severity:** High

**Evidence:**
- `prisma/seed.ts:7`: `ADMIN_HASH` is a valid bcrypt hash for `admin123` (verified with `bcrypt.compare`).
- `prisma/seed.ts:9`: `CLIENT_HASH` is a 61-character string. A bcrypt hash is 60 characters, so this is not a valid hash and `client123` cannot authenticate.
- `prisma/seed.ts:221–223` prints all demo credentials, including the admin password, to the console.
- The admin account uses `admin@qhsseconsultant.com`; the demo clients use `ahmed@petrocorp.com` and `sarah@foodtech.com`.

**Impact:** Anyone with the repository knows the admin password if the seed has ever run against production. The client demo accounts are broken, which undermines demos and support. If the admin hash is reused across environments, one leak compromises all of them. Combined with F-03, a known admin credential makes the SQL injection remotely exploitable.

**Required change:**
1. Rotate the admin password immediately in every environment where the seed ran.
2. Remove both hard-coded hashes. Read `SEED_ADMIN_PASSWORD` and `SEED_DEMO_PASSWORD` from the environment; throw if they are missing when seeding.
3. Hash at runtime with `bcrypt.hash(password, 12)`.
4. Only create demo clients when `SEED_DEMO_DATA=true` and `NODE_ENV !== 'production'`.
5. Never print passwords. Print the email and a one-time “password set from environment” notice.
6. Add `mustChangePassword` only if the product needs it; otherwise document the rotation procedure.

**Acceptance criteria:**
- `prisma/seed.ts` contains no bcrypt hash literals and no plaintext password.
- Running the seed without `SEED_ADMIN_PASSWORD` fails before writing.
- The seed is idempotent (upsert by email) and can be run twice.
- A login test with the rotated admin password succeeds; the old password fails.
- The demo client password works when demo data is enabled.

---

### F-11 — Raw database errors returned to clients

**Severity:** Medium

**Evidence:**
- `app/api/reports/route.ts:54–56` returns `{ error: error.message }` with status 500.
- `app/api/observations/[id]/route.ts:72–73` and `:96–97` do the same.
- `app/api/job-applications/route.ts:43–44` returns `error.message` with 403/500.
- `app/api/clients/route.ts:18–19` and `:81–82` do the same.
- Several routes return `error.message` for validation and authorization errors as well, so the distinction is lost.

**Impact:** PostgreSQL and Prisma errors can reveal table names, column names, constraint names, query fragments, and connection details. This helps an attacker refine injection and enumeration. It also leaks implementation details to ordinary users and makes error handling inconsistent.

**Required change:** Introduce `lib/api-error.ts` with a typed `ApiError` (status, code, safe message, details) and a `jsonError(error, correlationId)` helper. Return a stable envelope `{ error: { code, message, correlationId } }`. Log the full error server-side with the correlation ID. Map known cases: `P2002` → 409 `CONFLICT`, `P2025` → 404 `NOT_FOUND`, Zod → 400 `VALIDATION_ERROR`, unknown → 500 `INTERNAL_ERROR`.

**Acceptance criteria:**
- No route returns `error.message` for an unknown error.
- Every error response includes a correlation ID that matches the server log.
- A forced database error returns `{ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred", correlationId } }`.
- Validation errors still include field-level details.

---

### F-12 — Missing and duplicate indexes

**Severity:** Medium

**Evidence:** Section 3.7 and `prisma/schema.prisma` lines 27, 47, 65–66, 101, 116–118, 145–148, 167–169, 187–188, 199, 221–222, 241, 256, 271–272, 295, 320, 340–341, 356–357.

**Impact:** The list queries order by `date`, `createdAt`, or `sortOrder` and filter by `status`, `riskLevel`, `clientId`, and `folderId`. Single-column indexes force bitmap heap scans and sorts. Duplicate indexes waste write throughput and cache. As data grows, p95 latency degrades before the row count looks large.

**Required change:** Add the composite and partial indexes in Section 11, remove the redundant indexes listed there, and verify with `EXPLAIN (ANALYZE, BUFFERS)` on staging. Build large indexes with `CONCURRENTLY` outside a transaction, or during a maintenance window.

**Acceptance criteria:**
- Every list query uses an index scan or index-only scan for its `ORDER BY` and filter.
- `pg_stat_user_indexes.idx_scan` shows the new indexes being used within a week.
- No duplicate index remains on `User.email`, `Client.userId`, or `TrainingEnrollment.userId`.
- Index build does not block writes for more than a few seconds in production.

---

### F-13 — Inconsistent physical naming and timestamp precision

**Severity:** Medium

**Evidence:**
- Physical columns are mixed: `createdat`/`updatedat` on `User`, `Client`, `Report`, `Observation`, `Image`, `ActivityLog`, `JobOpening`, `JobApplication`, `ContactRequest`, `ClientDocument`, `KnowledgeFolder`, `FinancialRecord`; `createdAt`/`updatedAt` on `TrainingCourse`, `TrainingEnrollment`, `TrainingAttempt`, `RateLimitEntry`.
- `VisitorSession` uses `visitorkey`, `countrycode`, `firstseenat`, `lastseenat`.
- The training migration uses `TIMESTAMP` (6-digit precision); Prisma's default is `timestamp(3)`.
- The raw SQL layer works around this with `normalizeIdentifier()` and candidate lists (`report-records.ts:162–164,236–283`).

**Impact:** Every raw query needs a resolver, which is where the missing-column and stale-cache bugs live. `prisma migrate diff` will report timestamp drift. New developers cannot predict column names. Renaming columns in place would be a high-risk migration.

**Required change:** Do **not** rename existing columns in this remediation; the downtime and FK/index churn are not justified. Instead:
1. Document the mapping in one place (this section and a `docs/database/naming.md` if desired).
2. Keep `@map` annotations for legacy columns.
3. Use camelCase for all new columns (`storageBucket`, `storagePath`, `resumeBucket`, `resumePath`, `logoBucket`, `logoPath`).
4. Align training timestamp precision to `timestamp(3)` in the contract phase, with `ALTER TABLE ... ALTER COLUMN ... TYPE TIMESTAMP(3) USING ...`.
5. Remove the introspection layer so the mapping is compiled, not discovered at runtime.

**Acceptance criteria:**
- New columns follow one convention.
- `prisma migrate diff` reports no timestamp-precision drift.
- No runtime code queries `information_schema` to discover column names.
- The mapping table is included in the repository documentation.

---

### F-14 — RLS is enabled but does not isolate the application

**Severity:** Medium

**Evidence:**
- `20260716010000_enforce_supabase_rls_baseline` and `20260717010000_harden_database_access` enable RLS on every table and revoke `ALL` from `PUBLIC`, `anon`, and `authenticated`.
- No `CREATE POLICY` statements exist.
- Prisma connects with `DATABASE_URL`, which is a PostgreSQL role. In Supabase, the default connection string uses the `postgres` role, which owns the tables in `public`. Table owners bypass RLS unless `FORCE ROW LEVEL SECURITY` is set.
- The application performs tenant scoping in route code (for example, `app/api/reports/route.ts:33–37` derives `clientId` from the session and passes it to `listReportRecords`).

**Impact:** RLS protects the Supabase anon/authenticated APIs, which the app does not use. It does **not** protect against a bug in a Prisma query that forgets a `clientId` filter. Teams often read “RLS enabled” as “tenant isolation is enforced”, which is false here. Conversely, `REVOKE ALL ... FROM PUBLIC` can break a non-owner application role that relied on default grants.

**Required change (choose one):**
- **Minimum:** Document explicitly that RLS is for Supabase client access only; tenant isolation is enforced by route authorization and must be covered by tests. Keep the revokes.
- **Stronger:** Create a dedicated `qhsse_app` role with table DML but no DDL, no `BYPASSRLS`, and no ownership. Add `FORCE ROW LEVEL SECURITY` plus policies that read `current_setting('app.client_id', true)`; wrap tenant-scoped Prisma queries in a transaction that runs `SET LOCAL app.client_id = ...`. This is a larger change and should follow the storage/pagination work.

**Acceptance criteria:**
- The team can state which role connects at runtime and whether it owns the tables.
- A test proves that a client cannot read another client's reports through the API.
- If policies are added, a test connects as `qhsse_app` and confirms that a query without `SET LOCAL app.client_id` returns zero rows.
- `REVOKE` changes are tested against the runtime role before production.

---

### F-15 — No migration deploy step; `db:push` is the default path

**Severity:** High

**Evidence:**
- `package.json:5–14`: `db:push` exists; `db:migrate`, `migrate deploy`, and `migrate status` do not.
- `package.json:8`: the build runs `prisma generate && next build`, not migrations.
- `vercel.json:1–7`: the build command is `npm run build`; there is no release step.
- The README/ops documentation is absent from the repository.

**Impact:** Schema changes are applied manually, usually with `db push`. That is the mechanism that created the split-brain in F-02. There is no record of which migration is applied in which environment, no rollback procedure, and no way to gate a deploy on schema compatibility. Preview deployments can run against a schema that does not match their code.

**Required change:**
1. Add scripts: `db:migrate:deploy` (`prisma migrate deploy`), `db:migrate:status`, `db:migrate:diff`, `db:seed:training`.
2. Run `prisma migrate deploy` as a separate release job against `DIRECT_URL`, before the application deploy. Do not run it in the Vercel build (builds can run multiple times and in parallel).
3. Remove `db:push` or guard it with an explicit non-production check.
4. Add a CI job that runs `prisma validate`, `prisma migrate diff --exit-code`, and `prisma migrate deploy` against an ephemeral PostgreSQL service.
5. Document the rollback procedure: restore the snapshot or deploy the previous app version; never edit an applied migration.

**Acceptance criteria:**
- A production release fails if `prisma migrate deploy` fails, and the app is not deployed.
- `npm run db:push` refuses to run when `NODE_ENV=production` or `VERCEL_ENV=production`.
- CI catches schema drift on every pull request.
- The runbook is linked from the repository root.

---

### F-16 — Storage configuration is incomplete; the Supabase SDK is unused

**Severity:** High (part of F-04)

**Evidence:**
- `.env.production.example:10–12` documents `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, but no `SUPABASE_SERVICE_ROLE_KEY` and no bucket names.
- `@supabase/supabase-js` is a dependency (`package.json:18`) but no file imports it.
- `next.config.js:15` already allows `https://*.supabase.co` in `connect-src` and `img-src`.
- Uploads are base64 data URLs (F-04).

**Impact:** There is no server-side storage client, no bucket policy, no signed-URL flow, and no way to validate that production has storage configured. If someone adds a client that reads the service-role key from a `NEXT_PUBLIC_` variable, the key leaks to the browser.

**Required change:** Add server-only variables `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET_IMAGES`, `SUPABASE_STORAGE_BUCKET_DOCUMENTS`, `SUPABASE_STORAGE_BUCKET_RESUMES`, `SUPABASE_STORAGE_BUCKET_LOGOS`, and `STORAGE_DRIVER=supabase|disabled`. Keep `NEXT_PUBLIC_SUPABASE_URL` and the anon key only for the browser's signed-upload client. Never prefix the service-role key with `NEXT_PUBLIC_`. Add a startup check that fails closed in production when the storage variables are missing.

**Acceptance criteria:**
- The service-role key is present only in server runtime environment variables.
- A repository search for `SERVICE_ROLE` finds no `NEXT_PUBLIC_` prefix.
- `GET /api/health/storage` returns 200 when configured and 503 when not.
- Upload routes return 503 `STORAGE_NOT_CONFIGURED` in production when the driver is disabled, rather than falling back to base64.

---

### F-17 — No database or storage observability

**Severity:** Medium

**Evidence:**
- No `pg_stat_statements` setup, slow-query threshold, Prisma query logging, or health endpoint.
- The routes log errors with `console.error` but do not include correlation IDs, durations, or query names.
- There is no SLO for API latency, database latency, upload success, or storage 404 rate.

**Impact:** The team cannot see the slow queries that pagination and indexes are meant to fix. A storage misconfiguration or a spike in signed-URL failures is invisible until users report broken images. Capacity planning is guesswork.

**Required change:** Enable `pg_stat_statements`, set `log_min_duration_statement = 200ms` for the application database, add structured request logs with `route`, `status`, `durationMs`, `dbDurationMs`, and `correlationId`, and add `/api/health/db` and `/api/health/storage`. Define SLOs: list p95 < 300 ms, DB p95 < 100 ms, upload success > 99%, storage 404 < 0.1%.

**Acceptance criteria:**
- The top 20 queries by total time are visible in `pg_stat_statements`.
- Every API log line includes a correlation ID and duration.
- The health endpoints are wired to the uptime monitor.
- A dashboard shows p50/p95/p99 latency and error rate per route.

---

### F-18 — Document validation is shallow and malware is not addressed

**Severity:** Medium

**Evidence:**
- `lib/file-validation.ts:3–7` allows `.pdf`, `.doc`, `.docx` for resumes and checks only the first bytes. `.docx` is a ZIP; the `PK\x03\x04` check does not prove it is a Word document.
- `lib/validation.ts:49–57` allows PDF, DOC, DOCX, XLSX, JPEG, PNG, WEBP for knowledge-bank documents, but the API accepts a client-supplied `url` and `mimeType`; it does not validate the bytes (`app/api/knowledge-bank/route.ts:103–126`).
- There is no virus scan, no `Content-Disposition` policy, and no SVG allowance (good), but the stored MIME type is client-controlled for documents.
- `lib/file-validation.ts` has no pixel-dimension or decompression-bomb check for images.

**Impact:** A malicious file can be stored and later served to an admin or client. ZIP-based formats can be polyglots. A client-controlled MIME type can cause a browser to render content unexpectedly. Large images can exhaust memory during processing.

**Required change:**
1. Validate bytes server-side after upload (magic bytes for PDF/DOC/DOCX/XLSX; use `file-type` or a small signature table; reject mismatch).
2. Store the server-detected MIME type, not the client value.
3. Serve documents and resumes with `Content-Disposition: attachment`; serve images inline only for JPEG/PNG/WEBP.
4. Disallow SVG and HTML.
5. Add an asynchronous malware scan (ClamAV sidecar, a Supabase Edge Function, or a queue worker) and quarantine infected objects.
6. Add image dimension limits (for example, 12,000 × 12,000) before generating thumbnails.

**Acceptance criteria:**
- A `.docx` file renamed to `.pdf` is rejected.
- A PDF with an embedded HTML payload is served as an attachment, not rendered.
- The stored `mimeType` equals the detected type.
- An infected test file is quarantined and never served.

---

## 5. Target architecture

### 5.1 Principles

1. **The Prisma schema is the single source of truth.** Every table, column, index, and foreign key is declared there and reached through a migration.
2. **Migrations are forward-only and reproducible.** Baseline + expand/contract. No `db push` in shared environments. No runtime DDL.
3. **The runtime role is least-privileged.** DML only; migrations run as the owner through `DIRECT_URL`.
4. **Files live in object storage, not in Postgres.** Postgres stores metadata and a path. Signed URLs gate access.
5. **Lists are paginated and filtered in SQL.** No endpoint returns an unbounded collection; no filter runs in JavaScript after fetch.
6. **Reads do not write.** Backfills and repairs are explicit scripts.
7. **Fail closed.** Missing storage or schema configuration returns 503, not a silent fallback to base64 or an empty list.
8. **Every external call has a timeout, a retry policy, and an idempotency key.** This applies to storage uploads, signed URL creation, and email notifications triggered by uploads.

### 5.2 Schema ownership and runtime access

```
┌─────────────────────────────┐
│ prisma/schema.prisma        │  source of truth
└──────────────┬──────────────┘
               │ prisma migrate dev / diff
               ▼
┌─────────────────────────────┐
│ prisma/migrations/          │  baseline + expand + contract
└──────────────┬──────────────┘
               │ prisma migrate deploy (DIRECT_URL, owner role)
               ▼
┌─────────────────────────────┐
│ PostgreSQL / Supabase       │
│  tables + indexes + RLS     │
└──────────────┬──────────────┘
               │ DATABASE_URL (qhsse_app, DML only, pooled)
               ▼
┌─────────────────────────────┐
│ Prisma Client in Next.js    │
│  typed queries, no DDL      │
└─────────────────────────────┘
```

### 5.3 Migration workflow

| Environment | Command | Role | Notes |
|---|---|---|---|
| Local | `prisma migrate dev` | local owner | Creates migrations from schema changes |
| CI | `prisma migrate diff --exit-code` + `prisma migrate deploy` on ephemeral DB | ephemeral owner | Catches drift and proves the history applies |
| Staging | `prisma migrate deploy` | staging owner (`DIRECT_URL`) | Run before the app deploy; smoke test |
| Production | `prisma migrate deploy` in a release job | production owner (`DIRECT_URL`) | Never in the Vercel build; snapshot first |
| Runtime | Prisma Client queries | `qhsse_app` (`DATABASE_URL`) | No DDL; pooled through PgBouncer |

### 5.4 Storage architecture

```
Browser
  │ 1. POST /api/uploads/intent  (auth, Zod, ownership, quota)
  ▼
Next.js route ──► UploadIntent row (PENDING, expiresAt)
  │ 2. returns { signedUrl, token, path, expiresAt }
  ▼
Browser ──► Supabase Storage (private bucket, direct PUT)
  │ 3. POST /api/uploads/complete { intentId }
  ▼
Next.js route ──► verify object (size, MIME, magic bytes)
  │ 4. creates Image / ClientDocument / JobApplication / Client logo row
  ▼
Postgres stores bucket + path + metadata only
  │ 5. GET list returns short-lived signed read URLs (or a download route)
  ▼
Browser ──► Supabase CDN
```

### 5.5 Query layer

- Prisma Client for all CRUD.
- `Prisma.sql` tagged templates for the few queries that need set-based operations (bulk backfill, `EXISTS` filters if Prisma cannot express them cleanly).
- No `$queryRawUnsafe` / `$executeRawUnsafe`.
- No `information_schema` at runtime.
- Shared selectors and mappers in `lib/db/` so the API shape is consistent across routes.
- Every query has a `take` and a deterministic `orderBy` that includes `id`.

### 5.6 Pagination

- Keyset (cursor) pagination for all time-ordered collections.
- Default `limit=25`, maximum `100`.
- Cursor is opaque, base64url-encoded JSON with a version, the sort key, the id, and a filter hash. The server rejects a cursor whose filter hash does not match the current request.
- Response envelope: `{ items, pageInfo: { nextCursor, hasMore, limit } }`.
- No offset pagination. Admin tables that need page numbers keep a cursor stack in the client or use a capped offset endpoint with `maxOffset=10000`.
- `withTotal=1` is allowed only on admin endpoints that need a count, and it runs at most one `count()` with the same filters.

### 5.7 Observability

| Signal | Tool | Alert |
|---|---|---|
| API p95/p99 latency | Structured logs + dashboard | p95 > 300 ms for 10 min |
| DB query time | `pg_stat_statements`, `log_min_duration_statement=200ms` | p95 > 100 ms |
| Slow queries | `pg_stat_statements` top 20 by total time | New query > 1 s |
| Upload success | Route counters | < 99% over 15 min |
| Signed URL failures | Storage route counters | 404/403 > 0.1% |
| Migration status | `/api/health/db` | Any pending/failed migration |
| Storage config | `/api/health/storage` | 503 in production |
| Table/index bloat | `pg_stat_user_tables`, `pgstattuple` (optional) | Bloat > 30% |

---

## 6. Exact Prisma schema changes

The changes below are the complete schema delta for this remediation. Apply them to `prisma/schema.prisma` before generating the baseline.

### 6.1 `Observation`: canonical corrective-action fields

```prisma
model Observation {
  id                     String   @id @default(uuid())
  reportId               String
  report                 Report   @relation(fields: [reportId], references: [id], onDelete: Cascade)
  title                  String
  titleAr                String?
  description            String?
  descriptionAr          String?
  riskLevel              String
  status                 String   @default("OPEN")
  sortOrder              Int      @default(0)
  clientResponse         String?
  correctiveAction       String?
  correctiveActionStatus String?
  createdAt              DateTime @default(now()) @map("createdat")
  updatedAt              DateTime @default(now()) @updatedAt @map("updatedat")
  images                 Image[]

  @@index([reportId, sortOrder, id])
  @@index([reportId, riskLevel])
  @@map("Observation")
}
```

Notes:
- The physical columns already exist with these exact camelCase names (migration `20260715000000`). No rename is needed.
- The old `@@index([reportId])` is removed because `(reportId, sortOrder, id)` covers `reportId` as its leftmost column.
- `clientResponse` and `correctiveAction` are free text. Add application-level limits in Zod (`max 10_000`); do not add a database `VARCHAR` limit, because the current columns are `TEXT` and a type change would rewrite the table.

### 6.2 `TrainingQuestion`: remove the misplaced fields

```diff
 model TrainingQuestion {
   id            String         @id @default(uuid())
   courseId      String
   course        TrainingCourse @relation(fields: [courseId], references: [id], onDelete: Cascade)
   question      String
   questionAr    String?
   optionA       String
   optionAAr     String?
   optionB       String
   optionBAr     String?
   optionC       String
   optionCAr     String?
   optionD       String
   optionDAr     String?
   correctOption String
   sortOrder     Int            @default(0)
-  clientResponse String?
-  correctiveAction String?
-  correctiveActionStatus String?
   createdAt     DateTime       @default(now())

-  @@index([courseId, sortOrder])
+  @@index([courseId, sortOrder, id])
   @@map("TrainingQuestion")
 }
```

If a non-production database already has these columns because `db push` ran, they are dropped by the gated contract migration in Section 7.4, not by this schema change.

### 6.3 Storage metadata columns

#### `Image`

```prisma
model Image {
  id             String      @id @default(uuid())
  observationId  String
  observation    Observation @relation(fields: [observationId], references: [id], onDelete: Cascade)
  type           String
  url            String      // canonical `supabase://bucket/path`; legacy data URL during transition
  storageBucket  String?
  storagePath    String?
  originalName   String?
  mimeType       String?
  size           Int?
  createdAt      DateTime    @default(now()) @map("createdat")

  @@unique([storageBucket, storagePath])
  @@index([observationId, createdAt])
  @@map("Image")
}
```

`url` stays `NOT NULL`. New rows store a stable canonical URI (`supabase://observation-evidence/<path>`), not a signed URL and not a data URL. This keeps the column useful for exports and avoids a nullable-column migration. Legacy rows keep `data:` values until the backfill replaces them.

#### `ClientDocument`

```prisma
model ClientDocument {
  id            String          @id @default(uuid())
  clientId      String
  client        Client          @relation(fields: [clientId], references: [id], onDelete: Cascade)
  folderId      String?
  folder        KnowledgeFolder? @relation(fields: [folderId], references: [id], onDelete: SetNull)
  title         String
  category      String          @default("SYSTEM")
  url           String          // canonical `supabase://bucket/path`; legacy data URL during transition
  storageBucket String?
  storagePath   String?
  originalName  String?
  mimeType      String?
  size          Int?
  createdAt     DateTime        @default(now()) @map("createdat")

  @@unique([storageBucket, storagePath])
  @@index([clientId, createdAt(sort: Desc), id(sort: Desc)])
  @@index([clientId, folderId, createdAt(sort: Desc)])
  @@index([folderId])
  @@map("ClientDocument")
}
```

#### `JobApplication`

```prisma
model JobApplication {
  id                 String     @id @default(uuid())
  jobOpeningId       String
  jobOpening         JobOpening @relation(fields: [jobOpeningId], references: [id], onDelete: Cascade)
  name               String
  email              String
  phone              String?
  company            String?
  resumeUrl          String?    // canonical `supabase://bucket/path`; legacy data URL during transition
  resumeBucket       String?
  resumePath         String?
  resumeOriginalName String?
  resumeMimeType     String?
  resumeSize         Int?
  coverLetter        String?
  status             String     @default("NEW")
  createdAt          DateTime   @default(now()) @map("createdat")
  updatedAt          DateTime   @default(now()) @updatedAt @map("updatedat")

  @@unique([resumeBucket, resumePath])
  @@index([status, createdAt(sort: Desc), id(sort: Desc)])
  @@index([jobOpeningId, createdAt(sort: Desc)])
  @@index([createdAt(sort: Desc), id(sort: Desc)])
  @@map("JobApplication")
}
```

The old single-column indexes `jobOpeningId`, `status`, and `createdAt` are removed because the composites cover them. The `jobOpeningId` composite covers the foreign-key cascade lookup.

#### `Client`

```prisma
model Client {
  id            String   @id @default(uuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  companyName   String
  companyNameAr String?
  contactInfo   String?  // JSON settings; legacy logoDataUrl may remain during transition
  logoBucket    String?
  logoPath      String?
  logoMimeType  String?
  phone         String?
  address       String?
  createdAt     DateTime @default(now()) @map("createdat")
  updatedAt     DateTime @default(now()) @updatedAt @map("updatedat")
  reports       Report[]
  documents     ClientDocument[]
  knowledgeFolders KnowledgeFolder[]
  financialRecords FinancialRecord[]

  @@unique([logoBucket, logoPath])
  @@index([createdAt(sort: Desc), id(sort: Desc)])
  @@map("Client")
}
```

Remove `@@index([userId])`; the `@unique` constraint already creates an index with `userId` as its leftmost column.

#### `User`

```diff
 model User {
   ...
-  @@index([email])
   @@map("User")
 }
```

The `@unique` on `email` already creates `User_email_key`. The duplicate `User_email_idx` is dropped in the contract migration.

### 6.4 `UploadIntent`: idempotent, auditable upload tracking

```prisma
model UploadIntent {
  id                String   @id @default(uuid())
  userId            String?  // null for public job-application resumes
  user              User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  ownerKey          String?  // non-PII hash used for public rate limiting and cleanup
  kind              String   // OBSERVATION_IMAGE | CLIENT_DOCUMENT | RESUME | CLIENT_LOGO
  bucket            String
  path              String
  originalName      String?
  mimeType          String
  expectedSize      Int
  metadata          Json?    // kind-specific IDs validated at intent creation
  resultId          String?  // domain row created on completion, for idempotent retries
  status            String   @default("PENDING") // PENDING | COMPLETED | EXPIRED | FAILED
  completeTokenHash String   // SHA-256 of a 32-byte token returned once to the client
  expiresAt         DateTime
  completedAt       DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @default(now()) @updatedAt

  @@unique([bucket, path])
  @@index([userId, status])
  @@index([status, expiresAt])
  @@index([resultId])
  @@map("UploadIntent")
}
```

Add the inverse relation to `User`:

```diff
 model User {
   ...
   trainingAttempts TrainingAttempt[]
+  uploadIntents    UploadIntent[]
   ...
 }
```

Why a separate table:
- The storage object can exist before the domain row (upload succeeds, browser closes). The intent tracks the orphan.
- `(bucket, path)` is unique, so a retried “complete” request cannot create two domain rows.
- `expiresAt` + `status` lets a cleanup job delete abandoned objects without scanning the bucket.
- `userId` gives an audit trail and authorization check independent of the domain row.

### 6.5 Index changes in the schema

Apply these to the existing models. Remove the indexes that are explicitly superseded.

| Model | Add | Remove |
|---|---|---|
| `Report` | `@@index([clientId, date(sort: Desc), id(sort: Desc)])`, `@@index([date(sort: Desc), id(sort: Desc)])`, `@@index([status, date(sort: Desc), id(sort: Desc)])`, `@@index([consultantId])` | `@@index([clientId])`, `@@index([date])` |
| `Observation` | `@@index([reportId, sortOrder, id])`, `@@index([reportId, riskLevel])` | `@@index([reportId])` |
| `Image` | `@@index([observationId, createdAt])`, `@@unique([storageBucket, storagePath])` | `@@index([observationId])` |
| `ClientDocument` | `@@index([clientId, createdAt(sort: Desc), id(sort: Desc)])`, `@@index([clientId, folderId, createdAt(sort: Desc)])`, `@@unique([storageBucket, storagePath])` | `@@index([clientId, createdAt(sort: Desc)])` |
| `Client` | `@@index([createdAt(sort: Desc), id(sort: Desc)])`, `@@unique([logoBucket, logoPath])` | `@@index([userId])` |
| `User` | none | `@@index([email])` |
| `ActivityLog` | `@@index([createdAt(sort: Desc), id(sort: Desc)])`, `@@index([userId, createdAt(sort: Desc)])` | `@@index([userId])`, `@@index([createdAt(sort: Desc)])` |
| `JobApplication` | `@@index([status, createdAt(sort: Desc), id(sort: Desc)])`, `@@index([jobOpeningId, createdAt(sort: Desc)])`, `@@index([createdAt(sort: Desc), id(sort: Desc)])`, `@@unique([resumeBucket, resumePath])` | `@@index([jobOpeningId])`, `@@index([status])`, `@@index([createdAt(sort: Desc)])` |
| `ContactRequest` | `@@index([status, createdAt(sort: Desc), id(sort: Desc)])` | `@@index([status])`, `@@index([createdAt(sort: Desc)])` |
| `JobOpening` | `@@index([status, isPublished, sortOrder])`, `@@index([isPublished, sortOrder])`, `@@index([createdAt(sort: Desc), id(sort: Desc)])` | `@@index([status])`, `@@index([isPublished])`, `@@index([sortOrder])`, `@@index([createdAt(sort: Desc)])` |
| `TrainingQuestion` | `@@index([courseId, sortOrder, id])` | `@@index([courseId, sortOrder])` |
| `TrainingEnrollment` | `@@index([courseId, createdAt(sort: Desc)])` | `@@index([userId])` (covered by the unique) |
| `UploadIntent` | see 6.4 | n/a |

Prisma 5.22 does not support partial indexes in the schema. Do not create a partial `consultantId` index manually while declaring a full `@@index([consultantId])`; the diff will report drift. Use the full index and, if needed, drop it later when the query is proven not to need it.

---

## 7. Migrations

### 7.1 Baseline migration

**Directory:** `prisma/migrations/20260713000000_baseline/`

The timestamp is deliberately earlier than `20260714000000` so the baseline sorts first. Generate it from the **corrected** schema, not by hand:

```bash
mkdir -p prisma/migrations/20260713000000_baseline
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  > prisma/migrations/20260713000000_baseline/migration.sql
```

The generated file will contain:
- `CREATE TABLE` for every model, including the core tables that no existing migration creates.
- `CREATE UNIQUE INDEX` for every `@unique` and `@@unique`.
- `CREATE INDEX` for every `@@index`.
- `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` for every relation.
- The corrected `Observation` columns, no `TrainingQuestion` corrective columns, the storage metadata columns, and `UploadIntent`.

**Do not edit the generated SQL** except to review it. The checksum is recorded in `_prisma_migrations`; editing an applied migration causes `P3018`/checksum warnings and makes the history non-reproducible.

**`prisma/migrations/migration_lock.toml`:**

```toml
# Please do not edit this file manually
# It should be added in your version-control system (e.g., Git)
provider = "postgresql"
```

**Critical:** the generated baseline uses plain `CREATE TABLE`, not `CREATE TABLE IF NOT EXISTS`. Applying it directly to an existing database will fail. Existing databases must use the reconcile-then-resolve sequence in Section 7.5. Fresh databases apply it normally.

### 7.2 Reconcile migration (expand-only)

**Directory:** `prisma/migrations/20261027000000_reconcile_schema_drift/`
**File:** `migration.sql`

This migration is idempotent and safe to run on both existing and fresh databases. It adds only what is missing; it does not drop or rename anything.

```sql
-- Expand-only reconciliation for databases created before the Prisma baseline.
-- Safe to run multiple times. No destructive statements.

BEGIN;

-- 1. Canonical corrective-action fields on Observation.
ALTER TABLE "Observation" ADD COLUMN IF NOT EXISTS "clientResponse" TEXT;
ALTER TABLE "Observation" ADD COLUMN IF NOT EXISTS "correctiveAction" TEXT;
ALTER TABLE "Observation" ADD COLUMN IF NOT EXISTS "correctiveActionStatus" TEXT;

-- 2. Storage metadata.
ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "storageBucket" TEXT;
ALTER TABLE "Image" ADD COLUMN IF NOT EXISTS "storagePath" TEXT;

ALTER TABLE "ClientDocument" ADD COLUMN IF NOT EXISTS "storageBucket" TEXT;
ALTER TABLE "ClientDocument" ADD COLUMN IF NOT EXISTS "storagePath" TEXT;

ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "resumeBucket" TEXT;
ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "resumePath" TEXT;
ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "resumeMimeType" TEXT;
ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "resumeSize" INTEGER;

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "logoBucket" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "logoPath" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "logoMimeType" TEXT;

-- 3. Upload intents.
CREATE TABLE IF NOT EXISTS "UploadIntent" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT,
  "ownerKey"          TEXT,
  "kind"              TEXT NOT NULL,
  "bucket"            TEXT NOT NULL,
  "path"              TEXT NOT NULL,
  "originalName"      TEXT,
  "mimeType"          TEXT NOT NULL,
  "expectedSize"      INTEGER NOT NULL,
  "metadata"          JSONB,
  "resultId"          TEXT,
  "status"            TEXT NOT NULL DEFAULT 'PENDING',
  "completeTokenHash" TEXT NOT NULL,
  "expiresAt"         TIMESTAMP(3) NOT NULL,
  "completedAt"       TIMESTAMP(3),
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UploadIntent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UploadIntent_bucket_path_key"
  ON "UploadIntent" ("bucket", "path");
CREATE INDEX IF NOT EXISTS "UploadIntent_userId_status_idx"
  ON "UploadIntent" ("userId", "status");
CREATE INDEX IF NOT EXISTS "UploadIntent_status_expiresAt_idx"
  ON "UploadIntent" ("status", "expiresAt");
CREATE INDEX IF NOT EXISTS "UploadIntent_resultId_idx"
  ON "UploadIntent" ("resultId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UploadIntent_userId_fkey'
  ) THEN
    ALTER TABLE "UploadIntent"
      ADD CONSTRAINT "UploadIntent_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE "UploadIntent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "UploadIntent" FROM PUBLIC, anon, authenticated;

-- 4. Unique storage keys. Existing rows are NULL, and PostgreSQL treats
-- NULLs as distinct, so this is safe before the backfill.
CREATE UNIQUE INDEX IF NOT EXISTS "Image_storageBucket_storagePath_key"
  ON "Image" ("storageBucket", "storagePath");
CREATE UNIQUE INDEX IF NOT EXISTS "ClientDocument_storageBucket_storagePath_key"
  ON "ClientDocument" ("storageBucket", "storagePath");
CREATE UNIQUE INDEX IF NOT EXISTS "JobApplication_resumeBucket_resumePath_key"
  ON "JobApplication" ("resumeBucket", "resumePath");
CREATE UNIQUE INDEX IF NOT EXISTS "Client_logoBucket_logoPath_key"
  ON "Client" ("logoBucket", "logoPath");

COMMIT;
```

**Role portability:** `REVOKE ... FROM anon, authenticated` assumes a Supabase database where those roles exist. If the migration must also run on plain PostgreSQL, wrap the revoke in a `DO` block that checks `pg_roles` first. The existing RLS migrations already assume Supabase, so this is consistent with the current deployment target.

### 7.3 Pagination index migration

**Directory:** `prisma/migrations/20261027000100_add_pagination_indexes/`
**File:** `migration.sql`

```sql
-- Composite indexes for keyset pagination and server-side filters.
-- These are regular CREATE INDEX statements so Prisma can track them.
-- For large production tables, apply the same statements with CONCURRENTLY
-- outside a transaction (Section 7.7) and mark this migration applied.

BEGIN;

-- Report list: client, global, status, consultant.
CREATE INDEX IF NOT EXISTS "Report_clientId_date_id_idx"
  ON "Report" ("clientId", "date" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "Report_date_id_idx"
  ON "Report" ("date" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "Report_status_date_id_idx"
  ON "Report" ("status", "date" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "Report_consultantId_idx"
  ON "Report" ("consultantId");

-- Observation: ordered children and risk filter.
CREATE INDEX IF NOT EXISTS "Observation_reportId_sortOrder_id_idx"
  ON "Observation" ("reportId", "sortOrder", "id");
CREATE INDEX IF NOT EXISTS "Observation_reportId_riskLevel_idx"
  ON "Observation" ("reportId", "riskLevel");

-- Image: ordered children.
CREATE INDEX IF NOT EXISTS "Image_observationId_createdAt_idx"
  ON "Image" ("observationId", "createdat");

-- ClientDocument: library and folder views.
CREATE INDEX IF NOT EXISTS "ClientDocument_clientId_createdAt_id_idx"
  ON "ClientDocument" ("clientId", "createdat" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "ClientDocument_clientId_folderId_createdAt_idx"
  ON "ClientDocument" ("clientId", "folderId", "createdat" DESC);

-- Client list.
CREATE INDEX IF NOT EXISTS "Client_createdAt_id_idx"
  ON "Client" ("createdat" DESC, "id" DESC);

-- Activity log: global and per-user.
CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_id_idx"
  ON "ActivityLog" ("createdat" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_createdAt_idx"
  ON "ActivityLog" ("userId", "createdat" DESC);

-- Job applications.
CREATE INDEX IF NOT EXISTS "JobApplication_status_createdAt_id_idx"
  ON "JobApplication" ("status", "createdat" DESC, "id" DESC);
CREATE INDEX IF NOT EXISTS "JobApplication_jobOpeningId_createdAt_idx"
  ON "JobApplication" ("jobOpeningId", "createdat" DESC);
CREATE INDEX IF NOT EXISTS "JobApplication_createdAt_id_idx"
  ON "JobApplication" ("createdat" DESC, "id" DESC);

-- Contact requests.
CREATE INDEX IF NOT EXISTS "ContactRequest_status_createdAt_id_idx"
  ON "ContactRequest" ("status", "createdat" DESC, "id" DESC);

-- Job openings.
CREATE INDEX IF NOT EXISTS "JobOpening_status_isPublished_sortOrder_idx"
  ON "JobOpening" ("status", "isPublished", "sortOrder");
CREATE INDEX IF NOT EXISTS "JobOpening_isPublished_sortOrder_idx"
  ON "JobOpening" ("isPublished", "sortOrder");
CREATE INDEX IF NOT EXISTS "JobOpening_createdAt_id_idx"
  ON "JobOpening" ("createdat" DESC, "id" DESC);

-- Training.
CREATE INDEX IF NOT EXISTS "TrainingQuestion_courseId_sortOrder_id_idx"
  ON "TrainingQuestion" ("courseId", "sortOrder", "id");
CREATE INDEX IF NOT EXISTS "TrainingEnrollment_courseId_createdAt_idx"
  ON "TrainingEnrollment" ("courseId", "createdAt" DESC);

COMMIT;
```

Index name and column-case notes:
- Prisma names indexes from **field names** (`createdAt`), but the physical column may be `createdat`. The SQL above uses the physical column name and the Prisma-expected index name. Do not “fix” the casing of the column reference.
- `CREATE INDEX` takes an `ACCESS EXCLUSIVE`-adjacent lock on the table for the duration of the build. On a large table, use `CONCURRENTLY` outside a transaction (Section 7.7).
- If an index already exists with a different name, `IF NOT EXISTS` will not detect it; check `pg_indexes` first and drop/rename deliberately.

### 7.4 Contract migration (later, destructive)

**Directory:** `prisma/migrations/20261101000000_contract_cleanup/`
**Do not deploy this with the expand migration.** Run it only after:
- The application has been on the new schema for at least one release.
- The storage backfill is complete and verified.
- `TrainingQuestion` corrective columns are confirmed empty.
- The redundant indexes have zero scans in `pg_stat_user_indexes` over a full business cycle.

```sql
BEGIN;

-- 1. Drop misplaced TrainingQuestion columns only if they contain no data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'TrainingQuestion'
      AND column_name = 'clientResponse'
  ) THEN
    IF EXISTS (SELECT 1 FROM "TrainingQuestion" WHERE "clientResponse" IS NOT NULL) THEN
      RAISE EXCEPTION 'TrainingQuestion.clientResponse contains data; aborting';
    END IF;
    ALTER TABLE "TrainingQuestion" DROP COLUMN "clientResponse";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'TrainingQuestion'
      AND column_name = 'correctiveAction'
  ) THEN
    IF EXISTS (SELECT 1 FROM "TrainingQuestion" WHERE "correctiveAction" IS NOT NULL) THEN
      RAISE EXCEPTION 'TrainingQuestion.correctiveAction contains data; aborting';
    END IF;
    ALTER TABLE "TrainingQuestion" DROP COLUMN "correctiveAction";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'TrainingQuestion'
      AND column_name = 'correctiveActionStatus'
  ) THEN
    IF EXISTS (SELECT 1 FROM "TrainingQuestion" WHERE "correctiveActionStatus" IS NOT NULL) THEN
      RAISE EXCEPTION 'TrainingQuestion.correctiveActionStatus contains data; aborting';
    END IF;
    ALTER TABLE "TrainingQuestion" DROP COLUMN "correctiveActionStatus";
  END IF;
END $$;

-- 2. Align training timestamp precision with Prisma's timestamp(3).
-- This rewrites each table. Run in a maintenance window.
ALTER TABLE "TrainingCourse"
  ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) USING "createdAt"::timestamp(3),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3) USING "updatedAt"::timestamp(3);
ALTER TABLE "TrainingQuestion"
  ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) USING "createdAt"::timestamp(3);
ALTER TABLE "TrainingEnrollment"
  ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) USING "createdAt"::timestamp(3),
  ALTER COLUMN "updatedAt" TYPE TIMESTAMP(3) USING "updatedAt"::timestamp(3);
ALTER TABLE "TrainingAttempt"
  ALTER COLUMN "createdAt" TYPE TIMESTAMP(3) USING "createdAt"::timestamp(3);

-- 3. Drop redundant indexes after verifying zero scans.
DROP INDEX IF EXISTS "User_email_idx";
DROP INDEX IF EXISTS "Client_userId_idx";
DROP INDEX IF EXISTS "TrainingEnrollment_userId_idx";

-- 4. Optional: only after the backfill has verified every row has a storage path.
-- ALTER TABLE "Image" ALTER COLUMN "url" DROP NOT NULL;
-- ALTER TABLE "ClientDocument" ALTER COLUMN "url" DROP NOT NULL;

COMMIT;
```

The commented-out `DROP NOT NULL` is optional. Keeping `url NOT NULL` and storing a canonical `supabase://` URI is simpler and safer; do not drop the constraint unless there is a concrete reason.

### 7.5 Applying the baseline to an existing database

This is the high-risk sequence. Rehearse it on a restored clone first.

```bash
# 0. Snapshot. Do not skip this.
pg_dump "$DIRECT_URL" \
  --format=custom --no-owner --no-acl \
  --file "backups/pre-baseline-$(date +%Y%m%d-%H%M%S).dump"

# 1. Confirm the live schema before touching it (Section 14.1–14.2).
psql "$DIRECT_URL" -f scripts/audit/current-schema.sql

# 2. Apply the expand migration manually, outside Prisma's history.
npx prisma db execute \
  --file prisma/migrations/20261027000000_reconcile_schema_drift/migration.sql \
  --url "$DIRECT_URL"

# 3. Mark the baseline as applied. This records the checksum without running
#    the baseline's CREATE TABLE statements against existing objects.
npx prisma migrate resolve --applied 20260713000000_baseline

# 4. Apply the remaining migrations. The reconcile migration is idempotent,
#    so re-running it through Prisma is safe.
npx prisma migrate deploy

# 5. Verify.
npx prisma migrate status
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --exit-code
```

Why mark the baseline applied instead of letting it run:
- The generated baseline uses `CREATE TABLE` without `IF NOT EXISTS`.
- Existing objects would cause “relation already exists” and abort the migration.
- `migrate resolve --applied` records the baseline in `_prisma_migrations` without executing it. The actual schema was reconciled in step 2.

**Verification gate before step 3:** compare the live schema to the baseline with `prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script`. The output should contain only the contract-phase changes (dropped TrainingQuestion columns, timestamp precision, redundant index drops). If it contains a `CREATE TABLE` for a core table, the baseline does not match and you must not resolve it.

### 7.6 Applying to a fresh database

```bash
npx prisma migrate deploy
npx prisma migrate status
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --exit-code
```

Expected: baseline creates everything; the existing training/document/folder migrations are no-ops because of `IF NOT EXISTS`; the reconcile migration is a no-op; the index migration is a no-op because the baseline already created the indexes. If the index migration fails with “relation already exists”, the baseline and the hand-written migration disagree on an index name; fix the name, do not skip the migration.

### 7.7 Building indexes without blocking writes

Prisma wraps a migration in a transaction on PostgreSQL, and `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. For large tables:

1. Apply the expand migration **without** the index statements (or mark it applied after the schema changes).
2. Run each `CREATE INDEX CONCURRENTLY` with `psql` against `DIRECT_URL`, one at a time:
   ```sql
   SET statement_timeout = '0';
   SET lock_timeout = '5s';
   CREATE INDEX CONCURRENTLY IF NOT EXISTS "Report_clientId_date_id_idx"
     ON "Report" ("clientId", "date" DESC, "id" DESC);
   ```
3. If a concurrent build fails, it leaves an `INVALID` index. Drop it and retry; do not leave it in place.
4. After all indexes are valid, insert the migration row with `prisma migrate resolve --applied 20261027000100_add_pagination_indexes` **only if** the migration file was not already applied. Keep a written record.

Useful checks:

```sql
SELECT indexrelid::regclass, indrelid::regclass, indisvalid, indisready
FROM pg_index
WHERE NOT indisvalid OR NOT indisready;

SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state <> 'idle'
ORDER BY duration DESC;
```

### 7.8 Rollback

| Phase | Rollback |
|---|---|
| Expand migration | Additive only; leave it. Reverting the app is safe. |
| Baseline resolve | `DELETE FROM _prisma_migrations WHERE migration_name = '20260713000000_baseline'` only on a clone; never on production without a snapshot. |
| Index migration | `DROP INDEX CONCURRENTLY IF EXISTS ...` for each new index. Recreate the old index if it was dropped. |
| Contract migration | Restore the pre-contract snapshot. Dropped columns and rewritten tables are not reversible in place. |
| App deploy | Deploy the previous build; the expand schema is backward-compatible. |

Never edit an applied migration file. If a migration is wrong, create a new corrective migration.

---

## 8. Supabase Storage design

### 8.1 Environment variables

```dotenv
# Database
DATABASE_URL="postgresql://qhsse_app.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"

# Supabase Storage (server-only secrets)
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
STORAGE_DRIVER="supabase"                 # supabase | disabled
STORAGE_PATH_PREFIX="prod"               # prod | staging | dev

# Buckets
SUPABASE_STORAGE_BUCKET_IMAGES="observation-evidence"
SUPABASE_STORAGE_BUCKET_DOCUMENTS="client-documents"
SUPABASE_STORAGE_BUCKET_RESUMES="resumes"
SUPABASE_STORAGE_BUCKET_LOGOS="client-logos"

# Limits and TTLs
STORAGE_MAX_IMAGE_BYTES="8388608"
STORAGE_MAX_DOCUMENT_BYTES="10485760"
STORAGE_MAX_RESUME_BYTES="5242880"
STORAGE_MAX_LOGO_BYTES="1048576"
STORAGE_UPLOAD_TTL_SECONDS="120"
STORAGE_READ_TTL_SECONDS="900"

# Pagination cursor signing
CURSOR_SECRET="<32-byte-random-base64>"

# Cron protection
CRON_SECRET="<32-byte-random-base64>"

# Browser-safe (signed upload only)
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>"
```

Rules:
- `SUPABASE_SERVICE_ROLE_KEY` is **server-only**. Never prefix it with `NEXT_PUBLIC_`, never log it, never return it from an API, and never put it in a client component.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose only because the buckets are private and the browser uses a short-lived signed upload token. The anon key alone cannot read or write a private bucket.
- If `STORAGE_DRIVER=disabled` in production, upload endpoints return `503 STORAGE_NOT_CONFIGURED`. They do not fall back to base64.
- `CURSOR_SECRET` must be present in production; the server should fail its health check if it is missing.

`.env.production.example` currently documents only the public URL and anon key (lines 10–12). Add the server-only variables there with placeholder values, and add the real values to the hosting provider's secret store.

### 8.2 Buckets and path layout

| Bucket | Visibility | Max size | Allowed MIME | Path pattern |
|---|---|---|---|---|
| `observation-evidence` | private | 8 MB | `image/jpeg`, `image/png`, `image/webp` | `{env}/clients/{clientId}/reports/{reportId}/observations/{observationId}/{intentId}.{ext}` |
| `client-documents` | private | 10 MB | `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `image/jpeg`, `image/png`, `image/webp` | `{env}/clients/{clientId}/folders/{folderId|root}/{intentId}.{ext}` |
| `resumes` | private | 5 MB | `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `{env}/jobs/{jobOpeningId}/applications/{intentId}.{ext}` |
| `client-logos` | private | 1 MB | `image/png`, `image/jpeg`, `image/webp` | `{env}/clients/{clientId}/logo/{intentId}.{ext}` |

Design rules:
- **The server derives the path.** The client never supplies a bucket, path, or extension. The intent ID is a server-generated UUID, so retries are idempotent and path traversal is impossible.
- **One bucket per sensitivity class.** Resumes are PII and should have a shorter retention policy than client documents. Separate buckets make lifecycle rules and access audits simpler.
- **No public buckets.** Do not use `getPublicUrl()`. Every read is a short-lived signed URL or an authenticated route that redirects to one.
- **Bucket-level limits are defense in depth.** Configure the same max size and MIME allowlist in Supabase; the application validation is the primary control.
- **CORS:** allow the production and preview origins for `PUT`/`POST` with the `authorization`, `x-client-info`, `content-type`, `x-upsert` headers. Do not use `*` in production.
- **Lifecycle:** delete incomplete multipart uploads after 1 day; expire objects with no DB reference after 30 days (only via the cleanup job, never a blind bucket rule).

### 8.3 Storage provider interface

Create `lib/storage/index.ts`:

```ts
export type StorageBucket =
  | 'observation-evidence'
  | 'client-documents'
  | 'resumes'
  | 'client-logos'

export type UploadTarget = {
  bucket: StorageBucket
  path: string
  signedUrl: string
  uploadToken: string
  expiresAt: Date
}

export type StoredObjectInfo = {
  size: number
  contentType: string
  etag?: string
  lastModified?: Date
}

export type SignedUrl = {
  url: string
  expiresAt: Date
}

export interface StorageProvider {
  createUploadTarget(input: {
    bucket: StorageBucket
    path: string
    contentType: string
    size: number
  }): Promise<UploadTarget>

  stat(bucket: StorageBucket, path: string): Promise<StoredObjectInfo>

  createSignedUrl(
    bucket: StorageBucket,
    path: string,
    expiresInSeconds: number,
    downloadName?: string
  ): Promise<SignedUrl>

  createSignedUrls(
    items: Array<{ bucket: StorageBucket; path: string }>,
    expiresInSeconds: number
  ): Promise<Map<string, SignedUrl>>

  remove(bucket: StorageBucket, paths: string[]): Promise<void>
}
```

Create `lib/storage/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import type { StorageProvider, StorageBucket, UploadTarget, StoredObjectInfo, SignedUrl } from './index'

const admin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'qhsse-portal' } },
  }
)

export const supabaseStorage: StorageProvider = {
  async createUploadTarget({ bucket, path, contentType, size }) {
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: false })

    if (error || !data) throw new StorageError('SIGNED_UPLOAD_FAILED', error)

    return {
      bucket,
      path,
      signedUrl: data.signedUrl,
      uploadToken: data.token,
      expiresAt: new Date(Date.now() + 120_000),
    }
  },

  async stat(bucket, path) {
    // Supabase Storage JS exposes info(path) in v2.110.x. If the installed
    // version does not, fall back to list(parentPrefix, { search: filename })
    // and read the metadata object.
    const { data, error } = await admin.storage.from(bucket).info(path)
    if (error || !data) throw new StorageError('OBJECT_NOT_FOUND', error)

    return {
      size: Number(data.metadata?.size ?? 0),
      contentType: String(data.metadata?.mimetype ?? ''),
      etag: data.metadata?.eTag,
      lastModified: data.updated_at ? new Date(data.updated_at) : undefined,
    }
  },

  async createSignedUrl(bucket, path, expiresInSeconds, downloadName) {
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds, downloadName ? { download: downloadName } : undefined)

    if (error || !data?.signedUrl) throw new StorageError('SIGNED_READ_FAILED', error)

    return {
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    }
  },

  async createSignedUrls(items, expiresInSeconds) {
    const result = new Map<string, SignedUrl>()

    // Supabase limits a single createSignedUrls call; chunk conservatively.
    for (let i = 0; i < items.length; i += 100) {
      const chunk = items.slice(i, i + 100)
      const byBucket = new Map<StorageBucket, string[]>()

      for (const item of chunk) {
        const paths = byBucket.get(item.bucket) ?? []
        paths.push(item.path)
        byBucket.set(item.bucket, paths)
      }

      for (const [bucket, paths] of byBucket) {
        const { data, error } = await admin.storage.from(bucket).createSignedUrls(paths, expiresInSeconds)
        if (error || !data) throw new StorageError('SIGNED_READ_FAILED', error)

        for (const entry of data) {
          if (entry.error || !entry.signedUrl) continue
          result.set(`${bucket}:${entry.path}`, {
            url: entry.signedUrl,
            expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
          })
        }
      }
    }

    return result
  },

  async remove(bucket, paths) {
    if (paths.length === 0) return
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100))
      if (error) throw new StorageError('OBJECT_DELETE_FAILED', error)
    }
  },
}
```

Add `lib/storage/errors.ts`:

```ts
export class StorageError extends Error {
  constructor(
    public readonly code:
      | 'SIGNED_UPLOAD_FAILED'
      | 'SIGNED_READ_FAILED'
      | 'OBJECT_NOT_FOUND'
      | 'OBJECT_DELETE_FAILED'
      | 'NOT_CONFIGURED',
    cause?: unknown
  ) {
    super(code)
    this.cause = cause
  }
}
```

Add `lib/storage/index.ts` factory:

```ts
export function getStorage(): StorageProvider {
  if (process.env.STORAGE_DRIVER !== 'supabase') {
    throw new StorageError('NOT_CONFIGURED')
  }

  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_STORAGE_BUCKET_IMAGES',
    'SUPABASE_STORAGE_BUCKET_DOCUMENTS',
    'SUPABASE_STORAGE_BUCKET_RESUMES',
    'SUPABASE_STORAGE_BUCKET_LOGOS',
  ]

  for (const key of required) {
    if (!process.env[key]) throw new StorageError('NOT_CONFIGURED')
  }

  return supabaseStorage
}
```

Operational rules:
- Create the client once per process, not per request.
- Set a 5-second timeout on `stat`, `remove`, and signed-URL calls; retry idempotent operations twice with exponential backoff and jitter on `429`/`5xx`; never retry `4xx`.
- Log the bucket and a truncated path hash, never the signed URL or token.
- On `NOT_CONFIGURED` in production, return `503` with `Retry-After: 60` and alert.

### 8.4 Upload lifecycle

#### Step 1: create an intent

`POST /api/uploads/intent`

```json
{
  "kind": "OBSERVATION_IMAGE",
  "clientId": "0f4e...",
  "reportId": "7c2a...",
  "observationId": "b19d...",
  "filename": "pump-room.jpg",
  "size": 7340032,
  "mimeType": "image/jpeg"
}
```

Server responsibilities, in order:
1. Authenticate and authorize (`ADMIN` for images/documents; `CLIENT` for own logo; public for resumes).
2. Validate the body with a kind-specific Zod schema (`.strict()`).
3. Verify the parent belongs to the caller:
   - Observation image: observation exists, belongs to a report, report belongs to `clientId`; admin only.
   - Client document: client exists; `folderId` (if present) belongs to the same client.
   - Resume: job opening is `isPublished=true` and `status='OPEN'`; rate limit by `email + jobOpeningId` and IP.
   - Client logo: `clientId` equals the session client's ID.
4. Enforce per-kind size and MIME allowlist before creating the intent.
5. Enforce quota: count and total bytes of non-deleted objects for the client/user; reject over quota.
6. Derive the path from server-side IDs and a new intent UUID.
7. Generate `completionToken = randomBytes(32).toString('base64url')`, store only `sha256(completionToken)`.
8. Insert `UploadIntent` with `status='PENDING'`, `expiresAt=now+120s`, `metadata` with the parent IDs.
9. Call `createUploadTarget`.
10. Return `{ intentId, bucket, path, signedUrl, uploadToken, completionToken, expiresAt }`.

Response example:

```json
{
  "intentId": "c4a1...",
  "bucket": "observation-evidence",
  "path": "prod/clients/0f4e.../reports/7c2a.../observations/b19d.../c4a1....jpg",
  "signedUrl": "https://<project>.supabase.co/storage/v1/object/upload/sign/...",
  "uploadToken": "eyJ...",
  "completionToken": "8Kd...",
  "expiresAt": "2026-10-27T12:34:56.000Z"
}
```

The client must not persist `completionToken` in `localStorage`; keep it in memory for the duration of the upload.

#### Step 2: upload directly to Supabase

```ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const { error } = await supabase.storage
  .from(intent.bucket)
  .uploadToSignedUrl(intent.path, intent.uploadToken, file, {
    contentType: file.type,
    upsert: false,
  })
```

If the SDK version does not expose `uploadToSignedUrl`, `PUT` the file to `intent.signedUrl` with `x-upsert: false` and the anon key. The signed token in the URL authorizes the write.

#### Step 3: complete the intent

`POST /api/uploads/complete`

```json
{ "intentId": "c4a1...", "completionToken": "8Kd..." }
```

Server responsibilities:
1. Load the intent by ID.
2. Verify `status='PENDING'`, `expiresAt > now()`, and `sha256(completionToken)` matches in constant time (`crypto.timingSafeEqual`).
3. If `intent.userId` is set, require the same session user; if null, the completion token is the only credential (public resume).
4. `stat` the object. Verify it exists, `size === expectedSize`, and the detected `contentType` is in the allowlist.
5. **Magic-byte verification:** create a short-lived signed URL and `fetch` the first 512 bytes with `Range: bytes=0-511`; run the appropriate validator (`validateImageFile`, `validateResumeFile`, or the new document validator). Do not trust the uploaded `Content-Type`.
6. If any check fails: `remove` the object, set `status='FAILED'`, return `422 INVALID_UPLOAD`.
7. In a single database transaction:
   - Create the domain row (`Image`, `ClientDocument`, `JobApplication`, or update `Client` logo columns).
   - Set `url`/`resumeUrl` to `supabase://{bucket}/{path}`.
   - Set `storageBucket`, `storagePath`, `mimeType`, `size`, `originalName`.
   - Set `status='COMPLETED'`, `completedAt=now()`.
8. If the transaction fails: leave the object in place, set `status='FAILED'` in a best-effort update, and return `500`. The cleanup job removes the orphan after the retention window. Do not delete the object before the transaction commits; a retry can reuse it.
9. Return the created domain object (without a signed URL) and a `Location` header for the new resource.

Idempotency:
- A second `complete` with the same intent and token returns the existing domain row if `status='COMPLETED'` and the stored `resultId` matches. Add `resultId String?` to `UploadIntent` if the implementation needs this without a join.
- A second `complete` after `EXPIRED` returns `410 INTENT_EXPIRED`.
- A second `complete` with a different token returns `403`.

Add `resultId String?` and `@@index([resultId])` to `UploadIntent` if the domain row ID is not otherwise discoverable. This is recommended; it makes the completion idempotent without a query across four tables.

### 8.5 Read path

List endpoints return file metadata plus a short-lived URL, never the raw bucket path:

```json
{
  "id": "b19d...",
  "type": "EVIDENCE",
  "file": {
    "url": "https://<project>.supabase.co/storage/v1/object/sign/observation-evidence/...",
    "expiresAt": "2026-10-27T12:49:56.000Z",
    "originalName": "pump-room.jpg",
    "mimeType": "image/jpeg",
    "size": 7340032
  }
}
```

Rules:
- TTL: 15 minutes (`STORAGE_READ_TTL_SECONDS=900`). Do not return a URL that outlives the page session.
- Batch signed URLs per page, not per row. `createSignedUrls` is chunked at 100.
- If `storagePath` is present, sign it. If only a legacy `data:` URL is present, return it as-is during the transition (with a `legacy: true` marker if the client needs to know).
- If the object is missing and a legacy URL exists, fall back to the legacy URL and log a `STORAGE_OBJECT_MISSING` warning. If neither exists, return `file: null`.
- Do not expose `storageBucket` or `storagePath` in public API responses. They are internal identifiers. If an export needs them, gate it behind an admin endpoint.
- For downloads, use dedicated routes:
  - `GET /api/files/observation-image/[id]` — admin or owning client; 302 to a signed URL with `download=originalName`.
  - `GET /api/files/client-document/[id]` — admin or owning client; same.
  - `GET /api/files/resume/[id]` — admin only; same.
  - `GET /api/files/client-logo/[clientId]` — admin or owning client; 302.
- Set `Cache-Control: private, no-store` on the JSON that contains signed URLs. The signed URL itself can be cached by the browser until `expiresAt`.
- If `next/image` is used for thumbnails, add `images.remotePatterns` for `*.supabase.co`. Otherwise use a plain `<img>` with `referrerPolicy="no-referrer"`.

### 8.6 Validation matrix

| Kind | Auth | Parent check | Max | Allowed MIME | Magic bytes | Extra |
|---|---|---|---|---|---|---|
| `OBSERVATION_IMAGE` | `ADMIN` | Observation → report → client | 8 MB | JPEG, PNG, WebP | `FF D8 FF`; `89 50 4E 47`; `RIFF....WEBP` | Reject GIF (not needed); dimension cap 12,000 × 12,000 |
| `CLIENT_DOCUMENT` | `ADMIN` | Client; folder belongs to client | 10 MB | PDF, DOC, DOCX, XLSX, JPEG, PNG, WebP | `%PDF-`; OLE `D0 CF 11 E0`; ZIP `50 4B 03 04` for DOCX/XLSX | Inspect ZIP for `[Content_Types].xml` + `word/` or `xl/`; reject macros (`.docm`, `.xlsm`) |
| `RESUME` | Public, rate-limited | Job opening open/published | 5 MB | PDF, DOC, DOCX | Same as above | Store `Content-Disposition: attachment`; never inline |
| `CLIENT_LOGO` | `CLIENT` (own) or `ADMIN` | Client | 1 MB | PNG, JPEG, WebP | Same as image | Square-ish check optional; strip EXIF |

Additional controls:
- Detect the MIME type from bytes, not from the request. Compare the detected type to the declared type; reject if they differ.
- `sanitizeFilename()` is already implemented (`lib/file-validation.ts:23–25`). Keep it for the `originalName` metadata, but do not use the filename in the path.
- Reject SVG, HTML, and unknown ZIP-based formats.
- For DOCX/XLSX, a ZIP signature alone is insufficient. Use `file-type` or parse the ZIP central directory for the expected entries. A `.docx` renamed to `.pdf` must fail.
- For images, reject decompression bombs by checking dimensions before decoding. If `sharp` is not installed, add a small header parser or `image-size`.
- Malware scan: enqueue a scan job after `complete`; store `scanStatus` (`PENDING`/`CLEAN`/`INFECTED`) on the domain row or a separate table. Do not serve an object with `scanStatus != CLEAN` to a client. This can be a follow-up if the product accepts the risk, but the field should exist before launch.

### 8.7 Legacy base64 backfill

Create `scripts/migrate-base64-to-storage.ts`. It is an operator script, not a request handler.

Flags:
```
--dry-run                 count and report only
--kind=images|documents|resumes|logos
--batch=25
--start-after=<uuid>      resume support
--verify-only             re-download and compare hashes
```

Algorithm per row:
1. Select rows where `storagePath IS NULL` and `url LIKE 'data:%'` (or `resumeUrl`, or `contactInfo` contains `logoDataUrl`), ordered by `id`, `LIMIT batch`.
2. Parse the data URL. Reject if the MIME is not in the allowlist or the decoded size exceeds the cap.
3. Decode to a Buffer. Compute SHA-256.
4. Upload with the service-role client to a deterministic path using the existing row ID:
   - `prod/clients/{clientId}/reports/{reportId}/observations/{observationId}/{imageId}.{ext}`
   - `prod/clients/{clientId}/folders/{folderId|root}/{documentId}.{ext}`
   - `prod/jobs/{jobOpeningId}/applications/{applicationId}.{ext}`
   - `prod/clients/{clientId}/logo/{clientId}.{ext}`
5. Download the object and compare SHA-256 and size. If they differ, abort that row and log it.
6. Update the row: `storageBucket`, `storagePath`, `mimeType`, `size`, and `url = supabase://{bucket}/{path}`. Keep the old data URL in a new `legacyUrl` column only if the audit requires it; otherwise the transaction replaces it after verification.
7. Commit per row or per small batch. Do not hold a transaction open across a network upload.
8. Sleep 100–250 ms between rows to protect the database and storage.
9. Print a summary: scanned, migrated, skipped, failed, bytes moved.

Safety:
- Run during low traffic.
- Start with `--dry-run` and a single kind.
- Monitor `pg_stat_activity`, storage error rate, and DB WAL.
- Do not delete the legacy value until the read path has been on `storagePath` for 30 days and a reconciliation query shows zero `data:` rows.
- The script must be idempotent: if `storagePath` is already set, skip.
- A failed object upload leaves the row untouched; rerun the same batch.

Reconciliation queries:

```sql
SELECT 'Image' AS source, count(*) AS remaining
FROM "Image" WHERE "storagePath" IS NULL AND "url" LIKE 'data:%'
UNION ALL
SELECT 'ClientDocument', count(*)
FROM "ClientDocument" WHERE "storagePath" IS NULL AND "url" LIKE 'data:%'
UNION ALL
SELECT 'JobApplication', count(*)
FROM "JobApplication" WHERE "resumePath" IS NULL AND "resumeUrl" LIKE 'data:%'
UNION ALL
SELECT 'ClientLogo', count(*)
FROM "Client" WHERE "logoPath" IS NULL AND "contactInfo" LIKE '%logoDataUrl%';
```

### 8.8 Cleanup and orphan handling

`GET /api/cron/storage-cleanup` (protected by `Authorization: Bearer $CRON_SECRET`, Vercel Cron every 15 minutes):

1. Find `UploadIntent` rows with `status='PENDING'` and `expiresAt < now() - 1 hour`, limit 100.
2. For each, call `remove(bucket, [path])`. Ignore `OBJECT_NOT_FOUND`.
3. Set `status='EXPIRED'`.
4. Delete `COMPLETED` intents older than 30 days (keep the audit row if policy requires it; otherwise delete).
5. Log counts and duration.

Weekly orphan reconciliation:
- List objects under each prefix, page by page.
- For each object, check for a domain row with the matching `storagePath` or a `COMPLETED` intent.
- Delete only objects older than 24 hours with no reference and no `PENDING` intent.
- Never delete an object referenced by a row, even if the row is soft-deleted (there is no soft delete today).
- Run in dry-run mode first and compare counts.

Quota:
- At intent creation, sum `size` for the client's images and documents, and for the user's pending intents. Reject with `413 QUOTA_EXCEEDED` above the configured limit.
- Add a per-client limit (for example, 5 GB) and a per-user pending-intent limit (for example, 10).

### 8.9 Failure modes

| Failure | Behavior |
|---|---|
| Storage not configured in production | Upload routes return `503 STORAGE_NOT_CONFIGURED`; reads of legacy data URLs still work; health check fails |
| Signed upload URL creation fails | `503 STORAGE_UNAVAILABLE` with `Retry-After`; no intent row is left in `PENDING` if the insert can be rolled back |
| Browser uploads but never calls complete | Intent remains `PENDING`; cleanup deletes the object after 1 hour; no domain row |
| Complete called twice | Idempotent: return the existing domain row if the token and `resultId` match |
| DB transaction fails after upload | Object remains; intent `FAILED`; cleanup removes it after the retention window; client can retry complete |
| Object deleted outside the app | Read returns `file: null` and logs `STORAGE_OBJECT_MISSING`; legacy URL is used if present |
| Signed read URL expired | Browser re-fetches the list or the file route; 403 from storage is expected, not a 500 |
| Supabase outage | New uploads fail fast; existing signed URLs may still work from CDN; legacy data URLs remain readable |
| Service-role key rotated | Update the secret and redeploy; old signed URLs remain valid until expiry |

---

## 9. Query layer refactor

The goal is to delete the introspection and string-building layer, not to wrap it. Every module below should end with zero `$queryRawUnsafe`, zero `$executeRawUnsafe`, zero `information_schema` reads, and zero dynamic SQL.

### 9.1 `lib/report-records.ts`

Replace the 646-line module with Prisma queries. Keep the public function names and response shape where possible so the UI change is limited to pagination.

```ts
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { clampLimit, decodeCursor, encodeCursor, filterHash } from '@/lib/pagination'

export type ListReportOptions = {
  clientId?: string
  status?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  riskLevels?: string[]
  limit?: number
  cursor?: string
  withTotal?: boolean
}

export async function listReportRecords(options: ListReportOptions = {}) {
  const limit = clampLimit(options.limit)
  const hash = filterHash('reports', {
    clientId: options.clientId ?? null,
    status: options.status ?? null,
    category: options.category ?? null,
    dateFrom: options.dateFrom ?? null,
    dateTo: options.dateTo ?? null,
    riskLevels: options.riskLevels ?? [],
  })

  const cursorKey = options.cursor ? decodeCursor(options.cursor, hash) : null

  const where: Prisma.ReportWhereInput = {
    ...(options.clientId ? { clientId: options.clientId } : {}),
    ...(options.status ? { status: options.status } : {}),
    ...(options.category ? { category: options.category } : {}),
    ...(options.dateFrom || options.dateTo
      ? {
          date: {
            ...(options.dateFrom ? { gte: new Date(options.dateFrom) } : {}),
            ...(options.dateTo ? { lte: new Date(options.dateTo) } : {}),
          },
        }
      : {}),
    ...(options.riskLevels?.length
      ? { observations: { some: { riskLevel: { in: options.riskLevels } } } }
      : {}),
  }

  const rows = await prisma.report.findMany({
    where,
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
          user: { select: { email: true } },
        },
      },
      consultant: { select: { name: true } },
      observations: {
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        include: {
          images: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
        },
      },
    },
    orderBy: [{ date: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursorKey
      ? { cursor: { id: cursorKey[1] }, skip: 1 }
      : {}),
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const last = page.at(-1)

  const items = page.map((report) => ({
    id: report.id,
    date: report.date.toISOString(),
    siteName: report.siteName,
    siteNameAr: report.siteNameAr ?? undefined,
    category: report.category,
    status: report.status,
    notes: report.notes ?? undefined,
    notesAr: report.notesAr ?? undefined,
    assessmentScores: report.assessmentScores ?? undefined,
    consultantId: report.consultantId ?? undefined,
    client: {
      id: report.client.id,
      companyName: report.client.companyName ?? undefined,
      user: report.client.user?.email ? { email: report.client.user.email } : undefined,
    },
    consultant: report.consultant?.name ? { name: report.consultant.name } : undefined,
    observations: report.observations.map(mapObservation),
  }))

  return {
    items,
    pageInfo: {
      hasMore,
      nextCursor: hasMore && last ? encodeCursor([last.date.toISOString(), last.id], hash) : null,
      limit,
      ...(options.withTotal ? { total: await prisma.report.count({ where }) } : {}),
    },
  }
}
```

Key points:
- `take: limit + 1` is the “has more” probe.
- `cursor: { id }` is valid because `id` is unique. Prisma uses the cursor row's `date` and `id` values with the compound `orderBy`.
- `riskLevels` becomes a SQL `EXISTS` through the relation filter, not a JavaScript `filter()`.
- Observations and images are loaded only for the page.
- `withTotal` is opt-in; it runs one `count()` with the same `where`.
- `mapObservation` maps the three corrective fields and the images; it must not sign URLs here. The route layer enriches image rows with signed URLs (Section 8.5).

`getReportRecordById`:

```ts
export async function getReportRecordById(id: string) {
  return prisma.report.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, companyName: true, user: { select: { email: true } } } },
      consultant: { select: { name: true } },
      observations: {
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        include: { images: true },
      },
    },
  })
}
```

`createReportRecord`:

```ts
export async function createReportRecord(input: CreateReportInput) {
  const report = await prisma.report.create({
    data: {
      clientId: input.clientId,
      date: new Date(input.date),
      siteName: input.siteName,
      siteNameAr: input.siteNameAr,
      category: input.category,
      consultantId: input.consultantId,
      notes: input.notes,
      notesAr: input.notesAr,
      status: input.status ?? 'OPEN',
      assessmentScores: input.assessmentScores ?? undefined,
    },
  })

  return report.id
}
```

`updateReportRecord` uses `prisma.report.update({ where: { id }, data })` with only the provided fields. `deleteReportRecord` uses `prisma.report.delete({ where: { id } })`.

**Delete `backfillMissingReportConsultantIds` from this module.** The one-time script:

```ts
// scripts/backfill-report-consultants.ts
import { prisma } from '@/lib/prisma'

const dryRun = process.argv.includes('--dry-run')
const consultantId = process.env.BACKFILL_CONSULTANT_ID
if (!consultantId) throw new Error('BACKFILL_CONSULTANT_ID is required')

const where = {
  OR: [{ consultantId: null }, { consultantId: '' }],
}

const count = await prisma.report.count({ where })
console.log(`${dryRun ? '[dry-run] ' : ''}Reports to update: ${count}`)

if (!dryRun) {
  const result = await prisma.report.updateMany({ where, data: { consultantId } })
  console.log(`Updated: ${result.count}`)
}
```

Run it once with the intended consultant ID, after exporting the affected IDs for review:

```sql
SELECT id, "siteName", "date", "clientId"
FROM "Report"
WHERE "consultantId" IS NULL OR "consultantId" = ''
ORDER BY "date" DESC;
```

### 9.2 `lib/observation-records.ts`

Add exact schemas to `lib/validation.ts`:

```ts
import { z } from 'zod'

export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export const OBSERVATION_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const
export const CORRECTIVE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'] as const

const boundedText = (max: number) => z.string().trim().max(max)

export const observationCreateSchema = z
  .object({
    reportId: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    titleAr: boundedText(200).optional(),
    description: boundedText(10_000).optional(),
    descriptionAr: boundedText(10_000).optional(),
    riskLevel: z.enum(RISK_LEVELS),
    status: z.enum(OBSERVATION_STATUSES).optional(),
    sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
  })
  .strict()

export const observationUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    titleAr: boundedText(200).optional(),
    description: boundedText(10_000).optional(),
    descriptionAr: boundedText(10_000).optional(),
    riskLevel: z.enum(RISK_LEVELS).optional(),
    status: z.enum(OBSERVATION_STATUSES).optional(),
    sortOrder: z.coerce.number().int().min(0).max(1_000_000).optional(),
    clientResponse: boundedText(10_000).optional(),
    correctiveAction: boundedText(10_000).optional(),
    correctiveActionStatus: z.enum(CORRECTIVE_STATUSES).optional(),
  })
  .strict()

export const clientObservationUpdateSchema = z
  .object({
    clientResponse: boundedText(10_000).optional(),
    correctiveAction: boundedText(10_000).optional(),
    correctiveActionStatus: z.enum(CORRECTIVE_STATUSES).optional(),
  })
  .strict()
```

If legacy rows contain statuses outside these enums, widen the enum for one release or normalize the data first. Do not silently coerce unknown values to `OPEN`.

Replace the module:

```ts
import { prisma } from '@/lib/prisma'
import type { z } from 'zod'
import type { observationCreateSchema, observationUpdateSchema } from '@/lib/validation'

type ObservationCreate = z.infer<typeof observationCreateSchema>
type ObservationUpdate = z.infer<typeof observationUpdateSchema>

export async function createObservationRecord(input: ObservationCreate) {
  const observation = await prisma.observation.create({
    data: {
      reportId: input.reportId,
      title: input.title,
      titleAr: input.titleAr,
      description: input.description,
      descriptionAr: input.descriptionAr,
      riskLevel: input.riskLevel,
      status: input.status ?? 'OPEN',
      sortOrder: input.sortOrder ?? 0,
    },
  })

  return observation.id
}

export async function updateObservationRecord(id: string, input: ObservationUpdate) {
  await prisma.observation.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.titleAr !== undefined ? { titleAr: input.titleAr } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.descriptionAr !== undefined ? { descriptionAr: input.descriptionAr } : {}),
      ...(input.riskLevel !== undefined ? { riskLevel: input.riskLevel } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.clientResponse !== undefined ? { clientResponse: input.clientResponse } : {}),
      ...(input.correctiveAction !== undefined ? { correctiveAction: input.correctiveAction } : {}),
      ...(input.correctiveActionStatus !== undefined ? { correctiveActionStatus: input.correctiveActionStatus } : {}),
    },
  })
}

export async function deleteObservationRecord(id: string) {
  await prisma.observation.delete({ where: { id } })
}
```

Route changes:
- `POST /api/observations`: `const parsed = observationCreateSchema.safeParse(body); if (!parsed.success) return 400;` then pass `parsed.data`.
- `PUT /api/observations/[id]`: admin uses `observationUpdateSchema`; client uses `clientObservationUpdateSchema`.
- Replace the client ownership check (`listReportRecords({ clientId })` then `some(...)`) with a direct query:
  ```ts
  const owned = await prisma.observation.findFirst({
    where: { id, report: { clientId } },
    select: { id: true },
  })
  if (!owned) return 403
  ```
  This avoids loading every report in the client account to authorize one observation.
- `DELETE`: admin only; `prisma.observation.delete`.
- Do not return `error.message`; use the error helper.

### 9.3 `lib/training-records.ts`

Remove `createTrainingTables`, `seedDefaultTrainingContent`, `ensureTrainingTables`, `ensurePromise`, `sqlValue`, `numberValue`, and every unsafe call.

Representative replacements:

```ts
export async function listPublishedTrainingCourses() {
  return prisma.trainingCourse.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: { _count: { select: { questions: true, enrollments: true } } },
  })
}

export async function getTrainingCourseBySlug(slug: string) {
  return prisma.trainingCourse.findUnique({
    where: { slug },
    include: {
      questions: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] },
    },
  })
}

export async function ensureTrainingEnrollment(userId: string, courseId: string) {
  return prisma.trainingEnrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId, status: 'IN_PROGRESS' },
    update: {},
  })
}

export async function recordTrainingAttempt(input: {
  userId: string
  courseId: string
  score: number
  passed: boolean
  answers: Record<string, string>
}) {
  return prisma.trainingAttempt.create({
    data: {
      userId: input.userId,
      courseId: input.courseId,
      score: input.score,
      passed: input.passed,
      answers: input.answers,
    },
  })
}
```

For the certificate and admin enrollment lists, use `findUnique`/`findMany` with `include` and cursor pagination. The `answers` column is `Json`; pass the object directly, not `JSON.stringify`.

`prisma/seed-training.ts`:
- Read the existing course by `slug`.
- If it exists, update the course metadata and leave questions alone unless `--force` is passed.
- If it does not exist, create the course and its questions in a transaction.
- Do not delete user-created courses.
- Run manually: `npm run db:seed:training`.

### 9.4 `lib/client-records.ts`, `lib/image-records.ts`, `lib/activity-log-records.ts`

**Clients:**

```ts
export async function listClientAccounts(options: { limit?: number; cursor?: string } = {}) {
  const limit = clampLimit(options.limit)
  const rows = await prisma.client.findMany({
    select: {
      id: true,
      companyName: true,
      companyNameAr: true,
      phone: true,
      address: true,
      contactInfo: true,
      logoBucket: true,
      logoPath: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, role: true } },
      _count: { select: { reports: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: decodeCursor(options.cursor, 'clients')[1] }, skip: 1 } : {}),
  })

  return rows.map((row) => ({
    id: row.id,
    companyName: row.companyName,
    companyNameAr: row.companyNameAr ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    logo: row.logoPath ? { bucket: row.logoBucket, path: row.logoPath } : undefined,
    settings: parseContactInfo(row.contactInfo),
    userId: row.user.id,
    userName: row.user.name,
    userEmail: row.user.email,
    userRole: row.user.role,
    _count: { reports: row._count.reports },
  }))
}
```

`parseContactInfo` must never return the legacy `logoDataUrl` in a list response. It returns `{ showProfile, hasLegacyLogo }`; the route signs `logoPath` if present, or serves the legacy data URL from a dedicated endpoint. Do not echo the raw JSON.

`getClientAccountById` and `createClientAccount` use `findUnique`/`create` with the same select. `updateClientContactInfo` becomes `updateClientSettings(clientId, { showProfile })` and writes a JSON object without `logoDataUrl` once the logo is migrated.

**Images:**

```ts
export async function createImageRecord(input: {
  observationId: string
  type: string
  bucket: string
  path: string
  originalName?: string
  mimeType?: string
  size?: number
}) {
  return prisma.image.create({
    data: {
      observationId: input.observationId,
      type: input.type,
      url: `supabase://${input.bucket}/${input.path}`,
      storageBucket: input.bucket,
      storagePath: input.path,
      originalName: input.originalName,
      mimeType: input.mimeType,
      size: input.size,
    },
  })
}
```

**Activity log:**

```ts
export async function listActivityLogRecords(options: { limit?: number; cursor?: string } = {}) {
  const limit = clampLimit(options.limit)
  const rows = await prisma.activityLog.findMany({
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      details: true,
      ipAddress: true,
      createdAt: true,
      user: { select: { name: true, email: true, role: true } },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: decodeCursor(options.cursor, 'activity-log')[1] }, skip: 1 } : {}),
  })

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    user: row.user
      ? { name: row.user.name || 'Unknown User', email: row.user.email || '-', role: row.user.role || '-' }
      : { name: 'Unknown User', email: '-', role: '-' },
  }))
}
```

`createActivityLogRecord` uses `prisma.activityLog.create`. The module no longer needs `randomUUID`, `Prisma.sql`, or the schema resolver.

### 9.5 Error handling and correlation IDs

Create `lib/api-error.ts`:

```ts
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
  }
}

export function jsonError(error: unknown, correlationId: string) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, correlationId, details: error.details } },
      { status: error.status, headers: { 'x-correlation-id': correlationId } }
    )
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid request', correlationId, details: error.flatten() } },
      { status: 400, headers: { 'x-correlation-id': correlationId } }
    )
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'A record with this value already exists', correlationId } },
        { status: 409, headers: { 'x-correlation-id': correlationId } }
      )
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Record not found', correlationId } },
        { status: 404, headers: { 'x-correlation-id': correlationId } }
      )
    }
  }

  console.error(JSON.stringify({ level: 'error', correlationId, error: serializeError(error) }))
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', correlationId } },
    { status: 500, headers: { 'x-correlation-id': correlationId } }
  )
}
```

Every route:
```ts
const correlationId = crypto.randomUUID()
try {
  ...
} catch (error) {
  return jsonError(error, correlationId)
}
```

Do not return `error.message` for unknown errors, and do not include SQL, table names, or connection strings in the response.

---

## 10. Pagination contract

### 10.1 Request and response

All collection endpoints use the same contract.

Request:
```
GET /api/reports?limit=25&cursor=<opaque>&status=OPEN&riskLevel=HIGH,CRITICAL&dateFrom=2026-01-01&dateTo=2026-12-31
```

| Parameter | Type | Rules |
|---|---|---|
| `limit` | integer | Default 25; minimum 1; maximum 100; non-numeric → 400 `INVALID_LIMIT` |
| `cursor` | string | Opaque; max 512 chars; invalid/tampered → 400 `INVALID_CURSOR`; filter mismatch → 400 `CURSOR_FILTER_MISMATCH` |
| filters | endpoint-specific | Validated with Zod; unknown params rejected with 400 `UNKNOWN_FILTER` |
| `withTotal` | `1` or absent | Optional; only admin endpoints; adds `pageInfo.total` |

Response:
```json
{
  "items": [],
  "pageInfo": {
    "nextCursor": "eyJ2IjoxLCJrIjpbIjIwMjYtMTAtMjciLCJiMTlkLi4uIl0sImYiOiI3YzJhIn0.2f9c...",
    "hasMore": false,
    "limit": 25
  }
}
```

Rules:
- `items` is always an array, even when empty.
- `nextCursor` is `null` when `hasMore` is false.
- `hasMore` is computed by fetching `limit + 1` rows and slicing.
- The order is deterministic and always includes `id` as the final tiebreaker.
- No `offset` parameter. A client that needs page numbers keeps a cursor stack; this preserves performance at 100k+ rows.
- `Cache-Control: private, no-store` for authenticated lists. Public lists can use `s-maxage=60, stale-while-revalidate=300` if the data is not tenant-specific.
- Errors use the envelope from Section 9.5, not the list envelope.

### 10.2 Cursor codec

Create `lib/pagination.ts`:

```ts
import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { ApiError } from '@/lib/api-error'

type CursorPayload = {
  v: 1
  k: string[]
  f: string
}

export function clampLimit(value?: number | string | null) {
  if (value === undefined || value === null || value === '') return 25
  const parsed = typeof value === 'string' ? Number(value) : value
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new ApiError(400, 'INVALID_LIMIT', 'limit must be an integer between 1 and 100')
  }
  return parsed
}

export function filterHash(endpoint: string, filters: Record<string, unknown>) {
  return createHash('sha256')
    .update(JSON.stringify({ endpoint, filters }))
    .digest('base64url')
    .slice(0, 16)
}

export function encodeCursor(key: string[], filter: string) {
  const payload = Buffer.from(JSON.stringify({ v: 1, k: key, f: filter } satisfies CursorPayload)).toString('base64url')
  const signature = createHmac('sha256', process.env.CURSOR_SECRET!)
    .update(payload)
    .digest('base64url')
    .slice(0, 22)

  return `${payload}.${signature}`
}

export function decodeCursor(cursor: string, filter: string): string[] {
  const [payload, signature] = cursor.split('.')
  if (!payload || !signature || cursor.length > 512) {
    throw new ApiError(400, 'INVALID_CURSOR', 'cursor is invalid')
  }

  const expected = createHmac('sha256', process.env.CURSOR_SECRET!)
    .update(payload)
    .digest('base64url')
    .slice(0, 22)

  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new ApiError(400, 'INVALID_CURSOR', 'cursor is invalid')
  }

  let parsed: CursorPayload
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    throw new ApiError(400, 'INVALID_CURSOR', 'cursor is invalid')
  }

  if (parsed.v !== 1 || parsed.f !== filter || !Array.isArray(parsed.k) || parsed.k.length === 0) {
    throw new ApiError(400, 'CURSOR_FILTER_MISMATCH', 'cursor does not match the current filters')
  }

  return parsed.k
}
```

Notes:
- The HMAC prevents tampering. It is not encryption; the cursor contains only a timestamp and a UUID.
- The filter hash prevents a cursor from one query being used with another (which would produce nonsensical pages).
- `CURSOR_SECRET` must be stable across deploys and instances. Rotating it invalidates in-flight cursors; clients simply restart from the first page.
- Cursors do not expire. A long-lived cursor can skip rows that were inserted before its position; this is normal keyset behavior. Document it.

### 10.3 Endpoint mapping

| Endpoint | Order | Cursor key | Default / max | Server-side filters |
|---|---|---|---|---|
| `GET /api/reports` | `date desc, id desc` | `[date, id]` | 25 / 100 | `status`, `category`, `dateFrom`, `dateTo`, `riskLevel` (comma list), `clientId` (admin only) |
| `GET /api/job-applications` | `createdAt desc, id desc` | `[createdAt, id]` | 25 / 100 | `status`, `jobOpeningId`, `search` (name/email) |
| `GET /api/knowledge-bank?clientId=` | `createdAt desc, id desc` | `[createdAt, id]` | 50 / 100 | `folderId`, `category`, `search` |
| `GET /api/client-documents` | `createdAt desc, id desc` | `[createdAt, id]` | 50 / 100 | `folderId`, `category`, `search` |
| `GET /api/clients` | `createdAt desc, id desc` | `[createdAt, id]` | 25 / 100 | `search` (company/user), `hasReports` |
| `GET /api/activity-log` | `createdAt desc, id desc` | `[createdAt, id]` | 50 / 100 | `userId`, `action`, `entityType`, `dateFrom`, `dateTo` |
| `GET /api/admin/training` | `createdAt desc, id desc` | `[createdAt, id]` | 25 / 100 | `courseId`, `status`, `search` |
| `GET /api/contact` | `createdAt desc, id desc` | `[createdAt, id]` | 25 / 100 | `status`, `search` |
| `GET /api/jobs` | `sortOrder asc, createdAt desc, id` | `[sortOrder, createdAt, id]` | 20 / 100 | `status`, `isPublished`, `department` |
| `GET /api/training/courses` | `sortOrder asc, id` | `[sortOrder, id]` | 20 / 100 | `category`, `isPublished` |

The `search` filter uses `contains` with `mode: 'insensitive'` today. At scale, add a `pg_trgm` GIN index on the searched columns and switch to a trigram query. Do not add `%term%` scans on 100k rows without an index.

### 10.4 Filter semantics

- **Risk level:** `riskLevel=HIGH,CRITICAL` becomes:
  ```ts
  where: {
    observations: {
      some: { riskLevel: { in: ['HIGH', 'CRITICAL'] } },
    },
  }
  ```
  This is an SQL `EXISTS` and uses `Observation_reportId_riskLevel_idx`. It does not load observations to filter in JS.
- **Date range:** validate with `z.coerce.date()`; reject invalid dates with 400 instead of throwing `RangeError` in `new Date(...).toISOString()`.
- **Client scoping:** for `CLIENT`, the route sets `clientId` from the session and ignores any `clientId` query parameter. For `ADMIN`, `clientId` is optional and validated as a UUID.
- **Status/category:** validate against the known enum or a max-length string. Do not pass arbitrary text into a `LIKE` without escaping `%` and `_` if `contains` is used; Prisma parameterizes the value, so this is safe, but the query plan still matters.
- **Unknown parameters:** reject with 400. Silent ignore hides client bugs and lets an attacker probe.

### 10.5 Compatibility and rollout

This is a breaking response-shape change. Do not ship a dual-shape endpoint that returns an array for some callers and an envelope for others; that is how clients silently break.

1. Update the server routes and all in-repo consumers in the same pull request.
2. Consumers to update:
   - `app/admin/admin-reports.tsx:173`
   - `app/admin/admin-jobs.tsx:184`
   - `app/admin/admin-clients.tsx:100`
   - `app/admin/admin-knowledge-bank-panel.tsx:47`
   - `app/admin/admin-knowledge-bank-workspace.tsx:25`
   - `app/admin/admin-knowledge-bank-explorer.tsx:43`
   - `app/dashboard/client-dashboard.tsx:165,185`
   - Any `fetch('/api/contact')` or `fetch('/api/admin/training')` consumer found by `grep`.
3. If an external integration consumes the old array, add `/api/v2/...` aliases with the envelope and keep the old route for one release with `Deprecation: true` and `Sunset` headers. Do not keep the old route indefinitely.
4. Add contract tests that assert the envelope and the absence of `resumeUrl`/`data:` in list responses.
5. Add a UI “Load more” control driven by `pageInfo.nextCursor`; do not auto-fetch all pages.

### 10.6 Pagination tests

- Create 120 reports with distinct dates and IDs. Traverse pages of 25; assert 120 unique IDs, no duplicates, no gaps.
- Insert a new report between page fetches; assert the cursor does not return duplicates and may skip the new row (documented keyset behavior).
- Send a cursor from `status=OPEN` with `status=CLOSED`; assert 400 `CURSOR_FILTER_MISMATCH`.
- Tamper with one character of the cursor; assert 400 `INVALID_CURSOR`.
- Send `limit=0`, `limit=101`, `limit=abc`; assert 400.
- Send `riskLevel=HIGH,CRITICAL`; assert the SQL plan uses `Observation_reportId_riskLevel_idx` and the response contains only reports with at least one matching observation.
- Send a `CLIENT` session with `clientId=<other>`; assert the other client's data is not returned.

---

## 11. Index plan and verification

Section 7.3 contains the exact SQL. This section explains why each index exists and how to prove it is used.

| Query shape | Index | Expected plan |
|---|---|---|
| Admin report list: `WHERE clientId = ? ORDER BY date DESC, id DESC LIMIT 26` | `Report_clientId_date_id_idx` | `Limit → Index Scan` |
| Global report list: `ORDER BY date DESC, id DESC LIMIT 26` | `Report_date_id_idx` | `Limit → Index Scan` |
| Report list filtered by status | `Report_status_date_id_idx` | `Index Scan` with status equality, then order |
| Report list filtered by consultant | `Report_consultantId_idx` | `Bitmap Index Scan` or `Index Scan` |
| Risk filter: `EXISTS (SELECT 1 FROM Observation WHERE reportId = r.id AND riskLevel IN (...))` | `Observation_reportId_riskLevel_idx` | `Nested Loop Semi Join` with index-only scan |
| Observations for a report: `WHERE reportId = ? ORDER BY sortOrder, id` | `Observation_reportId_sortOrder_id_idx` | `Index Scan` |
| Images for an observation: `WHERE observationId = ? ORDER BY createdAt` | `Image_observationId_createdAt_idx` | `Index Scan` |
| Client document library: `WHERE clientId = ? ORDER BY createdAt DESC, id DESC` | `ClientDocument_clientId_createdAt_id_idx` | `Index Scan` |
| Folder view: `WHERE clientId = ? AND folderId = ? ORDER BY createdAt DESC` | `ClientDocument_clientId_folderId_createdAt_idx` | `Index Scan` |
| Client list: `ORDER BY createdAt DESC, id DESC` | `Client_createdAt_id_idx` | `Index Scan` |
| Activity log: `ORDER BY createdAt DESC, id DESC` | `ActivityLog_createdAt_id_idx` | `Index Scan` |
| Activity log per user | `ActivityLog_userId_createdAt_idx` | `Index Scan` |
| Job applications by status | `JobApplication_status_createdAt_id_idx` | `Index Scan` |
| Job applications by opening | `JobApplication_jobOpeningId_createdAt_idx` | `Index Scan` |
| Contact requests by status | `ContactRequest_status_createdAt_id_idx` | `Index Scan` |
| Published job openings | `JobOpening_status_isPublished_sortOrder_idx` or `JobOpening_isPublished_sortOrder_idx` | `Index Scan` |
| Training questions for a course | `TrainingQuestion_courseId_sortOrder_id_idx` | `Index Scan` |
| Course roster | `TrainingEnrollment_courseId_createdAt_idx` | `Index Scan` |

Rules:
- Run `ANALYZE` on the affected tables after the migration and after the backfill.
- Verify with `EXPLAIN (ANALYZE, BUFFERS)` on staging with production-like row counts, not on an empty database.
- Track `idx_scan` for two weeks. An index with zero scans and a large size is a candidate for removal, but only after the query that was supposed to use it is confirmed to be deployed.
- Do not add indexes “just in case”. Each index adds write amplification and cache pressure. The table above is the minimum set for the known queries.
- If a table is large (millions of rows), build with `CONCURRENTLY` (Section 7.7) and monitor `pg_stat_activity` and `pg_locks`.
- If an index build fails and leaves an `INVALID` index, drop it before retrying. `CREATE INDEX CONCURRENTLY IF NOT EXISTS` will see the invalid index and do nothing, leaving the table unindexed.

---

## 12. Security hardening coupled to this work

### 12.1 SQL injection

The immediate fix is in Section 9.2. The systemic fix is:
- Ban `$queryRawUnsafe` and `$executeRawUnsafe` in `lib/` and `app/api/`. Add an ESLint rule or a CI grep that fails the build on either token.
- If a raw query is unavoidable, require `Prisma.sql` with bound parameters and a comment explaining why Prisma Client cannot express it.
- Add a test that sends injection payloads to every text and numeric field in the observation, report, client, and job-application routes.
- Review any future `orderBy`, `sort`, `limit`, `offset`, table name, or column name that comes from a request. Whitelist it; never interpolate it.

Recommended CI check:

```bash
if grep -R "\$queryRawUnsafe\|\$executeRawUnsafe" lib app; then
  echo "Unsafe raw SQL is banned; use Prisma Client or Prisma.sql"
  exit 1
fi
```

### 12.2 Secrets

- Rotate the seeded admin password and any environment that used it.
- Remove bcrypt hashes and plaintext passwords from `prisma/seed.ts`.
- Move `SUPABASE_SERVICE_ROLE_KEY`, `CURSOR_SECRET`, and `CRON_SECRET` into the hosting secret store.
- Add secret scanning to CI (GitHub secret scanning or `gitleaks`).
- Never log `Authorization`, cookies, signed URLs, upload tokens, or service-role keys.
- Use separate Supabase projects (or at least separate buckets/prefixes) for staging and production so a staging service-role key cannot read production files.
- Rotate the service-role key after any suspected exposure. Existing signed URLs remain valid until expiry; revoke them by rotating the JWT secret if necessary.

### 12.3 Database roles and RLS

The runtime role should not own the tables and should not have DDL. Example (adapt to the Supabase project and pooler username):

```sql
-- Run as the database owner, not as the app role.
CREATE ROLE qhsse_app LOGIN PASSWORD '<strong-password>';

GRANT CONNECT ON DATABASE postgres TO qhsse_app;
GRANT USAGE ON SCHEMA public TO qhsse_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO qhsse_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO qhsse_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO qhsse_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO qhsse_app;

REVOKE CREATE ON SCHEMA public FROM qhsse_app;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
```

Then set `DATABASE_URL` to the `qhsse_app` user (through the pooler) and keep `DIRECT_URL` as the owner for migrations.

RLS:
- Enabling RLS without `FORCE ROW LEVEL SECURITY` does not affect the table owner. If `qhsse_app` is not the owner, RLS policies will apply to it; if it is the owner, they will not.
- Do not add policies until the app role is non-owner and every tenant-scoped query is known. A policy that reads `current_setting('app.client_id', true)` requires every request to run `SET LOCAL app.client_id` inside a transaction; a pooled connection can otherwise leak the setting to the next request.
- A safe pattern:
  ```ts
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.client_id', ${clientId}, true)`
    return tx.report.findMany({ where: { clientId } })
  })
  ```
  `set_config(..., true)` is transaction-local. Use it consistently or not at all.
- For admin routes, the admin needs a policy that allows all rows; that requires a second setting (`app.role`) or a separate role. This is why RLS is a phase 6 hardening item, not a quick fix.

### 12.4 Upload security

| Control | Requirement |
|---|---|
| Path traversal | Server-generated path; UUID-only segments; reject any client-supplied path |
| Authorization | Re-check parent ownership at intent creation and completion; do not trust `clientId` from the body |
| Content type | Detect from bytes; compare to declared; store detected type |
| Size | Enforce at intent creation, at bucket level, and after upload (`stat`) |
| Malware | Scan asynchronously; do not serve `INFECTED` or `PENDING` objects |
| Signed URLs | 15-minute TTL; no logging; `Cache-Control: private, no-store` on JSON |
| Downloads | `Content-Disposition: attachment` for documents and resumes; never inline HTML/SVG |
| CORS | Explicit origins; no `*` in production |
| Quota | Per client and per user; reject before creating the intent |
| Orphans | Cleanup job plus weekly reconciliation |
| Audit | Log intent ID, actor, kind, bucket, size, result; never the token or signed URL |

### 12.5 PII, retention, and deletion

- Resumes contain personal data (name, email, phone, employment history). Define a retention period (for example, 12 months after the role closes) and delete both the database row and the storage object. Do not rely on a bucket lifecycle rule that can delete an object still referenced by an active application.
- Client documents may contain confidential safety reports. Restrict access to the owning client and admins; log downloads.
- `ActivityLog.ipAddress` is personal data in some jurisdictions. Define retention and access controls; do not expose it in client-facing responses.
- Backups inherit the data. A deletion request must also cover backups according to the retention policy; document the window.
- Base64 data in `pg_dump` backups is especially costly to delete selectively. Moving to storage makes retention and deletion manageable.

### 12.6 Dependency and platform notes

- `@supabase/supabase-js` 2.110.7 supports signed upload URLs and `info`; verify the exact `info`/`createSignedUrls` signatures against the installed version before coding. If `info` is unavailable, use `list` with an exact `search` and read `metadata`.
- Prisma 5.22 supports `directUrl`, `migrate diff`, and `migrate resolve`. Do not upgrade Prisma in the same release as the baseline; isolate variables.
- Vercel's 4.5 MB request/response limit is the reason for direct-to-storage uploads. Confirm the limit for the current plan; if it changes, keep the direct upload design anyway because it removes the database and function from the binary path.
- If the project moves off Vercel, the signed-upload design still works; only the cron scheduler changes.

---

## 13. Ordered implementation plan

The estimate assumes one senior engineer familiar with the codebase, with staging access and a production snapshot. It can be parallelized after Phase 1: one engineer on the query layer, one on storage, one on UI.

| Phase | Outcome | Estimate | Depends on |
|---|---|---|---|
| 0 | Containment: SQL injection fixed, credentials rotated, snapshot taken | 0.5 day | None |
| 1 | Reproducible schema: baseline, lock, reconcile, staging/prod applied | 2–3 days | Phase 0 |
| 2 | No runtime DDL, no unsafe SQL, no schema introspection | 4–6 days | Phase 1 |
| 3 | Cursor pagination, server-side filters, indexes, UI updated | 3–4 days | Phase 1, Phase 2 |
| 4 | Supabase Storage upload/read flows; base64 writes stopped | 5–7 days | Phase 1 |
| 5 | Legacy base64 backfilled and verified | 2–4 days (mostly waiting) | Phase 4 |
| 6 | Contract cleanup, least-privilege role, observability, CI guardrails | 2–3 days | Phases 2–5 |

### Phase 0 — Containment (0.5 day)

**Actions:**
1. Take a full snapshot and verify a restore on a clone (Section 7.5, step 0).
2. Rotate the seeded admin password in every environment. Add `scripts/set-password.ts` (reads `TARGET_EMAIL` and `NEW_PASSWORD` from the environment, hashes with bcrypt cost 12, updates `User.password`, logs only the email). Do not put the password in shell history.
3. Disable or delete the demo client accounts until the seed is fixed; their hash is invalid anyway.
4. Remove the credential `console.log` lines from `prisma/seed.ts`.
5. Hotfix the `sortOrder` injection:
   - Add `observationCreateSchema` / `observationUpdateSchema` / `clientObservationUpdateSchema` to `lib/validation.ts`.
   - Use them in `app/api/observations/route.ts` and `app/api/observations/[id]/route.ts`.
   - Replace the raw insert/update in `lib/observation-records.ts` with Prisma, or at minimum bind `sortOrder` as a number.
6. Replace `error.message` responses in the touched routes with `jsonError`.
7. Record the current `_prisma_migrations` state and the output of the Section 14 queries.

**Files:** `prisma/seed.ts`, `lib/validation.ts`, `lib/observation-records.ts`, `app/api/observations/route.ts`, `app/api/observations/[id]/route.ts`, `lib/api-error.ts`, `scripts/set-password.ts`.

**Risk:** The hotfix changes authorization parsing. Test admin create/update, client corrective update, and the cross-client 403 case.

**Rollback:** Revert the app deploy. The database is unchanged in this phase.

**Acceptance:** Injection payload returns 400; valid numeric `sortOrder` persists as a number; old admin password fails; new password works; no credentials in logs.

### Phase 1 — Schema foundation (2–3 days)

**Actions:**
1. Apply the schema changes in Section 6.
2. Generate the baseline and `migration_lock.toml` (Section 7.1).
3. Add the reconcile migration (Section 7.2).
4. Rehearse on a restored production clone:
   - Run the Section 14 audit queries.
   - Apply the reconcile migration with `prisma db execute`.
   - `prisma migrate resolve --applied 20260713000000_baseline`.
   - `prisma migrate deploy`.
   - Run `prisma migrate diff --exit-code`.
5. Compare row counts and a checksum of the corrective-action values before and after.
6. Apply to production in a low-traffic window, with the snapshot verified.

**Files:** `prisma/schema.prisma`, `prisma/migrations/20260713000000_baseline/migration.sql`, `prisma/migrations/migration_lock.toml`, `prisma/migrations/20261027000000_reconcile_schema_drift/migration.sql`.

**Risk:**
- Marking the baseline applied when the live schema does not match it hides drift. Gate on the diff output described in Section 7.5.
- The `UploadIntent` foreign key can fail if `User` has orphan rows. Check before applying.
- `prisma migrate deploy` may try to run old migrations that were never recorded. They are idempotent, but test on the clone.

**Rollback:** Restore the snapshot. The expand columns are additive; the app can run against them without the new code.

**Acceptance:** `prisma migrate status` clean; fresh database builds from migrations; production corrective-action counts unchanged; `prisma migrate diff --exit-code` returns 0 except for the contract-phase items.

### Phase 2 — Remove runtime DDL and raw SQL (4–6 days)

**Actions:**
1. `lib/training-records.ts`:
   - Delete `createTrainingTables`, `seedDefaultTrainingContent`, `ensureTrainingTables`, `ensurePromise`, `sqlValue`, `numberValue`.
   - Replace every query with Prisma Client.
   - Move default content to `prisma/seed-training.ts`.
   - Remove all `ensureTrainingTables()` calls from the module and routes.
2. `lib/report-records.ts`: replace with the Prisma implementation in Section 9.1; delete the introspection and backfill function.
3. `lib/observation-records.ts`: replace with Section 9.2.
4. `lib/image-records.ts`: `prisma.image.create`.
5. `lib/client-records.ts`: Prisma selects; stop returning raw `contactInfo`.
6. `lib/activity-log-records.ts`: Prisma with cursor.
7. Add `scripts/backfill-report-consultants.ts`; run it once with the intended consultant ID.
8. Add the CI grep that bans unsafe raw SQL.

**Files:** the six `lib/*-records.ts` modules, `prisma/seed-training.ts`, `scripts/backfill-report-consultants.ts`, `.github/workflows/db-check.yml` (or the equivalent CI config), `package.json`.

**Risk:**
- The report response mapping is easy to get subtly wrong (dates, optional fields, observation order). Add snapshot tests against the old output for a fixed fixture set.
- Training seed content must match the current defaults; diff the seeded rows before and after.
- Removing `ensureTrainingTables` means a database that was never migrated will fail. Phase 1 must be complete first.

**Rollback:** Revert the app deploy. The database schema is unchanged; the old code still works against it.

**Acceptance:** no `$queryRawUnsafe`/`$executeRawUnsafe` in `lib/`; no `information_schema`; training pages work after a fresh `migrate deploy`; report JSON matches the old shape for fixtures; `GET /api/reports` performs no writes.

### Phase 3 — Pagination, filters, and indexes (3–4 days)

**Actions:**
1. Add `lib/pagination.ts` (Section 10.2).
2. Apply the index migration (Section 7.3), using `CONCURRENTLY` for large tables.
3. Change every list route to the envelope in Section 10.1.
4. Move `riskLevel` to the Prisma `some` filter.
5. Validate `dateFrom`/`dateTo` with Zod.
6. Update every in-repo consumer (Section 10.5).
7. Remove the `backfillMissingReportConsultantIds` call from `app/api/reports/route.ts`.
8. Add the contract tests in Section 10.6.

**Files:** `lib/pagination.ts`, list routes (`reports`, `job-applications`, `knowledge-bank`, `client-documents`, `clients`, `activity-log`, `admin/training`, `contact`, `jobs`, `training/courses`), UI consumers, index migration.

**Risk:**
- The envelope is a breaking change. Ship server and UI together; do not leave a mixed deployment.
- `CREATE INDEX` locks. Use concurrent builds or a maintenance window.
- Cursor ordering must match the index exactly, or PostgreSQL will sort. Test the plan.

**Rollback:** Revert the app deploy and the UI together. Keep the indexes; they are harmless. If an index causes a regression, drop it concurrently.

**Acceptance:** 120-row traversal test passes; responses contain no `data:` URLs; `riskLevel` uses the index; p95 for the first page < 200 ms on staging with 100k reports.

### Phase 4 — Supabase Storage (5–7 days)

**Actions:**
1. Create the four private buckets with the size/MIME limits from Section 8.2. Example SQL for Supabase:
   ```sql
   INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
   VALUES
     ('observation-evidence', 'observation-evidence', false, 8388608,
      ARRAY['image/jpeg','image/png','image/webp']),
     ('client-documents', 'client-documents', false, 10485760,
      ARRAY['application/pdf','application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg','image/png','image/webp']),
     ('resumes', 'resumes', false, 5242880,
      ARRAY['application/pdf','application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
     ('client-logos', 'client-logos', false, 1048576,
      ARRAY['image/png','image/jpeg','image/webp'])
   ON CONFLICT (id) DO UPDATE SET
     public = EXCLUDED.public,
     file_size_limit = EXCLUDED.file_size_limit,
     allowed_mime_types = EXCLUDED.allowed_mime_types;
   ```
2. Add the env vars from Section 8.1; fail the deployment if the production values are missing.
3. Implement `lib/storage/*` and `lib/uploads/*`.
4. Add the intent/complete routes and the file download routes.
5. Migrate the four upload paths:
   - Image: `app/api/upload/route.ts` → intent + complete; `lib/image-records.ts` creates the row on complete.
   - Document: `app/api/knowledge-bank/route.ts` and the three admin UI components → intent + complete.
   - Resume: `app/api/job-applications/route.ts` and `app/jobs/page.tsx` → intent, upload, then POST application with `intentId` + `completionToken`.
   - Logo: `app/api/client-profile/route.ts` and `components/ClientProfilePanel.tsx` → intent + complete.
6. Stop writing base64. In production, `STORAGE_DRIVER=disabled` returns 503; it never falls back.
7. Keep legacy reads working (`storagePath` null → `url` data URL).
8. Add `/api/health/storage` and the cleanup cron.

**Files:** `lib/storage/*`, `lib/uploads/*`, `app/api/uploads/*`, `app/api/files/*`, the four upload/detail routes, the corresponding UI components, `.env.example`, `.env.production.example`, `vercel.json`.

**Risk:**
- Service-role key leakage. Keep it server-only; review every import.
- CORS misconfiguration blocks direct uploads. Test from the production origin, not localhost.
- Signed URL expiry causes broken images after 15 minutes. The list should re-fetch on focus or the image route should redirect.
- Orphaned objects if `complete` is never called. The cleanup job is mandatory.
- Quota bypass through parallel intents. Enforce at intent creation and completion.

**Rollback:** Revert the app deploy. Legacy reads still work; new uploads return 503 until storage is restored. Do not re-enable base64 writes as a “temporary fix”; that recreates the problem and splits the data path.

**Acceptance:** an 8 MB image and a 5 MB resume upload through the signed flow; no `data:` URL is written; a client cannot read another client's object; an expired signed URL returns 403; cleanup removes an abandoned object; `GET /api/job-applications` does not contain a resume body.

### Phase 5 — Legacy base64 backfill (2–4 days)

**Actions:**
1. Run `scripts/migrate-base64-to-storage.ts --dry-run` for each kind.
2. Run images first in batches of 25; monitor DB WAL, storage errors, and duration.
3. Run documents, resumes, logos.
4. Run `--verify-only` and the reconciliation queries in Section 8.7.
5. Switch reads to prefer `storagePath` (already in Phase 4) and confirm zero legacy hits in logs for 7 days.
6. Keep the legacy values for 30 days; then run the contract cleanup.

**Files:** `scripts/migrate-base64-to-storage.ts`, `scripts/verify-storage.ts` (optional), read-path enrichment in the list routes.

**Risk:** Large WAL and I/O; a failed upload leaves the row unchanged; a partial update is worse than a retry. Use per-row transactions and idempotent skip.

**Rollback:** Stop the script. Rows already migrated have both the legacy value and the storage path only if the implementation keeps both; if it replaces `url` in the same transaction, restore the snapshot for the affected rows or re-encode from storage. This is why the script must verify the object before updating the row.

**Acceptance:** zero `data:` rows in the reconciliation query; a sample of 20 objects downloads with matching SHA-256; no increase in 5xx; storage usage matches the sum of `size`.

### Phase 6 — Contract cleanup and hardening (2–3 days)

**Actions:**
1. Run the contract migration (Section 7.4) after the gates:
   - `TrainingQuestion` corrective columns empty.
   - Timestamp rewrite scheduled in a maintenance window.
   - Redundant indexes have zero scans.
2. Harden the seed (`SEED_ADMIN_PASSWORD`, demo guard, no logs).
3. Create `qhsse_app`, switch `DATABASE_URL`, verify no DDL.
4. Add `/api/health/db`, structured logs, slow-query settings, and the SLO dashboard.
5. Add CI: `prisma validate`, `migrate diff --exit-code`, `migrate deploy` on an ephemeral DB, unsafe-SQL grep, secret scan.
6. Document the runbook: migrate, rollback, rotate keys, restore snapshot, storage cleanup.

**Files:** contract migration, `prisma/seed.ts`, `package.json`, `vercel.json`, health routes, CI config, `docs/database/runbook.md`.

**Risk:** Destructive DDL. Snapshot, rehearse, and gate every drop. Do not combine the contract migration with a feature release.

**Rollback:** Restore the snapshot. The contract phase is not reversible in place.

**Acceptance:** `prisma migrate diff --exit-code` returns 0; the runtime role cannot `CREATE TABLE`; `/api/health/db` and `/api/health/storage` are green; the seed is idempotent and secret-free; the runbook is tested by a second engineer.

### 13.1 Do-not-do list

- Do not run `prisma db push` against staging or production.
- Do not edit an applied migration. Add a corrective migration.
- Do not rename `createdat`/`createdAt` columns in place during this remediation.
- Do not drop `Image.url` or `ClientDocument.url` before the backfill is verified.
- Do not put `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_` variable or a client component.
- Do not return signed URLs in logs, error responses, or analytics.
- Do not run `prisma migrate deploy` in the Vercel build.
- Do not enable RLS policies without a non-owner app role and transaction-local settings.
- Do not ship the pagination envelope and the old array shape from the same endpoint.
- Do not delete storage objects before the database transaction commits.

---

## 14. Verification

Run these checks on a restored production clone before touching production, and again after each phase.

### 14.1 Migration state

```sql
SELECT migration_name,
       started_at,
       finished_at,
       rolled_back_at,
       applied_steps_count
FROM _prisma_migrations
ORDER BY started_at;
```

Expected after Phase 1: the baseline plus nine existing migrations plus the reconcile migration are recorded, with no `rolled_back_at` and `finished_at` set. If `_prisma_migrations` does not exist, the database was created with `db push` and the baseline-resolve sequence is mandatory.

### 14.2 Column verification

```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'Observation', 'TrainingQuestion', 'Image', 'ClientDocument',
    'JobApplication', 'Client', 'UploadIntent'
  )
ORDER BY table_name, ordinal_position;
```

Expected before the contract phase:
- `Observation` has `clientResponse`, `correctiveAction`, `correctiveActionStatus`.
- `TrainingQuestion` may still have the three columns (if `db push` ran); they must be empty.
- `Image` has `storageBucket`, `storagePath`.
- `ClientDocument` has `storageBucket`, `storagePath`.
- `JobApplication` has `resumeBucket`, `resumePath`, `resumeMimeType`, `resumeSize`.
- `Client` has `logoBucket`, `logoPath`, `logoMimeType`.
- `UploadIntent` has `userId`, `ownerKey`, `metadata`, `resultId`, `completeTokenHash`, `status`, `expiresAt`.

### 14.3 Index and constraint inventory

```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

SELECT conname, conrelid::regclass AS table_name, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY table_name::text, conname;
```

Check:
- Every table has a primary key.
- Every foreign key has a supporting index on the referencing column (the composite indexes in Section 11 satisfy this).
- No duplicate indexes on `User.email`, `Client.userId`, `TrainingEnrollment.userId`.
- `UploadIntent_userId_fkey` exists and allows `NULL` `userId`.

### 14.4 Base64 volume

```sql
WITH stats AS (
  SELECT 'Image' AS source,
         count(*) FILTER (WHERE "url" LIKE 'data:%') AS rows,
         coalesce(sum(octet_length("url")) FILTER (WHERE "url" LIKE 'data:%'), 0)::bigint AS bytes
  FROM "Image"
  UNION ALL
  SELECT 'ClientDocument',
         count(*) FILTER (WHERE "url" LIKE 'data:%'),
         coalesce(sum(octet_length("url")) FILTER (WHERE "url" LIKE 'data:%'), 0)::bigint
  FROM "ClientDocument"
  UNION ALL
  SELECT 'JobApplication',
         count(*) FILTER (WHERE "resumeUrl" LIKE 'data:%'),
         coalesce(sum(octet_length("resumeUrl")) FILTER (WHERE "resumeUrl" LIKE 'data:%'), 0)::bigint
  FROM "JobApplication"
  UNION ALL
  SELECT 'ClientLogo',
         count(*) FILTER (WHERE "contactInfo" LIKE '%logoDataUrl%'),
         coalesce(sum(octet_length("contactInfo")) FILTER (WHERE "contactInfo" LIKE '%logoDataUrl%'), 0)::bigint
  FROM "Client"
)
SELECT source, rows, pg_size_pretty(bytes) AS logical_size
FROM stats
ORDER BY bytes DESC;
```

This reports logical text size, not TOAST-compressed size. Use `pg_total_relation_size` for the table footprint and `pg_column_size` for a sample of rows if needed.

### 14.5 Orphan checks

```sql
SELECT 'Observation -> Report' AS relation, count(*) AS orphans
FROM "Observation" o
LEFT JOIN "Report" r ON r."id" = o."reportId"
WHERE r."id" IS NULL
UNION ALL
SELECT 'Image -> Observation', count(*)
FROM "Image" i
LEFT JOIN "Observation" o ON o."id" = i."observationId"
WHERE o."id" IS NULL
UNION ALL
SELECT 'Report -> Client', count(*)
FROM "Report" r
LEFT JOIN "Client" c ON c."id" = r."clientId"
WHERE c."id" IS NULL
UNION ALL
SELECT 'Client -> User', count(*)
FROM "Client" c
LEFT JOIN "User" u ON u."id" = c."userId"
WHERE u."id" IS NULL
UNION ALL
SELECT 'ClientDocument -> Client', count(*)
FROM "ClientDocument" d
LEFT JOIN "Client" c ON c."id" = d."clientId"
WHERE c."id" IS NULL
UNION ALL
SELECT 'ClientDocument -> Folder', count(*)
FROM "ClientDocument" d
LEFT JOIN "KnowledgeFolder" f ON f."id" = d."folderId"
WHERE d."folderId" IS NOT NULL AND f."id" IS NULL
UNION ALL
SELECT 'JobApplication -> JobOpening', count(*)
FROM "JobApplication" a
LEFT JOIN "JobOpening" j ON j."id" = a."jobOpeningId"
WHERE j."id" IS NULL
UNION ALL
SELECT 'TrainingQuestion -> Course', count(*)
FROM "TrainingQuestion" q
LEFT JOIN "TrainingCourse" c ON c."id" = q."courseId"
WHERE c."id" IS NULL
UNION ALL
SELECT 'TrainingEnrollment -> User', count(*)
FROM "TrainingEnrollment" e
LEFT JOIN "User" u ON u."id" = e."userId"
WHERE u."id" IS NULL
UNION ALL
SELECT 'TrainingEnrollment -> Course', count(*)
FROM "TrainingEnrollment" e
LEFT JOIN "TrainingCourse" c ON c."id" = e."courseId"
WHERE c."id" IS NULL
UNION ALL
SELECT 'TrainingAttempt -> User', count(*)
FROM "TrainingAttempt" a
LEFT JOIN "User" u ON u."id" = a."userId"
WHERE u."id" IS NULL
UNION ALL
SELECT 'TrainingAttempt -> Course', count(*)
FROM "TrainingAttempt" a
LEFT JOIN "TrainingCourse" c ON c."id" = a."courseId"
WHERE c."id" IS NULL;
```

Every count must be zero before adding or validating foreign keys.

### 14.6 Query plans

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT r."id", r."date", r."siteName"
FROM "Report" r
WHERE r."clientId" = '<uuid>'
ORDER BY r."date" DESC, r."id" DESC
LIMIT 26;
```

Expected: `Limit → Index Scan using "Report_clientId_date_id_idx"`, with `rows removed by filter` close to zero.

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT r."id", r."date"
FROM "Report" r
WHERE EXISTS (
  SELECT 1 FROM "Observation" o
  WHERE o."reportId" = r."id"
    AND o."riskLevel" IN ('HIGH', 'CRITICAL')
)
ORDER BY r."date" DESC, r."id" DESC
LIMIT 26;
```

Expected: a semi-join using `Observation_reportId_riskLevel_idx`, not a sequential scan of `Observation`.

### 14.7 Application checks

```bash
npx prisma validate
npx prisma migrate status
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --exit-code
npx tsc --noEmit
npm run lint
npm run build
```

Integration tests:
- Admin creates a report, adds an observation with a numeric `sortOrder`, uploads an image, and reads the report.
- Client updates only the corrective fields; a client attempt to change `title` or `sortOrder` returns 400/403.
- `sortOrder` injection payload returns 400 and does not delay the request.
- Report list with `riskLevel=HIGH,CRITICAL` returns only matching reports.
- Cursor traversal returns every row once.
- Job application: intent → upload → complete → application row with `resumePath`; list response has no `resumeUrl`.
- Knowledge document: intent → upload → complete; list returns a signed URL with `expiresAt`.
- Client logo: client uploads own logo; another client cannot complete the intent.
- Unauthenticated file route returns 401/403; cross-tenant file route returns 404 (not 403, to avoid existence leakage).
- Expired signed URL returns 403 from storage.

### 14.8 Load test

Seed a staging clone with at least:
- 100,000 reports
- 500,000 observations
- 1,000,000 image metadata rows (no binary)
- 50,000 job applications
- 200,000 activity log rows

Run 50 concurrent virtual users for 10 minutes against:
- `GET /api/reports?limit=25`
- `GET /api/reports?limit=25&riskLevel=HIGH,CRITICAL`
- `GET /api/job-applications?limit=25`
- `GET /api/knowledge-bank?clientId=<uuid>&limit=50`
- `GET /api/activity-log?limit=50`

Acceptance: p95 < 300 ms, p99 < 800 ms, error rate < 0.1%, no function out-of-memory, no statement timeout.

### 14.9 Storage checks

- `GET /api/health/storage` returns 200 with a real signed URL round trip (create, HEAD, delete a test object under a dedicated `healthcheck/` prefix).
- `GET /api/health/db` returns 200 and the expected migration count.
- The cleanup cron is idempotent: run it twice; the second run deletes zero objects.
- A signed URL for a deleted object returns 404/403, not a 500.
- No `data:` string appears in `GET /api/reports`, `GET /api/job-applications`, `GET /api/knowledge-bank`, `GET /api/client-documents`, or `GET /api/clients` responses.
- `pg_dump` size and WAL generation drop after the backfill.

---

## 15. File change matrix

“New” means create; “Modify” means edit. Paths are relative to the repository root.

### 15.1 Prisma, seed, and operations

| Phase | Type | Path | Purpose |
|---|---|---|---|
| 1 | Modify | `prisma/schema.prisma` | Observation/store fields, storage columns, UploadIntent, indexes |
| 1 | New | `prisma/migrations/20260713000000_baseline/migration.sql` | Full schema baseline |
| 1 | New | `prisma/migrations/migration_lock.toml` | Prisma provider lock |
| 1 | New | `prisma/migrations/20261027000000_reconcile_schema_drift/migration.sql` | Idempotent expand migration |
| 3 | New | `prisma/migrations/20261027000100_add_pagination_indexes/migration.sql` | Composite indexes |
| 6 | New | `prisma/migrations/20261101000000_contract_cleanup/migration.sql` | Drop misplaced columns, align timestamps, drop redundant indexes |
| 0/6 | Modify | `prisma/seed.ts` | Environment-based credentials, no logs |
| 2 | New | `prisma/seed-training.ts` | Explicit, idempotent training seed |
| 0 | New | `scripts/set-password.ts` | Safe admin password rotation |
| 2 | New | `scripts/backfill-report-consultants.ts` | One-time consultant backfill |
| 5 | New | `scripts/migrate-base64-to-storage.ts` | Batched legacy migration |
| 5 | New | `scripts/verify-storage.ts` | Hash/size verification (optional) |
| 1/14 | New | `scripts/audit/current-schema.sql` | Audit queries from Section 14 |
| 3 | New | `scripts/indexes-concurrent.sql` | Concurrent index builds |
| 0/2/6 | Modify | `package.json` | Migrate/seed scripts, remove or guard `db:push` |
| 4 | Modify | `vercel.json` | Storage cleanup cron only; never migrations |
| 4 | Modify | `.env.example` | Storage variables |
| 4 | Modify | `.env.production.example` | Server-only storage variables |

### 15.2 Data-access modules

| Phase | Type | Path | Purpose |
|---|---|---|---|
| 2 | Modify | `lib/report-records.ts` | Prisma, pagination, no introspection, no backfill |
| 0/2 | Modify | `lib/observation-records.ts` | Prisma, typed sortOrder, no injection |
| 2 | Modify | `lib/image-records.ts` | Prisma, storage metadata |
| 2 | Modify | `lib/client-records.ts` | Prisma, no raw contactInfo, signed logo |
| 2 | Modify | `lib/activity-log-records.ts` | Prisma, cursor |
| 2 | Modify | `lib/training-records.ts` | Prisma, remove DDL and seeding |
| 0 | Modify | `lib/validation.ts` | Observation schemas, document limits |
| 4 | Modify | `lib/file-validation.ts` | Document signatures, image limits |
| 0 | New | `lib/api-error.ts` | Stable error envelope and correlation IDs |
| 3 | New | `lib/pagination.ts` | Cursor codec and limit validation |
| 4 | New | `lib/storage/index.ts` | Storage provider interface and factory |
| 4 | New | `lib/storage/supabase.ts` | Supabase adapter |
| 4 | New | `lib/storage/errors.ts` | Typed storage errors |
| 4 | New | `lib/storage/paths.ts` | Server-side path builders |
| 4 | New | `lib/uploads/intents.ts` | Create/complete intent logic |
| 4 | New | `lib/uploads/cleanup.ts` | Expired intent and orphan cleanup |

### 15.3 API routes

| Phase | Type | Path | Purpose |
|---|---|---|---|
| 3 | Modify | `app/api/reports/route.ts` | Pagination, no GET backfill, error envelope |
| 3 | Modify | `app/api/reports/[id]/route.ts` | Prisma detail, signed image URLs |
| 3 | Modify | `app/api/job-applications/route.ts` | Pagination, no resume body, intent completion |
| 3/4 | Modify | `app/api/job-applications/[id]/route.ts` | Status updates, no resume body |
| 3/4 | Modify | `app/api/knowledge-bank/route.ts` | Pagination, intent completion, signed URLs |
| 3/4 | Modify | `app/api/client-documents/route.ts` | Pagination, signed URLs |
| 4 | Modify | `app/api/client-profile/route.ts` | Logo intent, signed logo URL |
| 3 | Modify | `app/api/clients/route.ts` | Pagination, no raw contactInfo |
| 3 | Modify | `app/api/clients/[id]/route.ts` | Prisma, signed logo |
| 3 | Modify | `app/api/activity-log/route.ts` | Cursor pagination |
| 3 | Modify | `app/api/admin/training/route.ts` | Cursor pagination |
| 3 | Modify | `app/api/contact/route.ts` | Cursor pagination |
| 3 | Modify | `app/api/jobs/route.ts` | Cursor pagination |
| 3 | Modify | `app/api/training/courses/route.ts` | Cursor pagination |
| 0/4 | Modify | `app/api/upload/route.ts` | Replace base64 with intent/complete |
| 4 | New | `app/api/uploads/intent/route.ts` | Create signed upload target |
| 4 | New | `app/api/uploads/complete/route.ts` | Verify object and create domain row |
| 4 | New | `app/api/files/observation-image/[id]/route.ts` | Authorized redirect to signed URL |
| 4 | New | `app/api/files/client-document/[id]/route.ts` | Authorized redirect |
| 4 | New | `app/api/files/resume/[id]/route.ts` | Admin-only redirect |
| 4 | New | `app/api/files/client-logo/[clientId]/route.ts` | Authorized redirect |
| 6 | New | `app/api/health/db/route.ts` | Migration and connectivity health |
| 4 | New | `app/api/health/storage/route.ts` | Storage configuration and round trip |
| 4 | New | `app/api/cron/storage-cleanup/route.ts` | Expired intent/orphan cleanup |

### 15.4 UI consumers

| Phase | Type | Path | Purpose |
|---|---|---|---|
| 3 | Modify | `app/admin/admin-reports.tsx` | Envelope, cursor, server-side risk filter |
| 3 | Modify | `app/admin/admin-jobs.tsx` | Envelope, cursor, no resume body |
| 3 | Modify | `app/admin/admin-clients.tsx` | Envelope, cursor, signed logo |
| 3/4 | Modify | `app/admin/admin-knowledge-bank-panel.tsx` | Envelope, intent upload |
| 3/4 | Modify | `app/admin/admin-knowledge-bank-workspace.tsx` | Envelope, intent upload |
| 3/4 | Modify | `app/admin/admin-knowledge-bank-explorer.tsx` | Envelope, intent upload |
| 3 | Modify | `app/admin/admin-knowledge-bank.tsx` | Pass pagination props if needed |
| 3 | Modify | `app/admin/admin-activity-log.tsx` | Cursor pagination |
| 3 | Modify | `app/admin/admin-contact-requests.tsx` | Cursor pagination |
| 3 | Modify | `app/admin/admin-training.tsx` | Cursor pagination |
| 3 | Modify | `app/dashboard/client-dashboard.tsx` | Envelope, cursor, signed files |
| 4 | Modify | `app/jobs/page.tsx` | Intent → signed upload → application |
| 4 | Modify | `components/ClientProfilePanel.tsx` | Logo intent upload |

### 15.5 CI and documentation

| Phase | Type | Path | Purpose |
|---|---|---|---|
| 6 | New | `.github/workflows/db-check.yml` | Validate, diff, migrate on ephemeral DB |
| 6 | New | `docs/database/runbook.md` | Migrate, rollback, rotate, restore |
| 6 | Modify | `next.config.js` | Only if `next/image` remote patterns are needed |
| 6 | New | `README.md` | Root readme does not exist today; add setup plus links to the runbook and migration workflow |

If the repository is not using GitHub Actions, put the same checks in the equivalent CI system; the commands are the contract, not the file path.

---

## 16. Open questions and assumptions

Confirm these before executing Phase 1. Each one can change the sequence or the SQL.

1. **What is in `_prisma_migrations` today?** If the nine migrations are recorded with checksums, the baseline resolve is straightforward. If the table is empty, `migrate deploy` will try to apply every migration after the baseline; they are idempotent, but the reconcile migration must be idempotent too (it is).
2. **Which role does `DATABASE_URL` use?** If it is the table owner (`postgres`), RLS is bypassed and the least-privilege role work is required before claiming tenant isolation. If it is a custom role, check its grants and whether the `REVOKE` migrations already broke something.
3. **How much base64 is actually stored?** Run Section 14.4. If the total is small (for example, < 500 MB), the storage migration is still correct, but the urgency of the backfill is lower. If it is multiple GB, schedule the backfill before the next backup window.
4. **Do any environments have `TrainingQuestion` corrective columns?** If `db push` ran against staging but not production, the contract migration must handle both cases (it does, with `IF EXISTS`).
5. **What is the Supabase plan and region?** Signed upload URLs, bucket size limits, and egress pricing depend on it. Confirm that the buckets are in the same region as the functions to avoid latency.
6. **What is the resume retention policy?** Legal/compliance may require deletion after a fixed period. The storage lifecycle and the cleanup job must implement it; a bucket rule alone is not enough because the DB row is the source of truth.
7. **Is malware scanning mandatory?** If the client handles safety-critical documents, assume yes. If not, document the accepted risk and add `scanStatus` later.
8. **Are there external consumers of the old array response or `resumeUrl`?** Search the repository and ask the team. If yes, add `/api/v2` aliases and a deprecation window; do not silently change the shape.
9. **Is there a maintenance window for the timestamp rewrite?** `ALTER TABLE ... TYPE TIMESTAMP(3)` rewrites each training table and takes an `ACCESS EXCLUSIVE` lock. It is safe but not instant.
10. **Does the Supabase pooler support a custom `qhsse_app` role?** Some pooler modes restrict usernames. Test the connection string before switching `DATABASE_URL`.
11. **Should `Report.consultantId` be nullable?** The schema allows null. The GET backfill currently fills nulls with the current admin, which is wrong. Decide whether unassigned reports are a valid state; if not, add a `NOT NULL` constraint after the one-time backfill, with a default of the creating admin.
12. **Is `Client.contactInfo` used for anything other than `showProfile` and `logoDataUrl`?** Parse every value before removing `logoDataUrl`; a hidden key would be lost if the object is rewritten blindly.
13. **Is Prisma 5.22 pinned for a reason?** Do not upgrade in the same release as the baseline. If an upgrade is planned, do it after the schema is stable and re-run the diff.

**Assumptions used in this report:**
- PostgreSQL 15+ on Supabase, with the `anon` and `authenticated` roles present.
- Vercel Functions with a ~4.5 MB request/response body limit.
- The application is the only writer to the database; no external service writes to these tables.
- The production data is worth preserving; no table is disposable.
- The team can tolerate a short read-only window for the timestamp rewrite, or can use a logical replica.

---

## Appendix A — Path builder and intent validation sketches

These are implementation sketches, not full files. They are included to remove ambiguity from the storage section.

```ts
// lib/storage/paths.ts
import { randomUUID } from 'crypto'

export type UploadKind = 'OBSERVATION_IMAGE' | 'CLIENT_DOCUMENT' | 'RESUME' | 'CLIENT_LOGO'

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
}

export function extensionFor(mimeType: string) {
  const extension = EXTENSION_BY_MIME[mimeType]
  if (!extension) throw new Error('UNSUPPORTED_MIME')
  return extension
}

export function buildStoragePath(input: {
  kind: UploadKind
  prefix: string
  clientId?: string
  reportId?: string
  observationId?: string
  folderId?: string | null
  jobOpeningId?: string
  intentId?: string
}) {
  const id = input.intentId ?? randomUUID()
  const extension = extensionFor(input.kind === 'RESUME' ? 'application/pdf' : 'image/jpeg')
  const env = input.prefix.replace(/[^a-z0-9-]/gi, '')

  switch (input.kind) {
    case 'OBSERVATION_IMAGE':
      return `${env}/clients/${input.clientId}/reports/${input.reportId}/observations/${input.observationId}/${id}.${extension}`
    case 'CLIENT_DOCUMENT':
      return `${env}/clients/${input.clientId}/folders/${input.folderId || 'root'}/${id}.${extension}`
    case 'RESUME':
      return `${env}/jobs/${input.jobOpeningId}/applications/${id}.${extension}`
    case 'CLIENT_LOGO':
      return `${env}/clients/${input.clientId}/logo/${id}.${extension}`
  }
}
```

The sketch above uses a placeholder extension for the `RESUME` case. In the real implementation, pass the detected MIME type into `buildStoragePath` and derive the extension from it. Do not default to PDF for a DOCX upload.

```ts
// lib/uploads/intents.ts (shape)
import { z } from 'zod'

const base = z.object({
  filename: z.string().trim().min(1).max(255),
  size: z.number().int().positive(),
  mimeType: z.string().min(1).max(120),
})

export const intentSchema = z.discriminatedUnion('kind', [
  base.extend({
    kind: z.literal('OBSERVATION_IMAGE'),
    clientId: z.string().uuid(),
    reportId: z.string().uuid(),
    observationId: z.string().uuid(),
    type: z.enum(['EVIDENCE', 'BEFORE', 'AFTER']).optional(),
  }),
  base.extend({
    kind: z.literal('CLIENT_DOCUMENT'),
    clientId: z.string().uuid(),
    folderId: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(1).max(180),
    category: z.string().trim().max(50).optional(),
  }),
  base.extend({
    kind: z.literal('RESUME'),
    jobOpeningId: z.string().uuid(),
    email: z.string().email(),
  }),
  base.extend({
    kind: z.literal('CLIENT_LOGO'),
    clientId: z.string().uuid(),
  }),
])
```

Completion transaction shape:

```ts
await prisma.$transaction(async (tx) => {
  const intent = await tx.uploadIntent.findUnique({ where: { id: intentId } })
  if (!intent || intent.status !== 'PENDING') throw new ApiError(409, 'INTENT_NOT_PENDING', 'Upload is not pending')
  if (intent.expiresAt < new Date()) throw new ApiError(410, 'INTENT_EXPIRED', 'Upload expired')

  // Verify the object outside the transaction before this point.
  // Create the domain row:
  const image = await tx.image.create({
    data: {
      observationId: intent.metadata.observationId,
      type: intent.metadata.type ?? 'EVIDENCE',
      url: `supabase://${intent.bucket}/${intent.path}`,
      storageBucket: intent.bucket,
      storagePath: intent.path,
      originalName: intent.originalName,
      mimeType: intent.mimeType,
      size: intent.expectedSize,
    },
  })

  await tx.uploadIntent.update({
    where: { id: intent.id },
    data: { status: 'COMPLETED', completedAt: new Date(), resultId: image.id },
  })

  return image
})
```

`metadata` is `Json`; cast it to a typed object after runtime validation. Do not trust its contents without re-checking the parent IDs.

## Appendix B — Release checklist

- [ ] Snapshot taken and restore verified on a clone.
- [ ] `prisma migrate status` clean on staging.
- [ ] `prisma migrate diff --exit-code` returns 0 (except contract-phase items).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` pass.
- [ ] `git grep` finds no `$queryRawUnsafe`, `$executeRawUnsafe`, `db push`, or `data:` writes in the changed paths.
- [ ] `git grep` finds no `SUPABASE_SERVICE_ROLE_KEY` in a client component or `NEXT_PUBLIC_` variable.
- [ ] Integration tests for reports, observations, uploads, and pagination pass.
- [ ] Smoke test: admin report list, client corrective update, image upload, document upload, resume upload, logo upload.
- [ ] `GET /api/health/db` and `GET /api/health/storage` return 200.
- [ ] Rollback owner and snapshot restore command are known.
- [ ] The release notes mention the migration, the storage change, and the pagination response shape.

---

*End of report.*






