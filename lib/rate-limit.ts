import { createHash } from 'crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type HeaderSource = Request | Headers | { headers?: Headers | Record<string, string | string[] | undefined> } | undefined

export type RateLimitConfig = {
  keyPrefix: string
  limit: number
  windowMs: number
}

export type RateLimitResult = {
  success: boolean
  remaining: number
  resetAt: Date
}

type MemoryBucket = {
  count: number
  resetAt: Date
}

const memoryBuckets = new Map<string, MemoryBucket>()

function readHeader(source: HeaderSource, name: string) {
  if (!source) return undefined

  const headers = source instanceof Request
    ? source.headers
    : source instanceof Headers
      ? source
      : source.headers
  if (!headers) return undefined
  if (headers instanceof Headers) return headers.get(name) || undefined

  const value = headers[name] ?? headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

export function getClientIp(source: HeaderSource) {
  const value =
    readHeader(source, 'x-vercel-forwarded-for') ||
    readHeader(source, 'x-forwarded-for') ||
    readHeader(source, 'x-real-ip') ||
    'unknown'

  return value.split(',')[0]?.trim().slice(0, 128) || 'unknown'
}

function hashIdentifier(value: string) {
  const salt = process.env.RATE_LIMIT_SALT || process.env.NEXTAUTH_SECRET || 'qhsse-rate-limit'
  return createHash('sha256').update(`${salt}:${value}`).digest('hex')
}

function useMemoryBucket(key: string, config: RateLimitConfig): RateLimitResult {
  const now = new Date()
  const current = memoryBuckets.get(key)
  const bucket = !current || current.resetAt <= now
    ? { count: 1, resetAt: new Date(now.getTime() + config.windowMs) }
    : { count: current.count + 1, resetAt: current.resetAt }

  memoryBuckets.set(key, bucket)
  return {
    success: bucket.count <= config.limit,
    remaining: Math.max(0, config.limit - bucket.count),
    resetAt: bucket.resetAt,
  }
}

export async function enforceRateLimit(
  source: HeaderSource,
  config: RateLimitConfig,
  discriminator = ''
): Promise<RateLimitResult> {
  const ip = getClientIp(source)
  const key = `${config.keyPrefix}:${hashIdentifier(`${ip}:${discriminator.toLowerCase().trim()}`)}`
  const resetAt = new Date(Date.now() + config.windowMs)

  try {
    const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
      INSERT INTO "RateLimitEntry" ("key", "count", "resetAt", "createdAt", "updatedAt")
      VALUES (${key}, 1, ${resetAt}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT ("key") DO UPDATE
      SET
        "count" = CASE
          WHEN "RateLimitEntry"."resetAt" <= CURRENT_TIMESTAMP THEN 1
          ELSE "RateLimitEntry"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitEntry"."resetAt" <= CURRENT_TIMESTAMP THEN EXCLUDED."resetAt"
          ELSE "RateLimitEntry"."resetAt"
        END,
        "updatedAt" = CURRENT_TIMESTAMP
      RETURNING "count", "resetAt"
    `

    const bucket = rows[0]
    if (!bucket) return useMemoryBucket(key, config)

    return {
      success: bucket.count <= config.limit,
      remaining: Math.max(0, config.limit - bucket.count),
      resetAt: new Date(bucket.resetAt),
    }
  } catch {
    // Keeps basic abuse protection active while a deployment is waiting for its migration.
    return useMemoryBucket(key, config)
  }
}

export function rateLimitResponse(result: RateLimitResult) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000))
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': String(result.remaining),
      },
    }
  )
}
