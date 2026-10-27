import { prisma } from '@/lib/prisma'

export const MAX_FAILED_LOGIN_ATTEMPTS = 5
export const LOCKOUT_DURATION_MINUTES = 15
export const LOCKOUT_WINDOW_MS = LOCKOUT_DURATION_MINUTES * 60 * 1000

type MemoryLockoutState = {
  count: number
  lockedUntil?: Date
  resetAt: Date
}

// In-memory bucket to preserve brute-force protection even if the DB has transient connection latency
const memoryLockoutStore = new Map<string, MemoryLockoutState>()

export type LockoutCheckResult = {
  locked: boolean
  remainingMinutes?: number
  remainingSeconds?: number
}

export type RecordAttemptResult = {
  locked: boolean
  attemptsLeft: number
  remainingMinutes?: number
}

export function normalizeAuthEmail(email: string): string {
  return email ? email.toLowerCase().trim() : ''
}

export function clearMemoryLockoutStore(): void {
  memoryLockoutStore.clear()
}

/**
 * Checks whether an account is currently locked due to too many failed attempts.
 */
export async function checkAccountLockout(email: string): Promise<LockoutCheckResult> {
  const normalized = normalizeAuthEmail(email)
  if (!normalized) return { locked: false }

  const lockoutKey = `auth:lockout:${normalized}`
  const now = new Date()

  // 1. Check in-memory store
  const memory = memoryLockoutStore.get(normalized)
  if (memory?.lockedUntil && memory.lockedUntil > now) {
    const diffMs = memory.lockedUntil.getTime() - now.getTime()
    return {
      locked: true,
      remainingMinutes: Math.max(1, Math.ceil(diffMs / (60 * 1000))),
      remainingSeconds: Math.max(1, Math.ceil(diffMs / 1000)),
    }
  }

  // 2. Check database
  try {
    const entry = await prisma.rateLimitEntry.findUnique({
      where: { key: lockoutKey },
    })

    if (entry && entry.resetAt > now) {
      const diffMs = entry.resetAt.getTime() - now.getTime()
      return {
        locked: true,
        remainingMinutes: Math.max(1, Math.ceil(diffMs / (60 * 1000))),
        remainingSeconds: Math.max(1, Math.ceil(diffMs / 1000)),
      }
    }

    if (entry && entry.resetAt <= now) {
      // Lockout expired, clean up entry
      prisma.rateLimitEntry.delete({ where: { key: lockoutKey } }).catch(() => {})
    }
  } catch (error) {
    console.warn('[Lockout] DB check fallback to memory:', error)
  }

  return { locked: false }
}

/**
 * Records a failed login attempt for the given email.
 * If consecutive failures hit the threshold (5), triggers an immediate 15-minute account lockout.
 */
export async function recordFailedAttempt(email: string): Promise<RecordAttemptResult> {
  const normalized = normalizeAuthEmail(email)
  if (!normalized) {
    return { locked: false, attemptsLeft: MAX_FAILED_LOGIN_ATTEMPTS }
  }

  const attemptsKey = `auth:attempts:${normalized}`
  const lockoutKey = `auth:lockout:${normalized}`
  const now = new Date()
  const resetAt = new Date(now.getTime() + LOCKOUT_WINDOW_MS)

  let attemptCount = 1

  // Update in-memory fallback
  const mem = memoryLockoutStore.get(normalized)
  if (mem && mem.resetAt > now) {
    mem.count += 1
    attemptCount = mem.count
  } else {
    memoryLockoutStore.set(normalized, { count: 1, resetAt })
    attemptCount = 1
  }

  // Update PostgreSQL database
  try {
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      INSERT INTO "RateLimitEntry" ("key", "count", "resetAt", "createdAt", "updatedAt")
      VALUES (${attemptsKey}, 1, ${resetAt}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("key") DO UPDATE
      SET
        "count" = CASE
          WHEN "RateLimitEntry"."resetAt" <= CURRENT_TIMESTAMP THEN 1
          ELSE "RateLimitEntry"."count" + 1
        END,
        "resetAt" = ${resetAt},
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING "count"
    `

    if (rows?.[0]?.count) {
      attemptCount = rows[0].count
      // Synchronize in-memory count
      const updatedMem = memoryLockoutStore.get(normalized)
      if (updatedMem) updatedMem.count = attemptCount
    }
  } catch (error) {
    console.warn('[Lockout] DB raw insert failed, using memory fallback:', error)
  }

  // Check if threshold has been reached
  if (attemptCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
    const lockedUntil = new Date(now.getTime() + LOCKOUT_WINDOW_MS)

    // Lock in memory
    const existing = memoryLockoutStore.get(normalized)
    if (existing) {
      existing.lockedUntil = lockedUntil
    } else {
      memoryLockoutStore.set(normalized, { count: attemptCount, lockedUntil, resetAt: lockedUntil })
    }

    // Lock in database
    try {
      await prisma.rateLimitEntry.upsert({
        where: { key: lockoutKey },
        create: {
          key: lockoutKey,
          count: attemptCount,
          resetAt: lockedUntil,
        },
        update: {
          count: attemptCount,
          resetAt: lockedUntil,
        },
      })

      // Remove the attempts key since account is locked
      await prisma.rateLimitEntry.deleteMany({
        where: { key: attemptsKey },
      }).catch(() => {})
    } catch (error) {
      console.warn('[Lockout] DB lockout upsert fallback:', error)
    }

    return {
      locked: true,
      attemptsLeft: 0,
      remainingMinutes: LOCKOUT_DURATION_MINUTES,
    }
  }

  return {
    locked: false,
    attemptsLeft: Math.max(0, MAX_FAILED_LOGIN_ATTEMPTS - attemptCount),
  }
}

/**
 * Resets failed attempts and unlocks account on successful authentication.
 */
export async function resetFailedAttempts(email: string): Promise<void> {
  const normalized = normalizeAuthEmail(email)
  if (!normalized) return

  const attemptsKey = `auth:attempts:${normalized}`
  const lockoutKey = `auth:lockout:${normalized}`

  memoryLockoutStore.delete(normalized)

  try {
    await prisma.rateLimitEntry.deleteMany({
      where: {
        key: {
          in: [attemptsKey, lockoutKey],
        },
      },
    })
  } catch (error) {
    console.warn('[Lockout] DB reset warning:', error)
  }
}
