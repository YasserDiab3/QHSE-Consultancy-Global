# Privacy & Compliance Audit — QHSSE Consultant Portal

| Field | Value |
|---|---|
| **Audit date** | 27 October 2026 |
| **Auditor** | Legal Compliance Checker (privacy/compliance subagent) |
| **Scope** | Public website, contact form, careers portal, trainee portal, client portal, visitor analytics, admin back office |
| **Mode** | Read-only static review of the repository. No runtime testing, database access, contract review, or penetration testing was performed. |
| **Classification** | Internal — Confidential |
| **Overall risk** | **HIGH** — remediation required before relying on the portal for regulated personal data |
| **Legal disclaimer** | This is a compliance assessment, not legal advice. Egyptian and UAE counsel should validate the conclusions and draft notices before publication. |

---

## 1. Executive summary

### 1.1 What the portal does

The portal is a Next.js application backed by PostgreSQL (Supabase). It collects and stores:

- website visitor analytics (persistent browser identifier, IP address, user-agent, country/region/city, page path, page views);
- contact enquiries (name, company, email, phone, free-text message);
- job applications (name, email, phone, current company, cover letter, CV/resume as a base64 `data:` URL);
- trainee accounts (name, email, phone, password hash, course attempts, scores, certificates);
- client accounts and client documents (company contacts, reports, observations, images, documents, financial records);
- administrative activity logs (actor, action, entity, details, IP address).

### 1.2 Overall assessment

The application has several good baseline controls: bcrypt password hashing (cost 12), Zod request validation, database-backed rate limiting, role checks on admin/client routes, `no-store` caching on sensitive APIs, security headers, magic-byte validation for uploads, and `.env` excluded from Git.

However, the portal is **not currently in a defensible privacy-compliance state**. The most serious gaps are:

1. **No privacy notice and no terms of service.** The footer links labelled “Privacy Policy” and “Terms of Service” are `href="#"` (`components/Footer.tsx:113-120`). There is no `/privacy`, `/terms`, or cookie notice page.
2. **Visitor tracking runs without consent or a demonstrated lawful basis.** `VisitorTracker` fires on every public page, writes a persistent `qhsse_visitor_key` to `localStorage`, and the API stores full IP address, full user-agent, city/region/country, path, and page views indefinitely (`components/VisitorTracker.tsx:6-50`, `app/api/visitors/track/route.ts:35-75`, `lib/visitor-tracking.ts:21-42`, `prisma/schema.prisma:173-190`).
3. **A production admin account can be created with a hard-coded password.** `prisma/seed.ts` contains the bcrypt hash for `admin123`, resets the admin password on every seed run, and prints the credentials (`prisma/seed.ts:6-22,221-223`). No MFA implementation was found.
4. **CVs and client documents are stored as base64 in the database and exposed in bulk.** Job applications are returned by `GET /api/job-applications` with the full `resumeUrl` data URL (`app/api/job-applications/route.ts:25-46,94-118`), and the admin UI renders it as a `data:` download link (`app/admin/admin-jobs.tsx:695-703`). There is no signed-URL access, download audit, or antivirus scan.
5. **There is no usable data-subject-rights (DSAR) mechanism.** No access/export endpoint, no erasure endpoint for contact enquiries or job applicants, and no deletion route for `JobApplication` or `ContactRequest` (only `PATCH` exists: `app/api/job-applications/[id]/route.ts:19-55`, `app/api/contact/[id]/route.ts:10-42`).
6. **No retention enforcement exists.** `VisitorSession`, `ContactRequest`, `JobApplication`, `ActivityLog`, and `RateLimitEntry` have no TTL, cron, or purge path. Data remains until a human deletes it.
7. **No processor/transfer documentation is present in the repository.** Supabase, the hosting provider, SMTP/email, Google OAuth, and any CDN are third-party processors, but there is no DPA register, sub-processor list, transfer impact assessment, or retention instruction in the codebase.
8. **Certificate codes leak into analytics.** The public certificate page is `/training/certificate/[code]`; `VisitorTracker` sends `usePathname()`, so the verification code (a semi-secret credential) is stored in `VisitorSession.lastPath` indefinitely (`app/training/certificate/[code]/page.tsx:28`, `components/VisitorTracker.tsx:39-47`).

### 1.3 Risk rating summary

| Severity | Count | Meaning |
|---|---:|---|
| Critical | 5 | Unlawful or unsafe processing; remediate immediately |
| High | 9 | Material regulatory or security exposure |
| Medium | 10 | Control weakness or scalability risk |
| Low | 4 | Hygiene / documentation |

Individual findings carry their own target dates; several are earlier than the category’s typical remediation window because they are quick, high-leverage fixes.

### 1.4 Top remediation sequence

1. Publish a real privacy policy, terms, and cookie/storage notice; fix footer links.
2. Replace visitor tracking with a consent-gated, minimised design; stop storing full IP, user-agent, city, and certificate codes.
3. Remove the seeded default admin password; add MFA and force credential rotation.
4. Add consent capture at every collection point (contact, jobs, registration) and a consent record.
5. Build DSAR intake, export, and erasure endpoints; add `DELETE` for contact enquiries and job applications.
6. Implement a retention cron and legal-hold flags.
7. Move files out of base64 database columns to private object storage with short-lived signed URLs and malware scanning.
8. Execute DPAs/SCCs with Supabase, hosting, email, Google, and any CDN; complete a transfer assessment.
9. Add breach response, ROPA, DPIA, and annual privacy training.

### 1.5 What is already good

- Passwords are bcrypt-hashed with cost 12 (`lib/auth-options.ts:64`, `app/api/auth/register/route.ts:34`).
- Request bodies are validated with Zod (`lib/validation.ts`).
- Rate limiting is database-backed and keyed by hashed IP + discriminator (`lib/rate-limit.ts:71-109`).
- Sensitive API responses set `Cache-Control: no-store` (visitors, jobs, contact, dashboard, client documents).
- Security headers include `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, and a CSP (`next.config.js:3-19`).
- Admin-only routes use `requireAdmin()`; client document access is scoped to the authenticated client (`app/api/client-documents/route.ts:9-23`).
- File uploads check magic bytes, not just extensions (`lib/file-validation.ts:27-52`).
- `.env` is git-ignored and was not found in tracked files.
- Client deletion cascades to reports/documents via Prisma relations (`prisma/schema.prisma:34,54,92,206,229,248,263,327,348`).

---

## 2. Scope, method, and limitations

### 2.1 Files inspected

| Area | Files |
|---|---|
| Visitor tracking | `components/VisitorTracker.tsx`, `app/api/visitors/track/route.ts`, `lib/visitor-tracking.ts`, `app/layout.tsx`, `prisma/schema.prisma` |
| Contact | `app/contact/page.tsx`, `app/api/contact/route.ts`, `app/api/contact/[id]/route.ts`, `app/admin/admin-contact-requests.tsx` |
| Careers | `app/jobs/page.tsx`, `app/api/job-applications/route.ts`, `app/api/job-applications/[id]/route.ts`, `app/api/jobs/route.ts`, `app/api/jobs/[id]/route.ts`, `app/admin/admin-jobs.tsx` |
| Client documents | `app/api/client-documents/route.ts`, `app/api/knowledge-bank/route.ts`, `app/api/clients/[id]/profile/route.ts`, `app/api/clients/[id]/route.ts`, `lib/validation.ts`, `lib/client-records.ts` |
| Trainees / certificates | `app/register/page.tsx`, `app/api/auth/register/route.ts`, `app/api/training/profile/route.ts`, `app/api/training/certificates/[code]/verify/route.ts`, `app/training/verify/page.tsx`, `app/training/certificate/[code]/page.tsx` |
| Security / infra | `next.config.js`, `lib/auth-options.ts`, `lib/rate-limit.ts`, `lib/email.ts`, `lib/activity-log.ts`, `.env.example`, `prisma/seed.ts` |
| UI / notices | `components/Footer.tsx`, `app/layout.tsx`, `context/language-context.tsx` |

### 2.2 Requested files that do not exist

- `app/api/visitors/route.ts` — the actual endpoint is `app/api/visitors/track/route.ts`.
- `lib/client-documents.ts` — no such file. Client-document logic is split across `app/api/client-documents/route.ts`, `app/api/knowledge-bank/route.ts`, `app/api/clients/[id]/profile/route.ts`, `lib/validation.ts`, and `lib/client-records.ts`.

### 2.3 Limitations

- No database was queried; actual row counts, retention age, and data content were not verified.
- No contracts, DPAs, sub-processor lists, insurance policies, or internal policies were available.
- No runtime, browser, or penetration testing was performed.
- Deployment region, backup configuration, SMTP provider, and whether Vercel/Cloudflare are used in production are inferred from configuration and headers; they must be confirmed.
- The Arabic drafts in `docs/legal/` are drafting aids. They must be reviewed by Egyptian/UAE counsel and must not be published until the controls they describe are actually implemented.

---

## 3. Likely operating regions and applicable frameworks

The registered address is in Cairo (`lib/contact-info.ts:5`), the contact email is on a Microsoft 365 domain, and seed/demo client addresses include Abu Dhabi and Dubai (`prisma/seed.ts:43,65`). The realistic operating footprint is **Egypt and the UAE**, with possible EU/UK visitors and clients. The compliance baseline should therefore cover:

| Region | Instrument | Why it likely applies | Practical consequences |
|---|---|---|---|
| **Egypt** | Personal Data Protection Law No. 151 of 2020 (“Egypt PDPL”) and its Executive Regulations (confirm current status) | Cairo HQ, Egyptian clients, Egyptian visitors, employees | Consent-centric regime; legitimate interest recognised subject to safeguards; transparency and rights; restrictions on transfer outside Egypt; possible notification/licensing obligations; Arabic-language notices expected |
| **UAE** | Federal Decree-Law No. 45 of 2021 on Personal Data Protection (“UAE PDPL”) | UAE clients and visitors; possible UAE operations | Consent/contract and other specified bases; transparency; rights; cross-border transfer safeguards; Arabic/English notices |
| **DIFC** | DIFC Data Protection Law No. 5 of 2020 | If serving DIFC-established clients | Separate regulator and transfer rules; verify whether any client data is DIFC-scoped |
| **ADGM** | ADGM Data Protection Regulations 2021 | If serving ADGM-established clients | Separate regulator and transfer rules |
| **EU/EEA** | GDPR (Regulation 2016/679) + ePrivacy Directive 2002/58/EC | EU visitors (monitoring), EU clients or applicants | Consent for non-essential storage/access; lawful basis; full rights; 72-hour breach notification; Chapter V transfer safeguards; possible Art. 27 representative |
| **UK** | UK GDPR + PECR | UK visitors or clients | Similar to GDPR; ICO oversight |

**Key point:** the portal is globally reachable. Even if the company has no EU establishment, GDPR can apply under Art. 3(2) where the site monitors the behaviour of EU data subjects (visitor analytics and geolocation are monitoring). A consent-gated, minimised analytics design is the safest cross-jurisdictional baseline.

---

## 4. Data map and roles

### 4.1 Processing activities

| # | Activity | Data subjects | Personal data | Storage | Primary purpose | Current notice/consent |
|---|---|---|---|---|---|---|
| 1 | Website analytics | Visitors | Random `visitorKey`, IP, user-agent, country/region/city, path, page views, timestamps | `VisitorSession` | Analytics / site improvement | None; automatic |
| 2 | Contact enquiries | Prospects, clients | Name, company, email, phone, message | `ContactRequest`; email provider | Respond to enquiry | None |
| 3 | Job applications | Applicants | Name, email, phone, current company, cover letter, CV file (base64), status | `JobApplication`; email provider | Recruitment | None |
| 4 | Trainee registration and training | Trainees | Name, email, phone, password hash, language, enrollments, attempts, scores, certificate | `User`, `TrainingEnrollment`, `TrainingAttempt` | Deliver training and certificates | None |
| 5 | Certificate verification | Trainees, verifiers | Name, course, score, issue date, certificate code | Public API (`/verify`) | Authenticate certificates | None |
| 6 | Client portal and documents | Client staff, client employees, site personnel | Company contacts, documents, reports, observations, images, financial records | `Client`, `ClientDocument`, `Report`, `Observation`, `Image`, `FinancialRecord` | Deliver consultancy services | None in portal; DPA status unknown |
| 7 | Admin/security logging | Staff, clients | Actor, action, entity, details, IP | `ActivityLog` | Security / audit | None |
| 8 | Rate limiting | Visitors, applicants, users | Hashed IP + email/ID, counters | `RateLimitEntry` | Abuse prevention | None |
| 9 | Transactional email | Prospects, applicants, trainees | Name, email, message content | SMTP provider | Service communications | None |
| 10 | Financial records | Clients | Company, amount, currency, status, due date, notes | `FinancialRecord` | Accounting / tax | None |

### 4.2 Controller / processor roles

| Context | QHSSE role | Counterparty role | Comment |
|---|---|---|---|
| Public website, contact form, careers, trainee accounts, own marketing | Controller | Data subject | QHSSE decides purposes and means. |
| Client portal documents, site reports, observations, images | Likely **processor** for client-provided content; controller for account/contact data | Client is controller for its documents and its employees’ data | A written Art. 28-style DPA is required with each client. The client is responsible for notifying its employees and having a lawful basis for health/safety/HR data. |
| Supabase, hosting, email, Google OAuth, CDN | Controller | Processor | DPAs and transfer safeguards required. |
| Accountant, lawyer, insurer | Controller | Separate controller or processor | Confirm role and confidentiality. |

**Risk:** the same database mixes controller data (contact enquiries, trainees) and client-controlled data (site reports, documents, possibly worker health data). This requires clear tenant scoping, access controls, and a DPA that defines instructions, deletion, and breach cooperation.

### 4.3 Third-party processors visible in configuration

| Processor | Service | Data | Location / transfer | Evidence | Status |
|---|---|---|---|---|---|
| **Supabase** | PostgreSQL hosting (and optional storage) | All database records, including CVs and client documents | Connection string placeholder `aws-0-region` (`.env.example:1-2`); actual region unknown | `DATABASE_URL`, `DIRECT_URL`, `@supabase/supabase-js` dependency; `lib/prisma.ts` pooler logic | DPA/region/SCC not evidenced |
| **Hosting/CDN** | Next.js hosting and edge | Request logs, IP, headers | Likely global edge; `vercel.json` present and Vercel headers read | `vercel.json`; `x-vercel-ip-*` in `lib/visitor-tracking.ts:24-29` | DPA/log retention not evidenced |
| **SMTP/email** | Transactional email | Name, email, message, application details | Provider-dependent; example points to Gmail (`.env.example:9-15`) | `lib/email.ts`; `SMTP_HOST` | Business DPA not evidenced; Gmail app-password SMTP is not a business-grade processor arrangement—confirm Google Workspace DPA or use a transactional provider |
| **Google** | OAuth sign-in (optional) | Name, email, profile identifier | Google Ireland/US; Google terms | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_SIGN_IN_ENABLED` (`.env.example:5-7`); `lib/auth-options.ts:83-90` | Google DPA/limited-use disclosure not evidenced |
| **Cloudflare (possible)** | CDN/WAF | IP, country header, security cookies | Global edge | `cf-ipcountry` read in `lib/visitor-tracking.ts:25` | DPA/retention not evidenced |
| **Supabase Storage (not used)** | Object storage | None currently | n/a | Env keys in `.env.production.example`, but no upload code uses it | If enabled, add DPA/region/access controls |

### 4.4 Browser storage and cookies

| Name | Type | Purpose | Duration | Party | Consent status |
|---|---|---|---|---|---|
| `qhsse_visitor_key` | `localStorage` | Persistent visitor identifier for analytics | Indefinite (no expiry) | First party | **No consent**; set on first public page |
| `preferred-language` | `localStorage` | UI language | Persistent | First party | No notice |
| NextAuth session cookie (`next-auth.session-token` / `__Secure-next-auth.session-token`) | Cookie | Authentication | 7 days (`lib/auth-options.ts:152-155`) | First party | Strictly necessary |
| NextAuth CSRF/callback cookies | Cookie | Login security / redirect | Session | First party | Strictly necessary |
| Consent cookie (proposed) | Cookie | Record consent choices | 6 months | First party | Strictly necessary to record choice |
| Hosting/CDN security cookies (possible) | Cookie | Bot protection / WAF | Provider-defined | Third party | Strictly necessary/security |

No analytics library, advertising pixel, or third-party marketing cookie was found.

---

## 5. Findings register

### 5.1 Critical findings

#### C-01 — No privacy notice, terms, or cookie notice

**Evidence:** `components/Footer.tsx:113-120` renders “Privacy Policy” and “Terms of Service” as `href="#"`. No `/privacy`, `/terms`, `/cookies`, or equivalent route exists. No form links to a notice (`app/contact/page.tsx:129-201`; `app/jobs/page.tsx:385-468`; `app/register/page.tsx:155-252`).

**Risk:** Transparency is a core obligation under GDPR Arts. 12-14, Egypt PDPL, and UAE PDPL. Visitors and applicants cannot understand what is collected, why, for how long, or how to exercise rights. The dead links are also a consumer-protection and trust issue.

**Requirement:** Publish Arabic and English versions of a privacy policy, terms of service, cookie/storage notice, and a “Privacy settings” control. Link them from the footer, every collection form, confirmation emails, and the client portal. An interim notice may be published first if it accurately describes current processing; do not describe controls that are not live. See IMP-02 to IMP-04.

**Priority:** Immediate (0-7 days).

---

#### C-02 — Visitor tracking without consent or demonstrated lawful basis; excessive data and indefinite retention

**Evidence:**

- `app/layout.tsx:35` renders `<VisitorTracker />` globally.
- `components/VisitorTracker.tsx:6-20` creates/reads `qhsse_visitor_key` in `localStorage` and stores it indefinitely.
- `components/VisitorTracker.tsx:27-50` fires `POST /api/visitors/track` on every pathname change, including `/training/certificate/[code]`, `/login`, and `/register`; only `/admin` and `/dashboard` are excluded.
- `app/api/visitors/track/route.ts:35-75` stores `countryCode`, `countryName`, `region`, `city`, `ipAddress`, `userAgent`, `lastPath`, `pageViews`, `firstSeenAt`, `lastSeenAt`.
- `lib/visitor-tracking.ts:21-42` takes the first `x-forwarded-for` value and full `user-agent`; reads `x-vercel-ip-city` and `x-vercel-ip-country-region`.
- `prisma/schema.prisma:173-190` has no TTL, deletion flag, or anonymisation field.

**Risk:** A persistent identifier plus IP, user-agent, city, and browsing path is personal data. Under GDPR/ePrivacy, storing/accessing the identifier requires consent unless strictly necessary; analytics is not strictly necessary. Egypt PDPL recognises legitimate interest but requires a balancing assessment, and covert analytics is unlikely to satisfy it; the UAE PDPL requires a specified basis and its legitimate-interest position should be confirmed with counsel. The current design also creates a storage-limitation breach and a higher breach-impact profile.

**Requirement:** Consent-gate the tracker (client and server side), minimise data (no full IP, no full UA, no city, no certificate codes), and enforce a 30-day raw retention with aggregate-only reporting. See IMP-01, IMP-02, IMP-11, IMP-12, IMP-13.

**Priority:** Immediate (0-7 days).

---

#### C-03 — Hard-coded default admin password and no MFA

**Evidence:**

- `prisma/seed.ts:6-9` comments and defines the bcrypt hash for `admin123` and `client123`.
- `prisma/seed.ts:15-25` upserts `admin@qhsseconsultant.com` with that hash and **resets the password on every seed run** (`update: { password: ADMIN_HASH }`).
- `prisma/seed.ts:221-223` prints the credentials.
- No MFA/TOTP/WebAuthn implementation was found. Sessions last 7 days (`lib/auth-options.ts:152-155`).

**Risk:** Anyone who knows the seed file, or any deployment that ran the seed in production, can authenticate as admin. The admin account can read all CVs, client documents, reports, and financial records, and can delete clients (which cascades). This is a critical confidentiality and integrity risk under GDPR Art. 32, Egypt PDPL security obligations, and UAE PDPL security obligations.

**Requirement:** Remove hard-coded credentials; require `SEED_ADMIN_PASSWORD` and `SEED_ADMIN_EMAIL` from the environment; never reset an existing password on seed; refuse to run the seed in production unless explicitly allowed; force password change on first login; add TOTP MFA for all `ADMIN` users; shorten admin sessions to 8 hours and require re-authentication for exports/deletions. See IMP-14 (SEC-01 to SEC-03).

**Priority:** Immediate (0-3 days).

---

#### C-04 — CVs and client documents stored as base64 in database columns and exposed in bulk

**Evidence:**

- `app/api/job-applications/route.ts:94-101` converts the uploaded CV to a `data:<mime>;base64,...` string and stores it in `JobApplication.resumeUrl` (`prisma/schema.prisma:160`).
- `app/api/job-applications/route.ts:25-46` returns **all** applications, including the full base64 CV, to the admin UI.
- `app/admin/admin-jobs.tsx:695-703` renders the base64 as an `<a href={application.resumeUrl} download>` link.
- `app/api/upload/route.ts:46` does the same for observation images.
- `lib/validation.ts:49-69` permits client documents up to ~3 MB as base64 data URLs or arbitrary `https://` URLs.
- `app/api/knowledge-bank/route.ts:114-126` stores the base64 string in `ClientDocument.url`; `app/api/clients/[id]/profile/route.ts:18` returns documents including the base64 to admins.

**Risk:** The database becomes a store of unstructured, high-value files. Any SQL injection, backup leak, misconfigured replica, admin session compromise, or over-broad API response exposes every CV and client document at once. Base64 inflates storage by ~33%, bloats API responses, defeats streaming, and makes per-file access control/audit difficult. `validateResumeFile` checks magic bytes only (`lib/file-validation.ts:27-42`); there is no antivirus, sandbox, macro stripping, or content disarm.

**Requirement:** Move files to a private object-storage bucket (Supabase Storage, S3, or equivalent) with server-generated, short-lived signed URLs (60 seconds), per-object authorization, encryption, antivirus scanning, and access logging. Store only metadata and an object key in PostgreSQL. Until migration is complete, do not return base64 in list endpoints; require a dedicated, audited download endpoint. See IMP-14 (SEC-12, SEC-16) and the Phase 2 migration.

**Priority:** Immediate design decision; migration within 30 days.

---

#### C-05 — No data-subject access, export, or erasure mechanism for most data

**Evidence:**

- `app/api/contact/[id]/route.ts:10-42` only supports `PATCH { status }`; no `DELETE`.
- `app/api/job-applications/[id]/route.ts:19-55` only supports `PATCH { status }`; no `DELETE`.
- No `/api/account/export`, `/api/account/delete`, `/api/privacy/*`, or DSAR intake route exists.
- `app/api/client-profile/route.ts:47-80` allows a client to update a limited profile but provides no export or deletion.
- `app/api/training/profile/route.ts:8-23` is read-only.
- `app/api/clients/[id]/route.ts:78-111` allows an **admin** to delete a client and user, but not the data subject.

**Risk:** The company cannot reliably answer an access, portability, rectification, restriction, objection, or erasure request within statutory timelines. Contact enquiries and rejected applicants have no deletion path at all. This is a direct GDPR Arts. 15-21 / Egypt PDPL / UAE PDPL gap.

**Requirement:** Implement the DSAR intake, export, and deletion flows in IMP-07 to IMP-10, including identity verification, audit logging, legal-hold exceptions, and a 30-day SLA.

**Priority:** Immediate (0-14 days for intake; 30 days for full automation).

---

### 5.2 High findings

#### H-01 — No consent or privacy acknowledgement at collection points

**Evidence:** Contact form (`app/contact/page.tsx:129-201`), job application form (`app/jobs/page.tsx:385-468`), and registration form (`app/register/page.tsx:155-252`) submit personal data with no checkbox, no notice link, and no purpose statement. `app/api/auth/register/route.ts:36-44` creates the user without recording any consent/acknowledgement.

**Risk:** No demonstrable consent or notice. Job applicants are not told how long their CV is kept or that it is stored in a database. Trainees are not told that certificate verification publishes their name and score.

**Requirement:** Add a short notice and a non-pre-ticked acknowledgement/consent checkbox to each form, with separate marketing opt-in. Record version/time/source. See IMP-05 and IMP-06.

**Priority:** High (within 14 days).

---

#### H-02 — No retention schedule or deletion job; all categories are indefinite

**Evidence:** No `deleteMany`, TTL, cron, `deletedAt`, or `legalHold` implementation exists. `VisitorSession` (`prisma/schema.prisma:173-190`), `ContactRequest` (`105-120`), `JobApplication` (`152-171`), `ActivityLog` (`260-274`), and `RateLimitEntry` (`192-201`) have no expiry. The Prisma schema has no retention fields.

**Risk:** Violates storage-limitation principles (GDPR Art. 5(1)(e); Egypt/UAE equivalents) and increases breach impact. Old CVs and contact messages remain forever, even after the purpose is fulfilled.

**Requirement:** Adopt the schedule in section 7 and enforce it with the cron in IMP-13. Add `deletedAt`, `anonymizedAt`, and `legalHold` where needed.

**Priority:** High (within 30 days).

---

#### H-03 — No processor register, DPAs, or transfer safeguards

**Evidence:** `.env.example:1-15` shows Supabase, Google OAuth, and SMTP. `next.config.js:15` allows `connect-src https://*.supabase.co`. `lib/visitor-tracking.ts:24-29` reads Vercel/Cloudflare geo headers. No DPA, sub-processor list, SCC, transfer impact assessment, or processor register exists in the repository.

**Risk:** Under GDPR Art. 28, the controller must use only processors providing sufficient guarantees and must have a written contract. Cross-border transfers require Chapter V safeguards. Egypt and UAE law impose their own transfer restrictions. Without documentation, the company cannot demonstrate compliance or notify clients of sub-processors.

**Requirement:** Build the processor register in Appendix B; execute DPAs/SCCs; document hosting regions; complete a transfer assessment; publish a sub-processor list or provide it to clients on request. See IMP-15.

**Priority:** High (within 30 days).

---

#### H-04 — Certificate verification codes and other identifiers are stored in analytics paths

**Evidence:** `components/VisitorTracker.tsx:39-47` sends `path: pathname`. The public certificate route is `/training/certificate/[code]` (`app/training/certificate/[code]/page.tsx:28`), and the code matches `QHSSE-TR-YYYY-...` (`app/api/training/certificates/[code]/verify/route.ts:12`). `VisitorSession.lastPath` stores it indefinitely (`prisma/schema.prisma:182`).

**Risk:** A certificate code is a bearer credential for verification and can be associated with a visitor’s IP/user-agent. This is unnecessary and creates a linkability/privacy issue; it also pollutes analytics with high-cardinality identifiers.

**Requirement:** Normalise paths before sending (`/training/certificate/:code`), exclude `/training/certificate/*`, `/training/verify`, `/login`, `/register` from analytics, and strip all query strings. Store only route templates. See IMP-12.

**Priority:** High (within 14 days).

---

#### H-05 — Public certificate verification over-discloses personal data

**Evidence:** `app/api/training/certificates/[code]/verify/route.ts:28-36` returns `recipientName`, `courseTitle`, `courseTitleAr`, `score`, `issuedAt` to anyone who knows the code. `app/training/verify/page.tsx:72-75` displays the full name, course, score, and date. The code format is predictable (`QHSSE-TR-2026-...`), and the endpoint allows 30 requests/minute (`route.ts:16-21`).

**Risk:** Full-name + score + course is more than necessary for authenticity verification. Predictable codes and a public endpoint enable enumeration/confirmation of individuals’ training results. This may be legitimate for certificate verification, but it must be transparent, minimised, and consented to (or justified by a documented legitimate interest).

**Requirement:** Display only what is necessary (e.g., first name + family initial, course, issue date, status); make score display optional/consented; add a notice on the verification page; use high-entropy codes; keep rate limiting; log verification attempts without storing the code in analytics. See IMP-18.

**Priority:** High (within 30 days).

---

#### H-06 — No breach response or notification runbook

**Evidence:** No incident-response policy, breach register, notification template, or contact list exists in the repository. Error handling logs to `console.error` only (e.g., `app/api/contact/route.ts:95-98`, `app/api/visitors/track/route.ts:82-84`).

**Risk:** GDPR requires notification to the supervisory authority within 72 hours of awareness (Art. 33) and to data subjects where high risk (Art. 34). Egypt and UAE law impose their own notification duties. Without a runbook, the company will miss deadlines and may notify incorrectly.

**Requirement:** Adopt a breach response plan: roles, detection, containment, risk assessment, notification matrix, templates, register, and annual tabletop. See IMP-16.

**Priority:** High (within 30 days).

---

#### H-07 — No DSAR procedure, identity verification, or SLA

**Evidence:** No privacy request model, route, mailbox, or workflow. The only deletion path is admin-initiated client deletion (`app/api/clients/[id]/route.ts:78-111`), which is not a DSAR process and does not cover contact/job applicants.

**Risk:** Requests may be missed, handled inconsistently, or fulfilled without verifying identity (leading to data disclosure). Statutory deadlines may be missed.

**Requirement:** Implement a DSAR register, intake form, identity verification, 30-day SLA with extension logic, redaction of third-party data, and audit trail. See IMP-07 to IMP-10 and Appendix C.

**Priority:** High (within 30 days).

---

#### H-08 — Raw IP addresses stored indefinitely in activity logs

**Evidence:** `lib/activity-log.ts:3-19` accepts `ipAddress`; callers pass `headerList.get('x-forwarded-for')` directly (e.g., `app/api/job-applications/route.ts:52,143-152`, `app/api/jobs/[id]/route.ts:27,61-68`). `prisma/schema.prisma:260-274` has no retention or anonymisation. The admin UI does not currently show IP (`app/admin/admin-activity-log.tsx`), but the API returns records (`app/api/activity-log/route.ts:8-17`).

**Risk:** IP is personal data; storing the full proxy chain indefinitely is unnecessary for security auditing. It increases breach impact and may include third-party IPs (proxies).

**Requirement:** Store only a truncated IP (/24 IPv4, /48 IPv6) or an HMAC hash; set 12-month retention; anonymise after 90 days; parse only the first hop behind a trusted proxy. See IMP-11 and IMP-13.

**Priority:** High (within 30 days).

---

#### H-09 — Header/CSP weaknesses and no explicit CSRF/Origin checks

**Evidence:** `next.config.js:8-16` sets `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and CSP, but CSP allows `'unsafe-inline'` scripts and `frame-src 'self' data: blob:`. No `Strict-Transport-Security`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, or `X-Permitted-Cross-Domain-Policies` is set. Custom state-changing routes (`POST/PATCH/DELETE`) do not perform explicit Origin/Referer or CSRF-token checks; they rely on NextAuth/SameSite defaults.

**Risk:** `'unsafe-inline'` weakens XSS defence, which matters because admin sessions can read CVs/client documents. Missing HSTS allows downgrade on first visit. CSRF exposure depends on cookie SameSite settings and browser behavior; defense-in-depth is warranted for admin actions.

**Requirement:** Nonce-based CSP, remove `'unsafe-inline'` and `data:` from `frame-src`, add HSTS/COOP/CORP, and add Origin/CSRF checks to custom mutation routes. See IMP-14 (SEC-04 to SEC-07).

**Priority:** High (within 30 days).

---

### 5.3 Medium findings

| ID | Finding | Evidence | Requirement | Priority |
|---|---|---|---|---|
| M-01 | `RateLimitEntry` rows never purged; default salt fallback `qhsse-rate-limit` if env missing | `lib/rate-limit.ts:41-54,81-96`; `prisma/schema.prisma:192-201` | Require `RATE_LIMIT_SALT` (32+ bytes), HMAC-SHA256, purge rows 24h after `resetAt` | 30 days |
| M-02 | No `DELETE` for individual job applications; deleting a job opening cascades all applications | `app/api/job-applications/[id]/route.ts:19-55`; `prisma/schema.prisma:155` (`onDelete: Cascade`); `app/api/jobs/[id]/route.ts:76-99` | Add `DELETE /api/job-applications/:id` (admin) and applicant withdrawal; require confirmation; log | 30 days |
| M-03 | No `DELETE` for contact enquiries; status-only workflow | `app/api/contact/[id]/route.ts:10-42` | Add `DELETE /api/contact/:id` with audit; support erasure requests | 30 days |
| M-04 | Client documents accept arbitrary `https://` URLs as well as base64 | `lib/validation.ts:59-69`; `app/api/knowledge-bank/route.ts:103-126` | Remove arbitrary URLs or allowlist approved domains; scan/preview safely | 30 days |
| M-05 | No read/download audit for CVs or client documents; no admin session revocation | `app/api/job-applications/route.ts:25-46`; `app/api/client-documents/route.ts:57`; `lib/auth-options.ts:119-142` | Log `VIEW/DOWNLOAD` events; add session revocation on password change/role change | 30 days |
| M-06 | Error responses leak database/schema state | `app/api/contact/route.ts:11-14,87-93` returns “Contact requests table is missing…” | Return generic errors; log correlation IDs internally | 14 days |
| M-07 | No security contact / `security.txt` / vulnerability disclosure | Repository-wide | Publish `/.well-known/security.txt` and a security mailbox | 90 days |
| M-08 | Over-collection in job applications and CVs | `app/jobs/page.tsx:385-445`; `lib/validation.ts:35-42` | Keep company/phone optional; remove any unnecessary fields; warn against special-category data; minimise CV fields | 30 days |
| M-09 | Client-portal controller/processor roles and DPA are undocumented | `app/api/client-documents/route.ts`, `app/api/knowledge-bank/route.ts` | Execute client DPAs; define instructions, deletion, breach cooperation, sub-processors | 30 days |
| M-10 | Backup retention and deletion propagation undocumented | Not in repository | Document backup schedule/retention (35 days proposed), encryption, restore tests, deletion-on-expiry | 60 days |

### 5.4 Low findings

| ID | Finding | Evidence | Requirement | Priority |
|---|---|---|---|---|
| L-01 | Language preference stored in `localStorage` without disclosure | `context/language-context.tsx:59-61` | Disclose in cookie/storage table; treat as functional | 30 days |
| L-02 | Bot detection is a simple substring heuristic and can be spoofed | `lib/visitor-tracking.ts:44-52` | Keep as best-effort; do not rely on it for consent/security | 90 days |
| L-03 | No “Privacy settings” link in footer | `components/Footer.tsx:113-120` | Add link that reopens consent preferences | 14 days |
| L-04 | No evidence of privacy/security training or confidentiality undertakings | Not in repository | Annual training, acknowledgement tracking | 90 days |

---

## 6. Domain analysis

### 6.1 Lawful basis

| Processing activity | GDPR basis | Egypt PDPL position (confirm with counsel) | UAE PDPL position (confirm with counsel) | Recommended design |
|---|---|---|---|---|
| Visitor analytics | Consent (Art. 6(1)(a)) because ePrivacy Art. 5(3) applies to the persistent identifier; security-only logs may rely on legitimate interests (Art. 6(1)(f)) | Consent is the default for analytics; legitimate interest is recognised but requires a balancing test and is unlikely to cover covert tracking. Use consent. | Consent or another specified basis; do not assume legitimate interest. Use consent. | Consent-gated analytics; no identifier or IP storage before consent; aggregate reporting. |
| Contact enquiry | Pre-contractual steps (Art. 6(1)(b)) or legitimate interests (Art. 6(1)(f)) for responding; marketing requires consent | Consent or contract; record acknowledgement | Consent or contract | Short notice + acknowledgement; separate marketing opt-in. |
| Job application | Pre-contractual steps (Art. 6(1)(b)); retention for future roles requires consent (Art. 6(1)(a)) | Consent/contract; explicit consent for talent pool | Consent/contract; explicit consent for talent pool | Recruitment notice; 6/12-month retention; separate talent-pool opt-in. |
| Trainee account and training | Contract (Art. 6(1)(b)); certification records may rely on contract/legitimate interests | Contract/consent | Contract/consent | Notice at registration; terms acceptance; certificate verification consent. |
| Client portal documents/reports | Contract (Art. 6(1)(b)); QHSSE acts as processor on client instructions (Art. 28) | Contract/consent; client as controller must have basis | Contract/consent | DPA with client; instructions; deletion/return; confidentiality. |
| Security logs / rate limiting | Legitimate interests (Art. 6(1)(f)); legal obligation where applicable | Legitimate interest is recognised; document the balancing test, or use security/legal obligation/consent where required | Specified basis; document. Confirm whether legitimate interest is available. | Minimise, truncate IP, short retention, access restricted. |
| Financial/tax records | Legal obligation (Art. 6(1)(c)) | Legal obligation | Legal obligation | Retain per tax law; restrict access. |
| Marketing emails | Consent (Art. 6(1)(a)) + ePrivacy | Consent | Consent | Separate opt-in; unsubscribe in every message. |
| Certificate verification | Contract/legitimate interests; consent for public display | Consent/contract | Consent/contract | Minimise displayed data; allow objection. |

**Conclusion:** the safest common denominator across Egypt, UAE, and the EU is **explicit, granular consent for analytics and marketing**, plus **contract/pre-contractual necessity** for service delivery, with clear notices. Where the company wants to rely on legitimate interests (e.g., security logs), it must document a balancing test and offer an objection mechanism.

### 6.2 Consent

**Current state:** no consent UI, no consent records, no server-side enforcement, no withdrawal mechanism. The visitor identifier is created before any choice. Forms collect data on submit with no acknowledgement.

**Required elements (GDPR Art. 7; Egypt/UAE equivalents):**

1. **Freely given, specific, informed, unambiguous.** Separate purposes; no bundled consent; no pre-ticked boxes; no consent wall.
2. **Demonstrable.** Store who consented (or an anonymous consent ID), when, to which version, which categories, and the source (banner, form, footer).
3. **Withdrawable.** As easy to withdraw as to give; one click from the footer/privacy page; stop processing promptly.
4. **Granular.** Analytics, preferences, and marketing as separate toggles. Strictly necessary is informational only.
5. **Versioned.** Re-consent on material changes; keep old records.
6. **Server-side enforcement.** Do not rely on the client to honour consent; the tracking endpoint must reject requests without a valid consent cookie/token.
7. **No dark patterns.** “Reject all” equally prominent; closing the banner means reject, not accept; no implied consent by scrolling.

### 6.3 Notices and transparency

| Notice | Where it must appear | Current state | Required content |
|---|---|---|---|
| Privacy policy | Footer, forms, emails, portal | Missing (`href="#"`) | Identity, data categories, purposes/bases, recipients, transfers, retention, rights, security, complaints, contact |
| Terms of service | Footer, registration, client portal | Missing (`href="#"`) | Service scope, account rules, IP, liability, termination, governing law |
| Cookie/storage notice | Footer, banner, privacy page | Missing | Names, purposes, durations, parties, consent category |
| Short collection notice | Contact, jobs, registration, client portal | Missing | Purpose, retention, recipients, rights link |
| Recruitment notice | Jobs page / application confirmation | Missing | Controller identity, CV storage, retention, talent pool, special-category warning |
| Certificate verification notice | `/training/verify`, certificate page | Missing | What is displayed, why, how to object |
| Client portal notice / DPA reference | Client dashboard | Missing | QHSSE role, client responsibilities, instructions, deletion |
| Breach notification | Email/website if incident | Missing | What happened, data, risk, measures, contact |
| Marketing unsubscribe | Marketing emails | No marketing currently | Unsubscribe link, preference centre |

### 6.4 Data-subject rights

| Right | GDPR | Egypt/UAE (summary) | Current capability | Gap / required action |
|---|---|---|---|---|
| Access | Art. 15 | Recognised | Admin can see some data in UI; no subject-facing export | Build export endpoint and DSAR intake |
| Rectification | Art. 16 | Recognised | Client profile limited PATCH (`app/api/client-profile/route.ts:47-80`); trainee name/email no self-service | Add profile edit + correction request; propagate to related records |
| Erasure | Art. 17 | Recognised | Admin client deletion only; no contact/job deletion | Add deletion endpoints, grace period, legal-hold exceptions |
| Restriction | Art. 18 | Recognised | None | Add `restricted` flag and suppression logic |
| Objection | Art. 21 | Recognised | None | Add analytics/marketing objection; stop processing |
| Portability | Art. 20 | Recognised | None | JSON/CSV export of provided data |
| Withdraw consent | Art. 7(3) | Recognised | None | Consent settings + clear identifier + stop tracking |
| Automated decisions | Art. 22 | Recognised | Training score pass/fail; certificate issuance | Explain logic; human review on request; no solely automated decision with significant effect without safeguards |
| Complain | Art. 77 | Recognised | No contact/notice | Publish supervisory authority contacts |

**Operational requirements:** identity verification proportionate to risk; 30-day response (extendable by 2 months for complex GDPR requests); free of charge except manifestly unfounded/excessive; redact third-party data; log every request; do not require account creation to submit a request.

### 6.5 Security

| Control area | Current state | Assessment | Required action |
|---|---|---|---|
| Password storage | bcrypt cost 12 | Good | Keep; pepper optional; enforce strong passwords and breach-password checks |
| Admin authentication | Password only | Weak | MFA (TOTP/WebAuthn), 8-hour sessions, re-auth for exports/deletions |
| Default credentials | Seeded `admin123` | **Critical** | Remove; env-based bootstrap; force rotation |
| Authorization | Role checks on most routes | Mixed | Add middleware defense-in-depth; test every route for IDOR; client scoping |
| Transport | TLS assumed; DB `sslmode=require` | Good | Enforce HTTPS/HSTS; redirect HTTP |
| At rest | Supabase default encryption (assumed) | Unverified | Confirm encryption at rest; consider field-level encryption for CVs/client docs |
| File handling | Base64 in DB; magic-byte check | **High risk** | Object storage, signed URLs, AV scan, content disarm, per-file ACL/audit |
| Audit logging | Writes only; raw IP | Partial | Add read/download logs; truncate IP; 12-month retention; tamper-evident storage |
| Rate limiting | DB-backed; 120/min visitor, 5/h contact, 3/h job, 8/15m login | Good | Add cleanup; require salt; alert on abuse |
| Error handling | Some schema leakage | Weak | Generic errors + correlation ID; no stack traces to users |
| Headers | CSP, XFO, nosniff, referrer, permissions | Partial | Nonce CSP, HSTS, COOP/CORP, remove unsafe-inline |
| CSRF | SameSite reliance | Partial | Origin/Referer checks + CSRF token for custom mutations |
| Secrets | `.env` ignored; seed hash committed | Mixed | Rotate secrets; remove seed hash; secret scanning in CI |
| Backups | Unknown | Unverified | Encrypted backups; 35-day retention; quarterly restore test |
| Vendor security | Unknown | Unverified | DPAs, security questionnaires, sub-processor list, breach clauses |
| SDLC | No evidence of SAST/DAST/dependency scanning | Weak | Add `npm audit`/Dependabot, SAST, annual pen test |
| Incident response | None | **High risk** | Runbook, register, notification matrix, tabletop |
| Training | None evidenced | Weak | Annual privacy/security training, confidentiality undertakings |

**Specific code observations:**

- `lib/client-records.ts:211-228,241-259,315-321,355-377,383-386` uses `$queryRawUnsafe` with manually escaped strings. The values are escaped (`sqlValue`), but the pattern is fragile; prefer Prisma tagged templates or `$queryRaw` with parameters. This is a security-hardening item, not a confirmed injection.
- `app/api/contact/route.ts:63-84` sends the enquiry contents to an internal address and an auto-reply to the enquirer. The auto-reply is transactional, but the internal email may be forwarded; define retention and access.
- `app/api/job-applications/route.ts:120-141` sends applicant name/email/phone/cover letter to the notification address. Do not attach the CV; currently it does not.
- `app/api/upload/route.ts:46` stores images as base64 in `Image.url`; reports may contain site photos with identifiable people. Add a notice and minimisation guidance for client sites.
- `app/api/auth/[...nextauth]` uses JWT sessions; no server-side session revocation. A stolen cookie remains valid until expiry (7 days). Add short expiry/rotation and revocation on password change.

### 6.6 Processors and cross-border transfers

**Current data flows (inferred):**

```
Visitor / applicant / trainee / client
        │ HTTPS
        ▼
Hosting/CDN edge (Vercel/Cloudflare?) ── logs (IP, UA, path)
        │
        ▼
Next.js API routes ──► SMTP provider (name, email, message, application)
        │
        ▼
Supabase PostgreSQL (all records, base64 files) ── region unknown
        │
        └──► Google OAuth (optional; name, email, subject)
```

**Transfer analysis:**

| From | To | Data | Mechanism needed | Status |
|---|---|---|---|---|
| Egypt | Supabase region (if outside Egypt) | All records | Egypt PDPL transfer permit/exception + contractual safeguards | Not documented |
| UAE | Supabase region (if outside UAE) | UAE client/visitor data | UAE PDPL adequacy/safeguards | Not documented |
| EU/EEA | Supabase/hosting/email/Google | EU personal data | SCCs + transfer impact assessment; Art. 28 DPA | Not documented |
| Any | Email provider | Contact/applicant data | DPA; region; retention | Not documented |
| Any | Google (OAuth) | Name, email, profile | Google terms/DPA; limited-use disclosure | Not documented |

**Egypt note:** the Egypt PDPL restricts transferring personal data outside Egypt and may require a permit or one of the statutory exceptions. Because the database region is not fixed in the configuration, this must be resolved before processing Egyptian personal data at scale. Options: host Egyptian data in Egypt (or a region accepted by counsel), rely on a documented exception/consent, or use a hybrid architecture with local storage for Egyptian records.

**UAE note:** the UAE PDPL permits transfers to jurisdictions with adequate protection or with safeguards; the DIFC and ADGM have separate regimes. Confirm whether any client data is DIFC/ADGM-scoped and whether the client’s contract imposes additional residency requirements.

**GDPR note:** Egypt and the UAE are generally not the subject of EU adequacy decisions (verify current status). SCCs plus a transfer impact assessment are the default. If the company has no EU establishment but systematically monitors EU visitors, Art. 27 may require an EU representative.

### 6.7 Regional compliance notes

#### Egypt

- **Law:** Personal Data Protection Law No. 151 of 2020; Executive Regulations status must be confirmed with counsel.
- **Bases:** consent, contract, legal obligation, vital interests, public interest, and legitimate interest. Consent remains the safest basis for analytics and marketing; document any legitimate-interest assessment and honour objections.
- **Transparency:** provide clear Arabic notice; identify the controller and purposes.
- **Rights:** access, correction, deletion, restriction, objection, portability; establish a response procedure.
- **Transfer:** restrictions/permit requirements; document the mechanism.
- **Security:** implement appropriate technical/organisational measures; notify the Personal Data Protection Center and affected persons of breaches as required.
- **Sensitive data:** health, biometric, genetic, religious, political, criminal data etc. may require explicit consent and additional safeguards/licensing. QHSSE client documents and CVs can inadvertently contain health data; minimise and segregate.
- **Arabic language:** consumer-facing notices should be in Arabic; an English version can be provided.

#### UAE

- **Law:** Federal Decree-Law No. 45 of 2021 on Personal Data Protection; Executive Regulations and UAE Data Office guidance to be confirmed.
- **Bases:** consent and other specified bases; document the basis for each activity.
- **Transparency:** clear notice; Arabic and English.
- **Rights:** access, correction, deletion, restriction, portability, objection; respond within the statutory period.
- **Transfer:** adequacy or safeguards; document.
- **Security:** appropriate technical/organisational measures; breach notification to the UAE Data Office and data subjects as required.
- **Free zones:** DIFC/ADGM have separate laws and regulators; check client establishment.

#### GDPR / ePrivacy

- **Consent:** analytics identifier requires consent; banner must offer reject; no pre-ticked boxes; withdrawal.
- **Rights:** 1-month response; extension for complex requests; free; electronic format.
- **Processor contracts:** Art. 28; sub-processor authorization; assistance with DSARs/breaches/DPIAs.
- **Records:** Art. 30 ROPA.
- **DPIA:** Art. 35 for systematic monitoring (visitor analytics) and large-scale/sensitive client document processing.
- **Breach:** 72 hours to the supervisory authority; data subjects without undue delay if high risk.
- **Transfers:** Chapter V; SCCs + TIA; Art. 27 representative if applicable.
- **ePrivacy:** Art. 5(3) covers `localStorage` and cookies; consent unless strictly necessary for a service requested by the user.

### 6.8 Client documents: controller/processor and confidentiality

Client documents may contain:

- employee names, IDs, medical/fitness data, incident reports, disciplinary records;
- site plans, process details, photographs of people and premises;
- audit findings that could affect individuals or the client’s reputation.

QHSSE should treat these as **confidential client data**, likely as a **processor**. Requirements:

1. A written DPA with each client: scope, instructions, duration, security, sub-processors, deletion/return, breach cooperation, audit rights.
2. Tenant isolation: every query scoped by `clientId`; no cross-client access; admin access logged.
3. Encryption: TLS in transit; encryption at rest; consider per-client keys or field-level encryption.
4. Retention: contract term + 30 days, unless the client instructs otherwise or legal holds apply.
5. Deletion/export on termination: return in a common format; delete and certify; backups expire within 35 days.
6. No use for QHSSE’s own purposes (e.g., marketing) without client permission.
7. Confidentiality undertakings for staff and contractors.
8. Incident notification to the client without undue delay (and within contractual SLA).

### 6.9 Cookies and ePrivacy

The only non-essential storage is the analytics identifier (`qhsse_visitor_key`) plus `preferred-language`. The analytics identifier is used to recognise a returning visitor and increment page views; this is not “strictly necessary” for the service. Under ePrivacy Art. 5(3), consent is required before setting/reading it. The language preference is user-requested functionality and may be treated as strictly necessary, but it should still be disclosed.

**No third-party advertising cookies were found.** If marketing pixels are added later, they require prior consent and a cookie notice update.

### 6.10 Automated decisions

Training attempts are scored automatically and a pass/fail determines certificate issuance (`TrainingEnrollment.passed`, `certificateCode`). This is not advertising profiling, but it can have a significant effect on the trainee. Requirements:

- Explain the pass mark and scoring in the training terms.
- Provide a human review/appeal route for disputed results.
- Do not use the score for unrelated decisions without a separate basis.
- Keep an audit trail of attempts and manual overrides.

### 6.11 Children and marketing

- The services are aimed at working professionals; state 18+ (or guardian consent where local law allows).
- Do not knowingly collect children’s data; delete if discovered.
- No marketing emails were found in the code. If added, use separate opt-in, identify the sender, and include an unsubscribe link. Do not bundle marketing consent with service terms.

---

## 7. Retention schedule

> **Status:** proposed schedule for management/legal approval. Periods are maximums; delete earlier when the purpose is fulfilled. “Delete” means irreversible removal from primary storage; “anonymise” means remove identifiers while retaining aggregate/statistical records. Legal holds override the schedule.

### 7.1 Website visitors and enquiries

| # | Data category | Where stored | Purpose | Proposed retention | Then | Notes |
|---|---|---|---|---|---|---|
| R-01 | Visitor session: `visitorKey`, truncated IP, country/region, browser/OS family, route template, page views, timestamps | `VisitorSession` | Analytics, security | **30 days** from `lastSeenAt` | Aggregate (no identifier) and delete raw | Do not store city, full UA, or full IP |
| R-02 | Visitor identifier in browser (`qhsse_visitor_key`) | `localStorage` | Recognise returning visitor | **30 days** sliding, max **90 days** | Clear; require new consent | Withdrawal clears immediately |
| R-03 | Aggregate analytics (country/month/page counts) | Analytics table/export | Reporting | **26 months** | Delete | No re-identification |
| R-04 | Consent records | `ConsentRecord` | Accountability | Life of processing + **3 years** | Delete | Keep version/timestamp/categories, not raw IP |
| R-05 | Contact enquiry | `ContactRequest` | Respond, relationship | **12 months** after last contact/closure | Delete or anonymise | If converted to client, move to client record with contract basis |
| R-06 | Contact email notifications | SMTP provider | Delivery | Provider retention, target **30 days** | Delete | Configure provider retention; no attachments |
| R-07 | Job application + CV | `JobApplication`, object storage | Recruitment | **6 months** after decision for unsuccessful; **12 months** after role closure for all | Delete CV and personal fields; keep anonymised stats | Talent pool only with explicit consent, **24 months**, renewable |
| R-08 | Talent-pool profile | New table/flag | Future roles | **24 months** from consent | Delete or re-consent | Separate opt-in; easy withdrawal |
| R-09 | Recruitment email notifications | SMTP provider | Delivery | **30 days** | Delete | Do not attach CV |
| R-10 | Rate-limit entries (hashed IP + email) | `RateLimitEntry` | Abuse prevention | **24 hours** after `resetAt` | Delete | Max 7 days; no raw IP |
| R-11 | Hosting/CDN request logs | Provider | Security | **30 days** (configure) | Delete | Confirm provider default; disable verbose logging |

### 7.2 Trainees, certificates, and users

| # | Data category | Where stored | Purpose | Proposed retention | Then | Notes |
|---|---|---|---|---|---|---|
| R-12 | Trainee account (name, email, phone, password hash, language) | `User` | Account, training | Active + **24 months** after last login | Anonymise/delete | Keep certificate records separately |
| R-13 | Training enrollment, attempts, answers | `TrainingEnrollment`, `TrainingAttempt` | Deliver/assess training | **24 months** after last attempt | Delete or anonymise | Keep aggregate pass rates |
| R-14 | Certificate record (name, course, score, code, issue date) | `TrainingEnrollment`/`User` | Issue/verify certificate | **7 years** after issue (or professional-liability period) | Archive minimal metadata; delete public verification | Confirm with counsel/insurer |
| R-15 | Public certificate verification data | API response | Authenticity check | While certificate valid + **1 year** | Stop public display; retain internal record | Minimise displayed fields |
| R-16 | Registration consent/acknowledgement | `ConsentRecord` | Accountability | Life of account + **3 years** | Delete | Versioned |
| R-17 | Password reset/verification tokens (if added) | DB | Security | **1 hour** | Delete | Single-use, hashed |

### 7.3 Clients, documents, reports, and finance

| # | Data category | Where stored | Purpose | Proposed retention | Then | Notes |
|---|---|---|---|---|---|---|
| R-18 | Client account and contacts | `Client`, `User` | Service delivery | Contract term + **7 years** (tax/liability) | Delete/anonymise | Confirm tax period with accountant |
| R-19 | Client documents (CVs of client staff, policies, permits, reports) | Object storage + `ClientDocument` | Consultancy | Contract term + **30 days** after termination, unless client instructs otherwise | Return to client, then delete; certificate of deletion | DPA may require shorter/longer; legal hold exception |
| R-20 | Reports, observations, images | `Report`, `Observation`, `Image` | Consultancy/liability | **7 years** after report date | Delete/anonymise; retain aggregate | Images may contain people; minimise/blur |
| R-21 | Financial records | `FinancialRecord` | Accounting/tax | **7 years** (confirm 5-year minimum) | Delete | Restricted access |
| R-22 | Client portal profile/logo | `Client.contactInfo` JSON | Portal branding | Life of account + **30 days** | Delete | Logo may contain personal data |
| R-23 | Client DPA/contract records | Contract repository | Legal | Contract term + **10 years** | Archive/delete | Confirm limitation period |

### 7.4 Security, governance, and backups

| # | Data category | Where stored | Purpose | Proposed retention | Then | Notes |
|---|---|---|---|---|---|---|
| R-24 | Activity/audit logs (actor, action, entity, truncated IP) | `ActivityLog` | Security/audit | **12 months** | Delete; aggregate counts | Truncate IP after 90 days |
| R-25 | Authentication/login logs | Hosting/provider | Security | **90 days** | Delete | No raw IP beyond 90 days |
| R-26 | DSAR requests and responses | `PrivacyRequest` | Rights management | **3 years** | Delete | Redact sensitive content |
| R-27 | Breach register | `SecurityIncident` | Accountability | **5 years** | Archive/delete | Restricted access |
| R-28 | Processor/DPA register | Document repository | Accountability | Life of contract + **6 years** | Archive | Review annually |
| R-29 | Backups | Supabase/provider | Recovery | **35 days** rolling | Expire | Encrypted; restore tested quarterly; deletion propagates on expiry |
| R-30 | Marketing consent/unsubscribe records | `ConsentRecord` | Compliance | Withdrawal + **3 years** | Delete | No marketing currently |

**Deletion mechanics:**

- Primary storage: hard delete or irreversible anonymisation.
- Backups: deletion request is applied to primary immediately; backups expire within 35 days. Document this in the privacy policy rather than promising instantaneous erasure from backups.
- Legal hold: `legalHold = true` blocks deletion; review quarterly.
- Aggregates: ensure k-anonymity (e.g., suppress cells with fewer than 5 visitors) before retaining statistics.
- Certificates: public verification can be disabled while retaining the internal record for legal/liability purposes.

---

## 8. Exact implementation requirements

### IMP-01 — Consent banner behaviour

**Goal:** no non-essential storage or tracking before an affirmative choice, with equal reject/accept options and a withdrawable, versioned record.

**Component and placement**

- New `components/ConsentBanner.tsx` (client component) and `components/PrivacySettings.tsx` (modal).
- Render the banner in `app/layout.tsx` **before** `VisitorTracker`.
- Read the consent cookie server-side in `app/layout.tsx` (server component) and conditionally render `<VisitorTracker />` only when `analytics === true` and the consent version is current. This prevents the tracker from mounting before consent and is more robust than a client-only check.
- Provide a `ConsentProvider` (React context) for the modal state and a `useConsent()` hook.

**State model**

```ts
type ConsentCategory = 'necessary' | 'analytics' | 'preferences' | 'marketing'

type ConsentState = {
  version: string            // e.g. '2026-10-27'
  necessary: true
  analytics: boolean
  preferences: boolean
  marketing: boolean
  decidedAt: string          // ISO timestamp
  action: 'accept_all' | 'reject_all' | 'custom' | 'withdraw'
  locale: 'ar' | 'en'
  consentId: string          // UUID, also stored server-side
}
```

Cookie: `qhsse_consent`, first-party, `Path=/`, `SameSite=Lax`, `Secure`, `Max-Age=15552000` (180 days), value = Base64URL(JSON) + HMAC signature using `CONSENT_SECRET`. The cookie may be non-HttpOnly if the client needs to read it; if rendered server-side, prefer `HttpOnly` and expose state through a server prop/API.

**Behaviour**

| Step | Requirement |
|---|---|
| First visit | Banner appears at the bottom (not a full-screen wall); page content remains usable; no `qhsse_visitor_key` is created; no `/api/visitors/track` request is made. |
| Banner copy | “نستخدم ملفات تعريف الارتباط والتخزين المحلي لتشغيل الموقع وتحسينه. يمكنك قبول الكل أو رفض غير الضروري أو تخصيص اختياراتك.” / “We use cookies and local storage to run and improve the site. You can accept all, reject non-essential, or customise.” |
| Buttons | `قبول الكل` / `رفض الكل` / `تخصيص` — **same visual weight and size** for accept/reject. No pre-selected toggles. |
| Reject all | Sets analytics=false, preferences=false, marketing=false; clears `qhsse_visitor_key`; does not mount tracker; may optionally call `DELETE /api/visitors/session` with the existing key. |
| Accept all | Sets analytics=true, preferences=true; mounts tracker; analytics begins after the cookie is set. |
| Customise | Modal with toggles: “ضروري (مفعّل دائمًا)”, “تحليلات الزوار”, “التفضيلات”, “التسويق”. Save button applies. |
| Close (X) | Treated as **reject non-essential**; no tracking. |
| Scroll/continue | No implied consent; banner remains until a choice (or a small, non-blocking reminder after 7 days). |
| Withdraw | Footer “إعدادات الخصوصية” link reopens the modal; withdrawal sets analytics=false immediately, clears the visitor key, and calls the deletion endpoint for the existing session. |
| Version change | If the stored version ≠ current version, re-open the banner and do not honour prior analytics consent until renewed. |
| GPC | If `navigator.globalPrivacyControl === true`, default analytics/marketing to false and show “تم رصد إشارة الخصوصية العالمية”; do not override without explicit action. |
| DNT | Treat `navigator.doNotTrack === '1'` as an objection; default analytics off. |
| Accessibility | `role="dialog"`, `aria-modal="true"`, labelled title, focus trap, Esc = close/reject, keyboard operable toggles, contrast ≥ 4.5:1, RTL support. |
| Localisation | Full Arabic and English copy; no machine-translated legal text. |
| Persistence | 180 days; re-prompt at least every 12 months; record consent version. |
| No dark patterns | No “accept” only button; no tiny reject link; no guilt copy; no colour manipulation. |

**Server-side enforcement**

- `POST /api/visitors/track` must:
  1. Read `qhsse_consent`, verify HMAC, check `version` and `analytics === true`; otherwise return `204 No Content` and store nothing.
  2. Accept only a UUID v4 `visitorKey`; reject arbitrary strings.
  3. Apply rate limiting before any processing.
  4. Not run for `/admin`, `/dashboard`, `/training/certificate/*`, `/training/verify`, `/login`, `/register`.
- Add `POST /api/consent` to validate and set the cookie, create a `ConsentRecord`, and return the state.
- Add `GET /api/consent` for the current state (no PII).
- Add `DELETE /api/consent` / `POST /api/consent/withdraw` to withdraw and delete the visitor session.

**Acceptance tests**

1. Fresh profile: no `qhsse_visitor_key`, no `/api/visitors/track` request before a choice.
2. Reject: cookie analytics=false; no tracker after reload; no visitor row created.
3. Accept: one row per page path; `VisitorSession` contains no full IP/UA/city.
4. Withdraw: tracker stops; existing row deleted/anonymised; cookie updated.
5. GPC: analytics defaults off; banner reflects it.
6. Version bump: banner reappears; old consent not honoured.
7. Server enforcement: direct `POST /api/visitors/track` without consent returns 204 and creates no row.
8. Accessibility: keyboard-only completion; screen-reader labels; Arabic RTL.

---

### IMP-02 — Privacy policy page and required sections

Create `app/privacy/page.tsx` (or `app/(legal)/privacy/page.tsx`) rendering the Arabic and English content. Use the language context; provide a language toggle and a version/effective date. Link from the footer, forms, emails, and portal. The Arabic draft is at `docs/legal/privacy-policy.ar.md`; an English version must mirror it and be legally reviewed.

**Required sections (minimum):**

| # | Section | Must include |
|---|---|---|
| 1 | Who we are | Legal entity name, registered address, contact, privacy mailbox, privacy lead/DPO if appointed |
| 2 | Scope | Website, portal, training, contact, careers, emails; not third-party sites |
| 3 | Roles | Controller vs processor; client portal DPA; client responsibilities |
| 4 | Data we collect | Categories, examples, mandatory vs optional, sources |
| 5 | Purposes and lawful bases | Table mapping each purpose to a basis; legitimate-interest balancing where used |
| 6 | Special-category data | No intentional collection; CV warning; explicit consent if required |
| 7 | Cookies and local storage | Names, purposes, durations, parties, consent categories |
| 8 | Sharing and processors | Categories and names of key processors; no sale; legal disclosures |
| 9 | International transfers | Countries/regions, safeguards (SCCs/adequacy/consent), how to obtain a copy |
| 10 | Retention | Summary table with periods and exceptions; link to full schedule |
| 11 | Your rights | Access, rectification, erasure, restriction, objection, portability, withdrawal, complaint |
| 12 | How to exercise rights | Email/form, identity verification, 30-day response, free of charge, authorised agents |
| 13 | Security | Technical/organisational measures; no absolute guarantee |
| 14 | Children | 18+; no knowing collection; deletion |
| 15 | Marketing | Separate opt-in; unsubscribe; service messages |
| 16 | Automated decisions | Training scoring; logic; human review |
| 17 | Changes | Versioning, effective date, material-change notice, re-consent |
| 18 | Complaints | Supervisory authorities (Egypt, UAE, EU/UK) and contact |
| 19 | Role-specific notices | Jobs, trainees/certificates, client portal, contact enquiries |
| 20 | Language | Arabic/English versions; governing language per jurisdiction |

**Operational requirements:**

- Version control: `version`, `effectiveDate`, `lastUpdated`, changelog.
- Accessible: semantic headings, readable font size, RTL, no PDF-only notice.
- Link from every form with a short purpose statement and retention summary.
- Provide a printable/PDF version if requested.
- Do not publish claims that are not true (e.g., “we never share data”, “ISO certified”, “fully GDPR compliant”) unless verified.

### IMP-03 — Terms of service page

Create `app/terms/page.tsx` from `docs/legal/terms-of-service.ar.md` plus an English mirror. Link from the footer, registration checkbox, and client portal. Required clauses:

- acceptance and eligibility (18+ / authorised representative);
- service description and scope (consultancy, training, portal);
- account security and accurate information;
- acceptable use and prohibited conduct;
- intellectual property and licence to use materials;
- client content ownership and limited licence to process;
- job applications (no employment guarantee, truthful CV, retention);
- training/certification (pass mark, attempts, certificate verification, no guarantee of employment/regulatory acceptance);
- fees/payment (if applicable);
- disclaimers (not legal advice; no substitute for regulatory approvals);
- liability limits (to the extent permitted by mandatory law; carve-outs for fraud, death/personal injury, gross negligence);
- indemnity;
- termination/suspension;
- third-party links;
- privacy cross-reference;
- governing law and jurisdiction (Egypt/Cairo default; UAE mandatory rules preserved);
- dispute resolution;
- changes and notices;
- general provisions (severability, assignment, force majeure, entire agreement).

### IMP-04 — Cookie and storage disclosure

Publish a table on `/privacy#cookies` (and optionally `/cookies`) matching the actual implementation:

| Name | Type | Purpose | Duration | Party | Category |
|---|---|---|---|---|---|
| `qhsse_consent` | Cookie | Stores consent choices and version | 180 days | First party | Strictly necessary |
| `next-auth.session-token` / `__Secure-next-auth.session-token` | Cookie | Authentication session | 7 days (reduce admin to 8h) | First party | Strictly necessary |
| `next-auth.csrf-token` | Cookie | CSRF protection | Session | First party | Strictly necessary |
| `next-auth.callback-url` | Cookie | Post-login redirect | Session | First party | Strictly necessary |
| `preferred-language` | `localStorage` | UI language | Until cleared (propose 12 months) | First party | Preferences |
| `qhsse_visitor_key` | `localStorage` | Random visitor identifier for analytics | 30 days sliding (max 90) | First party | Analytics — consent required |
| Hosting/CDN security cookies (e.g., `__cf_bm`) | Cookie | Bot protection/WAF | Provider-defined (typically 30 min) | Third party | Strictly necessary/security |
| Google cookies (only if OAuth enabled) | Cookie | Google sign-in | Google-defined | Third party | Strictly necessary for chosen login |

Add a “Cookie settings” button that opens IMP-01. State clearly: “No advertising or cross-site tracking cookies are used.” If that changes, update the table and obtain consent first.

### IMP-05 — Privacy notice at collection (forms)

**Contact form** (`app/contact/page.tsx`)

- Add below the submit button: “بإرسالك هذا النموذج، توافق على معالجة بياناتك للرد على استفسارك وفقًا لسياسة الخصوصية. نحتفظ بطلبات التواصل لمدة 12 شهرًا من آخر تواصل.”
- Add a required checkbox: “أوافق على معالجة بياناتي وفقًا لسياسة الخصوصية” with a link to `/privacy`.
- Add a separate optional checkbox: “أرغب في تلقي معلومات تسويقية” (default off).
- Do not bundle the two.
- On success, the confirmation email should include a privacy link and a way to request deletion.

**Jobs page** (`app/jobs/page.tsx`)

- Add a recruitment notice block above the form: controller identity, purposes, CV storage, 6/12-month retention, talent-pool opt-in, no special-category data, rights contact.
- Required checkbox: “أقرأتُ إشعار التوظيف وسياسة الخصوصية وأوافق على معالجة طلبي.”
- Optional checkbox: “أوافق على الاحتفاظ ببياناتي لمدة 24 شهرًا للفرص المستقبلية” (default off).
- Add a “سحب الطلب/حذف بياناتي” link in the confirmation state and email.

**Registration** (`app/register/page.tsx`)

- Required checkbox: “أوافق على شروط الخدمة وسياسة الخصوصية.”
- Short notice: account purpose, certificate verification, retention, rights.
- If Google sign-in is enabled, explain that Google will share name/email and link to Google’s privacy policy.

**Client portal**

- Show a banner/footer link to the privacy policy and the client DPA.
- Explain that QHSSE processes documents on the client’s instructions.

### IMP-06 — Consent records

Add a `ConsentRecord` model:

```prisma
model ConsentRecord {
  id          String   @id @default(uuid())
  consentId   String   @unique
  subjectKey  String?  // userId or hashed email; null for anonymous visitors
  locale      String
  version     String
  necessary   Boolean  @default(true)
  analytics   Boolean  @default(false)
  preferences Boolean  @default(false)
  marketing   Boolean  @default(false)
  action      String   // accept_all | reject_all | custom | withdraw
  source      String   // banner | footer | form | api
  ipHash      String?  // HMAC, truncated; never raw IP
  userAgentFamily String?
  createdAt   DateTime @default(now())
  withdrawnAt DateTime?

  @@index([subjectKey, createdAt(sort: Desc)])
  @@index([version])
}
```

Retention: life of processing + 3 years. Do not store raw IP or full user-agent.

### IMP-07 — DSAR intake

**Public form:** `app/privacy/request/page.tsx` + `POST /api/privacy/requests`.

Request body:

```json
{
  "type": "access | rectification | erasure | restriction | objection | portability",
  "name": "string",
  "email": "string",
  "details": "string (optional)",
  "relationship": "visitor | applicant | trainee | client | other"
}
```

Server behaviour:

1. Rate limit (5/hour per IP + email).
2. Create `PrivacyRequest` with `status = PENDING_VERIFICATION`, `dueAt = now + 30 days`, `verificationTokenHash`, `verificationExpiresAt = now + 24h`.
3. Send a verification email with a single-use link; do not reveal whether the email exists (always return `202`).
4. On verification, set `status = VERIFIED`, notify the privacy lead, and start the SLA clock.
5. Provide a status page via token (`GET /api/privacy/requests/:token`), showing only status and due date.

`PrivacyRequest` model:

```prisma
model PrivacyRequest {
  id            String   @id @default(uuid())
  type          String
  name          String
  email         String
  relationship  String?
  details       String?
  status        String   @default("PENDING_VERIFICATION")
  verificationTokenHash String?
  verificationExpiresAt DateTime?
  verifiedAt    DateTime?
  dueAt         DateTime
  extendedAt    DateTime?
  completedAt   DateTime?
  outcome       String?
  legalHold     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([email])
  @@index([status, dueAt])
}
```

**Admin console:** list/filter requests, assign owner, extend deadline (with reason), record outcome, download audit trail. Log every action in `ActivityLog` without copying the request contents.

### IMP-08 — Data export endpoint

**Route:** `GET /api/privacy/export` (authenticated) or `POST /api/privacy/export` with re-authentication for sensitive accounts.

**Response:** `application/json` (or ZIP with JSON + files), `Content-Disposition: attachment; filename="qhsse-export-YYYY-MM-DD.json"`, `Cache-Control: no-store`.

**Payload schema:**

```json
{
  "schemaVersion": "1.0",
  "exportedAt": "2026-10-27T10:00:00Z",
  "subject": { "userId": "...", "name": "...", "email": "...", "phone": "...", "language": "..." },
  "consents": [{ "version": "...", "categories": {}, "createdAt": "..." }],
  "contactRequests": [{ "id": "...", "message": "...", "status": "...", "createdAt": "..." }],
  "jobApplications": [{ "id": "...", "jobTitle": "...", "coverLetter": "...", "resume": { "filename": "...", "mimeType": "...", "base64": "..." }, "status": "...", "createdAt": "..." }],
  "training": { "enrollments": [], "attempts": [], "certificates": [] },
  "client": { "company": "...", "documents": [{ "title": "...", "mimeType": "...", "downloadUrl": "..." }] },
  "activity": [{ "action": "...", "createdAt": "..." }],
  "notes": ["Data retained for legal/tax/liability reasons is listed but may be redacted."]
}
```

**Rules:**

- Scope strictly to the authenticated subject; admins must use a separate, audited DSAR tool, not this endpoint.
- Do not include other people’s data (e.g., admin notes about the subject may be redacted under Art. 15(4)).
- Include CVs/client documents only if the subject provided them; use short-lived signed URLs rather than embedding huge base64 where possible.
- Rate limit: 1 export/hour; log `PRIVACY_EXPORT` with actor, subject, timestamp.
- For password accounts, require password re-entry; for Google accounts, require a fresh email OTP.

### IMP-09 — Account deletion endpoint

**Route:** `POST /api/privacy/delete` (authenticated) with body:

```json
{ "confirm": "DELETE", "password": "optional for OAuth", "reason": "optional" }
```

**Flow:**

1. Re-authenticate (password or email OTP).
2. Check for legal holds: active client contract, open invoice/tax record, certificate retention, security incident, or pending DSAR. If a hold applies, return `409` with a generic explanation and the contact channel.
3. Set `deletionRequestedAt`, `deletionScheduledFor = now + 30 days`, disable login, and hide the profile from public views immediately.
4. Send a confirmation email with a cancellation link (grace period).
5. At the end of the grace period, a retention job:
   - deletes/anonymises `User`, `Client` (if no legal hold), `TrainingEnrollment`/`TrainingAttempt` (except certificate records), `ActivityLog` (anonymise actor), and client documents per DPA;
   - deletes contact requests and job applications by verified email (unless legal hold);
   - deletes the visitor session if the visitor key is known;
   - writes a deletion certificate/audit entry with counts, not contents.
6. Backups expire within 35 days; document this limitation.

**Responses:** `202 Accepted` (scheduled), `409 Conflict` (legal hold), `401` (re-auth failed), `429` (rate limit).

### IMP-10 — Admin deletion/withdrawal routes

- `DELETE /api/contact/:id` — admin only; hard delete or anonymise; log `CONTACT_DELETED`.
- `DELETE /api/job-applications/:id` — admin only; delete CV object + record; log `JOB_APPLICATION_DELETED`.
- `POST /api/job-applications/:id/withdraw` — applicant via signed token; sets `WITHDRAWN` and deletes CV after confirmation.
- `DELETE /api/client-documents/:id` — client (own documents) or admin; log; delete object.
- `DELETE /api/training/profile` — trainee account deletion (delegates to IMP-09).
- All deletion routes: `Cache-Control: no-store`, CSRF/Origin check, confirmation, audit, legal-hold check.

### IMP-11 — IP address and user-agent minimisation

**Principles:** collect the minimum needed; never store full IP for analytics; hash for rate limiting; truncate for security logs; drop city and full UA.

**Algorithm (IPv4 /24, IPv6 /48):**

```ts
import { isIP } from 'node:net'
import { createHmac } from 'node:crypto'

export function truncateIp(input?: string | null): string | null {
  if (!input) return null
  const ip = input.trim()
  const version = isIP(ip)
  if (version === 4) {
    const [a, b, c] = ip.split('.')
    return `${a}.${b}.${c}.0`
  }
  if (version === 6) {
    const normalised = expandIpv6(ip) // implement per RFC 5952; helper omitted
    return `${normalised.slice(0, 3).join(':')}::`
  }
  return null
}

export function hashIp(input: string): string {
  const salt = process.env.RATE_LIMIT_SALT
  if (!salt || salt.length < 32) throw new Error('RATE_LIMIT_SALT must be 32+ characters')
  return createHmac('sha256', salt).update(input).digest('hex').slice(0, 32)
}
```

**Header parsing:**

- Read `x-forwarded-for` only when the request is known to come from a trusted proxy (e.g., `x-vercel-id` present, or a configured `TRUSTED_PROXY=true` and an allowlisted remote address).
- Take the first valid IP; validate with `isIP`; discard invalid/oversized values.
- Do not store the raw header; store `truncatedIp` and/or `ipHash`.
- Do not trust client-supplied `x-forwarded-for` when the app is directly exposed.

**Data model changes:**

```prisma
model VisitorSession {
  // ...
  ipHash        String?  // HMAC for dedupe/security, optional
  ipTruncated   String?  // /24 or /48, delete after 24h
  browserFamily String?
  osFamily      String?
  deviceType    String?
  routeTemplate String?  // e.g. /training/certificate/:code
  // remove city, full userAgent
}
```

**User-agent:** parse to `browserFamily` (Chrome/Safari/Firefox/Edge/Other), `osFamily` (Windows/macOS/iOS/Android/Linux/Other), `deviceType` (desktop/mobile/tablet/bot). Drop the full string. Do not use UA for fingerprinting.

**Geo:** store `countryCode` and optional `region`; drop `city`. Use geo only for aggregate reporting.

**ActivityLog:** store `ipHash` or `ipTruncated`, not the raw header; 12-month retention; anonymise after 90 days.

### IMP-12 — Path normalisation and analytics exclusions

- In `VisitorTracker`, map `pathname` to a route template:
  - `/training/certificate/:code`
  - `/training/verify`
  - `/jobs` (no dynamic segments)
  - `/services/:slug` if applicable
  - `/training/:slug` (course slug is not sensitive, but keep allowlist)
- Remove query strings and hashes.
- Exclude: `/admin/*`, `/dashboard/*`, `/login`, `/register`, `/training/certificate/*`, `/training/verify`, `/api/*`.
- Reject paths longer than 200 characters; allow only `^/[a-zA-Z0-9/_-]*$` after templating.
- Never send emails, tokens, certificate codes, or client IDs.

### IMP-13 — Retention cron

**Scheduler:** Vercel Cron if deployed on Vercel; otherwise a platform scheduler (Supabase `pg_cron`, GitHub Actions, or a secured external cron).

`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/retention", "schedule": "0 2 * * *" }
  ]
}
```

**Route:** `app/api/cron/retention/route.ts`

```ts
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // run jobs, return counts (no PII)
}
```

Vercel Cron automatically sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set. For other schedulers, send the header explicitly.

**Jobs (run daily, in this order):**

| Job | Cutoff | Action | Batch |
|---|---|---|---|
| `visitor_raw` | `lastSeenAt < now - 30d` | Aggregate country/route counts, then delete raw rows | 1,000 |
| `visitor_ip` | `lastSeenAt < now - 1d` | Set `ipTruncated = null` | 1,000 |
| `rate_limit` | `resetAt < now - 1d` | Delete | 5,000 |
| `contact_retention` | `updatedAt < now - 12mo` (closed or stale) | Delete/anonymise unless `legalHold` | 500 |
| `job_rejected` | `status = REJECTED AND updatedAt < now - 6mo` | Delete CV object + record unless `legalHold` | 500 |
| `job_all` | `createdAt < now - 12mo` | Delete unless talent-pool consent/legal hold | 500 |
| `client_documents` | contract terminated + 30d, or client instruction | Return/delete object and record unless `legalHold`; issue deletion certificate | 200 |
| `reports` | report date < now - 7y | Delete/anonymise unless `legalHold`; retain aggregates | 200 |
| `financial` | record date < now - 7y | Delete unless `legalHold`; confirm tax period | 200 |
| `consent_records` | withdrawn/completed + 3y | Delete | 500 |
| `activity_log` | `createdAt < now - 12mo` | Delete; anonymise IP after 90d | 1,000 |
| `inactive_users` | `last login < now - 24mo` and no active contract | Anonymise/delete; keep certificates | 200 |
| `certificate_public` | certificate expired + 1y | Disable public verification | 200 |
| `privacy_requests` | completed + 3y | Delete | 200 |

**Backups:** configure the provider lifecycle to expire backups after 35 days, verify quarterly, and document the result. Backup expiry is a provider control, not an application cron job.

**Prisma changes:**

```prisma
model RetentionRun {
  id         String   @id @default(uuid())
  job        String
  startedAt  DateTime @default(now())
  finishedAt DateTime?
  deleted    Int      @default(0)
  anonymised Int      @default(0)
  status     String   @default("RUNNING")
  error      String?
}

model VisitorSession {
  // ...
  ipTruncated String?
  legalHold   Boolean @default(false)
}
```

Add `legalHold Boolean @default(false)` and `deletedAt DateTime?` to `ContactRequest`, `JobApplication`, `ClientDocument`, `Report`, `FinancialRecord`, and `User` as needed.

**Operational requirements:**

- Idempotent; safe to re-run.
- Advisory lock (`pg_try_advisory_lock`) to prevent concurrent runs.
- Dry-run mode: `?dryRun=1`, admin-only, returns counts without deleting.
- Log counts to `RetentionRun`; never log PII.
- Alert on failure and on unexpected zero counts (stale job).
- Run in staging first; verify with seeded dates.
- Document backup expiry (35 days) and legal-hold exceptions.
- Add a monthly retention report for management.

### IMP-14 — Security hardening backlog

| ID | Requirement | Acceptance |
|---|---|---|
| SEC-01 | Remove hard-coded seed credentials; require `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`; never reset existing passwords; block seed in production unless `ALLOW_PROD_SEED=true` | `git grep admin123` returns nothing; seed fails closed without env; production seed refuses |
| SEC-02 | Add TOTP MFA for `ADMIN`; recovery codes; enforce enrolment before admin access | Admin login requires a second factor; recovery codes are hashed |
| SEC-03 | Shorten admin sessions to 8 hours; rotate JWT; revoke on password/role change | Stolen cookie expires quickly; password change invalidates sessions |
| SEC-04 | Add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` | Header present on HTTPS responses |
| SEC-05 | Add `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `X-Permitted-Cross-Domain-Policies: none` | Headers present |
| SEC-06 | Replace `'unsafe-inline'` CSP with nonces/hashes; remove `data:` from `frame-src` | CSP validated; app works without inline scripts |
| SEC-07 | Add Origin/Referer validation + CSRF token to custom `POST/PATCH/DELETE` routes | Cross-origin form posts rejected |
| SEC-08 | Require `RATE_LIMIT_SALT` (32+ bytes); remove `qhsse-rate-limit` fallback; rotate quarterly | App fails closed if missing; no default hash |
| SEC-09 | Generic error responses; correlation IDs; no table/schema names | Contact route no longer reveals missing table |
| SEC-10 | Add `/.well-known/security.txt` with security contact and disclosure policy | File served |
| SEC-11 | Add dependency scanning (`npm audit`, Dependabot), SAST, and annual penetration test | CI fails on high/critical; report on file |
| SEC-12 | Add read/download audit logs for CVs, client documents, exports, deletions | `ActivityLog` records actor/action/record/time/IP hash |
| SEC-13 | Add admin access reviews (quarterly) and least-privilege roles | Review evidence; no shared admin |
| SEC-14 | Add backup encryption, 35-day retention, quarterly restore test | Restore report; encryption confirmed |
| SEC-15 | Add email authentication (SPF/DKIM/DMARC) and a business email provider with DPA | DNS records; DPA on file |
| SEC-16 | Add malware scanning and content disarm for uploads; re-encode images; strip macros | EICAR test blocked; macros removed |
| SEC-17 | Add `noindex`/auth protection for admin/dashboard and rate-limit alerts for bulk downloads | Search engines cannot index; alerts fire |
| SEC-18 | Add password reset with single-use, 1-hour tokens; notify on password/email change | Flow tested; token invalidated after use |

### IMP-15 — Processor and transfer governance

1. **Processor register** (Appendix B): name, service, data categories, location, sub-processors, DPA date, transfer mechanism, security evidence, review date.
2. **DPAs:** Supabase, hosting/CDN, email, Google (OAuth), any object-storage provider, accountant/lawyer if processors.
3. **SCCs/TIA:** for EU/EEA data transferred to non-adequate countries; document the assessment and supplementary measures.
4. **Egypt/UAE transfer review:** confirm whether a permit/exception is required; document the chosen mechanism; consider local hosting for Egyptian data.
5. **Sub-processor notice:** publish a list or provide it to clients; give notice of material changes and a right to object.
6. **Vendor due diligence:** security questionnaire, breach notification clause, deletion/return clause, audit rights, insurance.
7. **Data processing instructions:** for client portal data, document the client’s instructions and QHSSE’s obligations.
8. **Annual review:** update the register; re-assess transfers and vendor security.

### IMP-16 — Breach response and notification

**Runbook sections:**

1. **Roles:** incident lead, privacy lead, IT/security, communications, legal counsel.
2. **Detection:** alerts (bulk export, failed logins, unusual admin activity, malware), user reports, vendor notices.
3. **Containment:** revoke sessions, rotate secrets, disable affected accounts, isolate systems, preserve evidence.
4. **Assessment:** data categories, number of subjects, sensitivity, likelihood/severity of harm, cross-border exposure.
5. **Notification decision:**
   - GDPR: supervisory authority within 72 hours unless unlikely to result in risk; data subjects without undue delay if high risk.
   - Egypt: Personal Data Protection Center and affected persons as required.
   - UAE: UAE Data Office and data subjects as required.
   - Clients: notify without undue delay where QHSSE is a processor; follow the DPA.
6. **Communication:** templates in Arabic and English; no speculation; provide contact and remediation.
7. **Register:** date, facts, effects, remedial actions, notifications, evidence.
8. **Post-incident:** root cause, control improvements, tabletop exercise annually.

### IMP-17 — ROPA, DPIA, and privacy by design

**ROPA (GDPR Art. 30):** one row per activity in section 4.1, with purpose, categories, recipients, transfers, retention, security measures, and owner. Review quarterly.

**DPIA triggers:**

- Systematic monitoring of visitors (analytics, geolocation) — likely required.
- Large-scale processing of client documents that may include health/safety data.
- New technology (biometrics, AI, automated decision-making).
- Cross-border transfers without an adequacy decision.

**DPIA content:** description, necessity/proportionality, risks to rights, mitigations, residual risk, sign-off, review date.

**Privacy by design checklist for new features:**

- What personal data is collected? Can it be avoided?
- What is the lawful basis and notice?
- Where is it stored, for how long, and who can access it?
- Is it transferred? What safeguards?
- How are rights/erasure handled?
- What are the security controls and logging?
- Has a DPIA been done?

### IMP-18 — Certificate verification minimisation

- Display: first name + family initial (or full name only if the trainee consented), course, issue date, valid/invalid status.
- Make score display opt-in; default hidden.
- Add a notice: “This page confirms the authenticity of a certificate. It does not display contact details.”
- Use high-entropy codes (≥128 bits) and rotate/revoke compromised codes.
- Rate limit by IP + code; do not store the code in analytics.
- Provide an objection/removal route for trainees; honour it unless verification is legally required.

### IMP-19 — Data minimisation and purpose limitation

- Remove `city` and full user-agent from visitor analytics.
- Do not store full IP; truncate/hash.
- Do not store certificate codes in paths.
- Make `company` and `phone` optional in job applications (already optional); consider removing `company` if not needed.
- Do not collect national ID, date of birth, marital status, religion, or health data in forms. Add a CV warning.
- Do not use contact/job data for marketing without separate consent.
- Do not use client documents for QHSSE marketing or model training.
- Retain only what the retention schedule allows.

### IMP-20 — Training and governance

- Annual privacy/security training for all staff; role-specific training for admins and consultants.
- Confidentiality undertakings in employment/contractor agreements.
- Privacy lead/DPO appointment (even if not legally required, name a contact).
- Written incident response, DSAR, retention, and vendor management procedures.
- Quarterly compliance review; annual policy review.
- Board/management sign-off on the privacy programme.
- Metrics: consent rate, DSAR SLA, retention job success, incidents, training completion, vendor DPA coverage.

---

## 9. Roadmap

### Phase 0 — Immediate (0-14 days)

| Action | Owner | Evidence |
|---|---|---|
| Remove seed default password; rotate admin credentials; add MFA | Engineering | Commit + login test |
| Publish privacy policy, terms, cookie notice; fix footer links | Legal/Web | Live pages |
| Add consent banner and server-side gating | Engineering | Acceptance tests IMP-01 |
| Stop storing city/full UA/full IP; exclude certificate paths | Engineering | Schema/API diff |
| Add consent checkboxes/notices to contact, jobs, registration | Engineering | UI screenshots |
| Add `DELETE` for contact/job applications; DSAR intake | Engineering | API tests |
| Start retention cron in dry-run | Engineering | Dry-run report |

**Sequencing note:** do not publish the full policy until the Phase 0 consent, minimisation, and deletion controls are live. If a notice is needed sooner, publish a short interim notice that accurately describes current processing and states the remediation timeline.

### Phase 1 — 30 days

| Action | Owner | Evidence |
|---|---|---|
| Enforce retention schedule; add legal holds | Engineering | RetentionRun logs |
| Build export/delete endpoints; admin DSAR console | Engineering | Test cases |
| Execute DPAs/SCCs; build processor register | Legal/Procurement | Signed DPAs |
| Complete ROPA and DPIA for analytics/client data | Legal | Documents |
| Adopt breach response runbook | Legal/IT | Runbook + tabletop |
| Security headers/CSP/CSRF hardening | Engineering | Header scan |
| Move CVs/client docs to private object storage (design + pilot) | Engineering | Architecture decision |

### Phase 2 — 90 days

| Action | Owner | Evidence |
|---|---|---|
| Complete object-storage migration; signed URLs; AV scanning | Engineering | Migration report |
| MFA enforced; session revocation; admin audit logs | Engineering | Config + logs |
| Minimise certificate verification; add notice/objection | Product/Legal | UI + API |
| Client DPA rollout; sub-processor list | Legal | Signed DPAs |
| Backup retention/restore testing | IT | Restore report |
| Privacy training | HR/Legal | Completion records |

### Phase 3 — 180 days

| Action | Owner | Evidence |
|---|---|---|
| Penetration test and remediation | Security | Report |
| Annual policy/ROPA/DPIA review | Legal | Review minutes |
| Vendor audits | Procurement | Questionnaires |
| Privacy metrics dashboard | Engineering/Legal | Dashboard |
| Tabletop breach exercise | Legal/IT | Exercise report |

---

## 10. Verification and evidence

### 10.1 Test cases

| ID | Test | Expected |
|---|---|---|
| T-01 | Fresh browser, no consent | No visitor key, no tracking request |
| T-02 | Reject all | Cookie analytics=false; no tracking after reload |
| T-03 | Accept all | Tracking starts; no full IP/UA/city in DB |
| T-04 | Withdraw consent | Tracking stops; existing session deleted/anonymised |
| T-05 | GPC enabled | Analytics defaults off; no tracking |
| T-06 | Certificate page | Path stored as `/training/certificate/:code`; no code |
| T-07 | Contact form without checkbox | Submit blocked; notice visible |
| T-08 | Job application deletion | CV object and record deleted; audit log entry |
| T-09 | DSAR access | Export contains all subject data; no third-party data |
| T-10 | DSAR erasure with legal hold | 409; no deletion; reason logged |
| T-11 | Retention dry-run | Correct counts; no deletion |
| T-12 | Retention live run | Old rows deleted; aggregates retained |
| T-13 | Seed without env | Fails; no default password |
| T-14 | Admin login without MFA | Blocked |
| T-15 | CSP/HSTS scan | Headers present; no unsafe-inline |
| T-16 | Malware upload | Blocked/quarantined |
| T-17 | Signed URL expiry | 403 after 60 seconds |
| T-18 | Cross-origin POST | Rejected |

### 10.2 Evidence to retain

- Signed DPAs/SCCs and processor register.
- ROPA and DPIA versions.
- Consent records and banner screenshots (AR/EN).
- Retention run logs and monthly reports.
- DSAR log and responses.
- Breach register and tabletop report.
- Security scan/penetration test reports.
- Training completion records.
- Backup restore reports.
- Vendor due-diligence questionnaires.

---

## 11. Residual risks and caveats

1. **Legal interpretation:** Egypt PDPL Executive Regulations, UAE PDPL Executive Regulations, and adequacy/transfer positions may change. Confirm with local counsel before publishing notices or relying on a transfer mechanism.
2. **Deployment facts:** the actual Supabase region, hosting provider, CDN, SMTP provider, backup retention, and access controls are not visible in the repository. They must be confirmed and documented.
3. **Client data:** client documents may contain special-category data (health, biometric, criminal). The client is responsible for its own basis, but QHSSE must provide appropriate processor safeguards.
4. **Base64 migration:** until files are moved to object storage, the risk of bulk exposure remains even if the UI is improved.
5. **Seed/demo data:** the seed script includes demo clients and reports; ensure it is never run against production and purge demo data if it was.
6. **No runtime testing:** findings are based on static review; a penetration test and configuration review are still required.
7. **Arabic drafts:** the drafts are not legal advice and must not be published with placeholders or unverified claims.

---

## Appendix A — Data inventory (quick reference)

| Model | Key personal data | Retention | Sensitivity |
|---|---|---|---|
| `User` | Name, email, phone, password hash, language, role | Active + 24 months | High |
| `Client` | Company, contact info, phone, address, logo | Contract + 7 years | High |
| `ClientDocument` | Title, file (base64), filename, MIME, size | Contract + 30 days | Very high |
| `ContactRequest` | Name, company, email, phone, message | 12 months | Medium |
| `JobApplication` | Name, email, phone, company, CV (base64), cover letter | 6/12 months | Very high |
| `VisitorSession` | Visitor key, IP, UA, geo, path, page views | 30 days raw | Medium |
| `ActivityLog` | User, action, entity, details, IP | 12 months | Medium |
| `RateLimitEntry` | Hashed IP + discriminator, counter | 24h after reset | Low |
| `Report` / `Observation` / `Image` | Site, notes, risk, images | 7 years | High |
| `FinancialRecord` | Amount, currency, status, notes | 7 years | High |
| `TrainingEnrollment` / `TrainingAttempt` | User, course, score, answers, certificate | 7 years (certificate) / 24 months (attempts) | Medium |
| `TrainingQuestion` | Client responses, corrective actions | Per course/contract | Medium |

## Appendix B — Processor register template

| Field | Example |
|---|---|
| Processor | Supabase |
| Service | PostgreSQL hosting |
| Data categories | All portal records, including CVs and client documents |
| Data subjects | Visitors, applicants, trainees, client staff |
| Location / region | `[confirm]` |
| Sub-processors | AWS (confirm) |
| DPA signed | `[date / link]` |
| Transfer mechanism | SCCs + TIA / adequacy |
| Security evidence | SOC 2 / ISO 27001 report (confirm) |
| Breach notification | `[clause]` |
| Deletion/return | `[clause]` |
| Review date | `[date]` |

## Appendix C — DSAR log template

| Field | Description |
|---|---|
| Request ID | UUID |
| Received date | Date/time |
| Requester | Name/email (restricted access) |
| Relationship | Visitor/applicant/trainee/client |
| Type | Access/rectification/erasure/restriction/objection/portability |
| Verification method | Password/email OTP/ID (do not store ID copies) |
| Due date | Received + 30 days |
| Extension | Reason/date |
| Search scope | Systems/models checked |
| Outcome | Provided/erased/partially refused |
| Refusal basis | Legal hold/tax/certificate/third-party rights |
| Completed date | Date/time |
| Reviewer | Name |

## Appendix D — Consent banner copy (AR/EN)

**Arabic**

> **خصوصيتك تهمنا**
> نستخدم ملفات تعريف الارتباط والتخزين المحلي لتشغيل الموقع وتحسينه. يمكنك قبول الكل أو رفض غير الضروري أو تخصيص اختياراتك. لا نستخدم ملفات تعريف ارتباط إعلانية.
> [قبول الكل] [رفض الكل] [تخصيص]
> لمزيد من المعلومات، راجع [سياسة الخصوصية].

**English**

> **Your privacy matters**
> We use cookies and local storage to run and improve the site. You can accept all, reject non-essential, or customise your choices. We do not use advertising cookies.
> [Accept all] [Reject all] [Customise]
> For more information, see our [Privacy Policy].

## Appendix E — References

- GDPR (EU) 2016/679, especially Arts. 5-7, 12-22, 25, 28, 30, 32-35, 44-49.
- ePrivacy Directive 2002/58/EC, Art. 5(3).
- Egypt: Personal Data Protection Law No. 151 of 2020 (Executive Regulations status to be confirmed).
- UAE: Federal Decree-Law No. 45 of 2021 on Personal Data Protection (Executive Regulations/guidance to be confirmed).
- DIFC Data Protection Law No. 5 of 2020; ADGM Data Protection Regulations 2021 (if applicable).
- UK GDPR and PECR (if applicable).
- OWASP ASVS/Top 10 for security controls (reference, not a legal standard).
- ISO/IEC 27701 and 27001 as optional governance frameworks (not certifications claimed here).

---

*End of report. No application code was modified. The only files created are this audit and the two Arabic legal drafts under `docs/legal/`.*

