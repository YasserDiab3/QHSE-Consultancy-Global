import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getClientIdByUserId, listClientAccounts } from '@/lib/client-records'
import { listReportRecords } from '@/lib/report-records'
import { prisma } from '@/lib/prisma'
import { getCountryNameFromCode } from '@/lib/visitor-tracking'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isMissingContactRequestTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('ContactRequest') && message.includes('does not exist')
}

function isMissingVisitorSessionTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('VisitorSession') && message.includes('does not exist')
}

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

    const reports = await listReportRecords({
      clientId: clientId ?? undefined,
    })

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

    let totalClients = 0
    let totalRequests = 0
    let requestStatusBreakdown: { status: string; _count: { status: number } }[] = []
    let totalVisitors = 0
    let visitorCountryBreakdown: { countryCode: string | null; countryName: string; count: number }[] = []

    if (session.user.role === 'ADMIN') {
      totalClients = (await listClientAccounts()).length

      try {
        totalRequests = await prisma.contactRequest.count()
        const groupedStatuses = await prisma.contactRequest.groupBy({
          by: ['status'],
          _count: {
            status: true,
          },
        })
        requestStatusBreakdown = groupedStatuses as { status: string; _count: { status: number } }[]
      } catch (error) {
        if (!isMissingContactRequestTable(error)) {
          throw error
        }
      }

      try {
        totalVisitors = await prisma.visitorSession.count()

        const groupedCountries = await prisma.visitorSession.groupBy({
          by: ['countryCode', 'countryName'],
          _count: {
            countryCode: true,
          },
          orderBy: {
            _count: {
              countryCode: 'desc',
            },
          },
        })

        visitorCountryBreakdown = groupedCountries.map((item) => ({
          countryCode: item.countryCode,
          countryName:
            item.countryName ||
            getCountryNameFromCode(item.countryCode || undefined),
          count: item._count.countryCode,
        }))
      } catch (error) {
        if (!isMissingVisitorSessionTable(error)) {
          throw error
        }
      }
    }

    return NextResponse.json(
      {
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
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
