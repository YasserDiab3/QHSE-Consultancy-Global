import { prisma } from '@/lib/prisma'

export type PurgeResult = {
  purgedVisitors: number
  purgedRateLimits: number
  visitorCutoffDate: string
  executedAt: string
}

/**
 * Purges expired temporary data according to privacy compliance & storage retention policies:
 * - RateLimitEntry: rows whose resetAt is in the past.
 * - VisitorSession: rows whose lastSeenAt is older than visitorRetentionDays (default: 90 days).
 */
export async function purgeExpiredData(options: { visitorRetentionDays?: number } = {}): Promise<PurgeResult> {
  const visitorRetentionDays = options.visitorRetentionDays ?? 90
  const now = new Date()
  const visitorCutoff = new Date(now.getTime() - visitorRetentionDays * 24 * 60 * 60 * 1000)

  // 1. Purge expired rate limit entries
  const rateLimitResult = await prisma.rateLimitEntry.deleteMany({
    where: {
      resetAt: {
        lt: now,
      },
    },
  })

  // 2. Purge stale visitor sessions
  const visitorResult = await prisma.visitorSession.deleteMany({
    where: {
      lastSeenAt: {
        lt: visitorCutoff,
      },
    },
  })

  return {
    purgedVisitors: visitorResult.count,
    purgedRateLimits: rateLimitResult.count,
    visitorCutoffDate: visitorCutoff.toISOString(),
    executedAt: now.toISOString(),
  }
}
