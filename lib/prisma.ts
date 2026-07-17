import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getRuntimeDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) return undefined

  try {
    const url = new URL(databaseUrl)

    // Serverless instances must use Supabase's transaction pooler. The session
    // pooler has a small fixed client cap and is exhausted when Vercel scales.
    // Prisma's PgBouncer mode avoids prepared-statement collisions on pooled
    // connections and one connection per instance prevents connection storms.
    if (url.hostname.endsWith('.pooler.supabase.com')) {
      url.port = '6543'
      url.searchParams.set('pgbouncer', 'true')
      url.searchParams.set('connection_limit', '1')
    }

    return url.toString()
  } catch {
    // Preserve Prisma's normal configuration error for an invalid URL.
    return databaseUrl
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    datasources: {
      db: {
        url: getRuntimeDatabaseUrl(),
      },
    },
  })

// Reusing one client per warm runtime is important in serverless production as
// well; otherwise separate bundled modules can each consume a pool connection.
globalForPrisma.prisma = prisma
