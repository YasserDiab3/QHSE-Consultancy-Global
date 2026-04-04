import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { getClientIdByUserId, listClientAccounts } from '@/lib/client-records'
import { listReportRecords } from '@/lib/report-records'

function isMissingContactRequestTable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('ContactRequest') && message.includes('does not exist')
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

    const reportIds = reports.map((report) => report.id)
    const scopedObservationFilter =
      reportIds.length > 0
        ? { reportId: { in: reportIds } }
        : clientId
          ? { reportId: '__none__' }
          : {}

    const openObservations = await prisma.observation.count({
      where: {
        ...scopedObservationFilter,
        status: 'OPEN',
      },
    })

    const closedReports = reports.filter((report) => report.status === 'CLOSED').length

    const highRiskItems = await prisma.observation.count({
      where: {
        ...scopedObservationFilter,
        riskLevel: {
          in: ['HIGH', 'CRITICAL'],
        },
        status: {
          in: ['OPEN', 'IN_PROGRESS'],
        },
      },
    })

    const riskBreakdown = await prisma.observation.groupBy({
      by: ['riskLevel'],
      where: {
        ...scopedObservationFilter,
        status: {
          in: ['OPEN', 'IN_PROGRESS'],
        },
      },
      _count: {
        riskLevel: true,
      },
    })

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
    }

    return NextResponse.json({
      totalReports: reports.length,
      openObservations,
      closedReports,
      highRiskItems,
      totalClients,
      totalRequests,
      riskBreakdown,
      statusBreakdown,
      requestStatusBreakdown,
      recentReports,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
