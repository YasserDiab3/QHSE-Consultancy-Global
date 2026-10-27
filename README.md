# QHSSE Consultant Portal

A bilingual (Arabic/English) Next.js portal for a quality, health, safety and environmental consultancy. It includes the public marketing site, client portal, training and certification flow, and an admin workspace.

## Stack

- Next.js 16 (App Router, Turbopack)
- React 18, TypeScript, Tailwind CSS 3
- Prisma 5 + PostgreSQL (Supabase)
- NextAuth (credentials and optional Google sign-in)
- Supabase Storage for uploaded files (optional, with database fallback)

## Getting started

```bash
npm install
cp .env.example .env
npm run db:generate
npm run dev
```

Open <http://localhost:3000>.

### Required environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL connection used by the app |
| `DIRECT_URL` | Direct PostgreSQL connection used by Prisma migrations |
| `NEXTAUTH_URL` | Public URL of the application |
| `NEXTAUTH_SECRET` | Random secret used to sign session tokens |
| `NEXT_PUBLIC_APP_URL` | Canonical URL used in metadata, sitemap and emails |

Optional integrations:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_SIGN_IN_ENABLED`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`

### File storage

Uploaded evidence images, CVs, client documents and client logos are written to Supabase Storage when `SUPABASE_SERVICE_ROLE_KEY` is present. Create a **private** bucket (default name `qhsse-documents`) before enabling it.

Without the service-role key, uploads fall back to base64 data URLs in PostgreSQL so the app keeps working. That fallback is intended for local development only; it increases database size and should not be used for production traffic.

Files stored in Supabase are served through `/api/files/[...key]`, which checks the session, verifies that the client owns the document or report image, then redirects to a short-lived signed URL. Admin users can access all files, including job-application CVs.

## Database

```bash
npm run db:migrate:deploy   # apply committed migrations
npm run db:push             # existing workflow for schema-only environments
npm run db:seed             # seed an admin account
```

Seeding is non-destructive:

- `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are required in production.
- Existing admin passwords are never reset unless `SEED_FORCE_ADMIN_PASSWORD=true`.
- Demo clients and reports are only created when `SEED_DEMO_DATA=true`.

## API pagination

List endpoints accept optional `page` and `pageSize` query parameters (`pageSize` is capped at 200).

```http
GET /api/job-applications?page=2&pageSize=25
```

When pagination parameters are supplied, the response is:

```json
{
  "items": [],
  "pagination": {
    "page": 2,
    "pageSize": 25,
    "total": 61,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": true
  }
}
```

Requests without pagination parameters keep the legacy array shape and are bounded to 500 rows. `X-Total-Count`, `X-Page` and `X-Page-Size` headers are always returned for these endpoints.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run check   # lint + typecheck + tests + production build
```

CI runs the same checks on pushes to `main` and on pull requests.

## Project structure

```
app/                 App Router pages and API routes
components/          Shared UI and portal components
context/             Language provider and dictionaries
lib/                 Auth, Prisma helpers, validation, PDFs, storage
prisma/              Schema, migrations and seed script
public/locales/      Arabic and English translation dictionaries
tests/               Node test-runner unit tests
docs/audit/          Specialist audit reports and remediation notes
docs/legal/          Draft legal source material (Arabic)
```

## Security notes

- Security headers (CSP, HSTS, frame denial, permissions policy) are configured in `next.config.js`.
- Analytics requires explicit consent; IP addresses are anonymised before storage.
- Uploaded files are validated by content signature, not only by extension.
- Passwords are hashed with bcrypt; registration requires at least 10 characters.
- Report and certificate PDFs are generated in the browser without sending client data to a third party.
