import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getVisitorGeoDetails, isBotUserAgent } from '@/lib/visitor-tracking'
import { enforceRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function normalizeText(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const visitorKey = normalizeText(body?.visitorKey)
    const path = normalizeText(body?.path)

    if (!visitorKey || !path || visitorKey.length > 128 || path.length > 2048 || !path.startsWith('/')) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const rateLimit = await enforceRateLimit(
      request,
      { keyPrefix: 'visitor-track', limit: 120, windowMs: 60 * 1000 },
      visitorKey
    )
    if (!rateLimit.success) return rateLimitResponse(rateLimit)

    const geo = await getVisitorGeoDetails()

    if (isBotUserAgent(geo.userAgent)) {
      return NextResponse.json({ skipped: true })
    }

    const now = new Date()

    const visitor = await prisma.visitorSession.upsert({
      where: { visitorKey },
      create: {
        visitorKey,
        countryCode: geo.countryCode,
        countryName: geo.countryName,
        region: geo.region,
        city: geo.city,
        ipAddress: geo.ipAddress,
        userAgent: geo.userAgent,
        lastPath: path,
        pageViews: 1,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {
        countryCode: geo.countryCode,
        countryName: geo.countryName,
        region: geo.region,
        city: geo.city,
        ipAddress: geo.ipAddress,
        userAgent: geo.userAgent,
        lastPath: path,
        lastSeenAt: now,
        pageViews: {
          increment: 1,
        },
      },
      select: {
        id: true,
        visitorKey: true,
      },
    })

    return NextResponse.json(visitor, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (error: any) {
    console.error('Visitor tracking failed:', error)
    return NextResponse.json({ error: 'Unable to track visitor at this time' }, { status: 500 })
  }
}
