import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reports = await prisma.report.count({
      where: session.user.role === 'CLIENT' ? {
        client: {
          userId: session.user.id,
        },
      } : undefined,
    })

    const openObservations = await prisma.observation.count({
      where: session.user.role === 'CLIENT'
        ? {
            report: {
              client: {
                userId: session.user.id,
              },
            },
            status: 'OPEN',
          }
        : {
            status: 'OPEN',
          },
    })

    const closedReports = await prisma.report.count({
      where: session.user.role === 'CLIENT'
        ? {
            client: {
              userId: session.user.id,
            },
            status: 'CLOSED',
          }
        : {
            status: 'CLOSED',
          },
    })

    const highRiskItems = await prisma.observation.count({
      where: session.user.role === 'CLIENT'
        ? {
            report: {
              client: {
                userId: session.user.id,
              },
            },
            riskLevel: {
              in: ['HIGH', 'CRITICAL'],
            },
            status: {
              in: ['OPEN', 'IN_PROGRESS'],
            },
          }
        : {
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
      where: session.user.role === 'CLIENT'
        ? {
            report: {
              client: {
                userId: session.user.id,
              },
            },
            status: {
              in: ['OPEN', 'IN_PROGRESS'],
            },
          }
        : {
            status: {
              in: ['OPEN', 'IN_PROGRESS'],
            },
          },
      _count: {
        riskLevel: true,
      },
    })

    const statusBreakdown = await prisma.observation.groupBy({
      by: ['status'],
      where: session.user.role === 'CLIENT'
        ? {
            report: {
              client: {
                userId: session.user.id,
              },
            },
          }
        : undefined,
      _count: {
        status: true,
      },
    })

    const recentReports = await prisma.report.findMany({
      where: session.user.role === 'CLIENT'
        ? {
            client: {
              userId: session.user.id,
            },
          }
        : undefined,
      take: 5,
      orderBy: {
        date: 'desc',
      },
      include: {
        client: true,
        _count: {
          select: {
            observations: true,
          },
        },
      },
    })

    return NextResponse.json({
      totalReports: reports,
      openObservations,
      closedReports,
      highRiskItems,
      riskBreakdown,
      statusBreakdown,
      recentReports,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
