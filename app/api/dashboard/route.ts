import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getClientIdByUserId, countClientAccounts } from '@/lib/client-records'
import { listReportRecords } from '@/lib/report-records'
import { prisma } from '@/lib/prisma'
import { getCountryNameFromCode } from '@/lib/visitor-tracking'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type DashboardCacheEntry = {
  timestamp: number
  key: string
  payload: any
}

let dashboardCache: DashboardCacheEntry | null = null
const DASHBOARD_CACHE_TTL_MS = 20 * 1000 // 20 seconds in-memory cache

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId =
      session.user.role === 'CLIENT'
        ? await getClientIdByUserId(session.user.id)
        : null

    if (!['ADMIN', 'DATA_ENTRY', 'CLIENT'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const cacheKey = `${session.user.role}:${clientId || 'admin'}`
    const now = Date.now()
    if (dashboardCache && dashboardCache.key === cacheKey && now - dashboardCache.timestamp < DASHBOARD_CACHE_TTL_MS) {
      return NextResponse.json(dashboardCache.payload, {
        headers: {
          'Cache-Control': 'private, no-cache, stale-while-revalidate=60',
          'X-Cache': 'HIT',
        },
      })
    }

    const [reports, totalClients, contactData, visitorData] = await Promise.all([
      listReportRecords({
        clientId: clientId ?? undefined,
        includeImages: false,
      }),
      session.user.role === 'ADMIN' ? countClientAccounts().catch(() => 0) : Promise.resolve(0),
      session.user.role === 'ADMIN'
        ? Promise.all([
            prisma.contactRequest.count().catch(() => 0),
            prisma.contactRequest
              .groupBy({
                by: ['status'],
                _count: { status: true },
              })
              .then((res) => res as { status: string; _count: { status: number } }[])
              .catch(() => []),
          ])
        : Promise.resolve([0, []] as const),
      session.user.role === 'ADMIN'
        ? Promise.all([
            prisma.visitorSession.count().catch(() => 0),
            prisma.visitorSession
              .groupBy({
                by: ['countryCode', 'countryName'],
                _count: { countryCode: true },
                orderBy: { _count: { countryCode: 'desc' } },
              })
              .then((res) =>
                res.map((item) => ({
                  countryCode: item.countryCode,
                  countryName:
                    item.countryName ||
                    getCountryNameFromCode(item.countryCode || undefined),
                  count: item._count.countryCode,
                }))
              )
              .catch(() => []),
          ])
        : Promise.resolve([0, []] as const),
    ])

    const totalRequests = contactData[0]
    const requestStatusBreakdown = contactData[1]
    const totalVisitors = visitorData[0]
    const visitorCountryBreakdown = visitorData[1]

    const observations = reports.flatMap((report) => report.observations ?? [])

    const openObservations = observations.filter((observation) => observation.status === 'OPEN').length

    const closedReports = reports.filter((report) => report.status === 'CLOSED').length

    const highRiskItems = observations.filter(
      (observation) =>
        ['HIGH', 'CRITICAL'].includes(observation.riskLevel) &&
        ['OPEN', 'IN_PROGRESS'].includes(observation.status)
    ).length

    const riskMap = observations
      .filter((observation) => ['OPEN', 'IN_PROGRESS'].includes(observation.status))
      .reduce<Record<string, number>>((acc, observation) => {
        acc[observation.riskLevel] = (acc[observation.riskLevel] ?? 0) + 1
        return acc
      }, {})

    const riskBreakdown = Object.entries(riskMap).map(([riskLevel, count]) => ({
      riskLevel,
      _count: {
        riskLevel: count,
      },
    }))

    const reportStatusMap = reports.reduce<Record<string, number>>((acc, report) => {
      acc[report.status] = (acc[report.status] ?? 0) + 1
      return acc
    }, {})

    const statusBreakdown = Object.entries(reportStatusMap).map(([status, count]) => ({
      status,
      _count: {
        status: count,
      },
    }))

    const recentReports = reports.slice(0, 5).map((report) => ({
      ...report,
      _count: {
        observations: report.observations.length,
      },
    }))

    const payload = {
      totalReports: reports.length,
      openObservations,
      closedReports,
      highRiskItems,
      totalClients,
      totalRequests,
      totalVisitors,
      riskBreakdown,
      statusBreakdown,
      requestStatusBreakdown,
      visitorCountryBreakdown,
      recentReports,
    }

    dashboardCache = {
      timestamp: now,
      key: cacheKey,
      payload,
    }

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'private, no-cache, stale-while-revalidate=60',
        'X-Cache': 'MISS',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
