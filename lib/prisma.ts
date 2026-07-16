import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getRuntimeDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) return undefined

  try {
    const url = new URL(databaseUrl)

    // Supabase's transaction pooler (port 6543) does not support Prisma's
    // prepared statements reliably. Use the shared session pooler for runtime
    // traffic instead, where prepared statements are supported.
    if (url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543') {
      url.port = '5432'
      url.searchParams.delete('pgbouncer')
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

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
