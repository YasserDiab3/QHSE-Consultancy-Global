import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClientIdByUserId } from '@/lib/client-records'
import { calculateSlaDeadline, SLA_DAYS } from '@/lib/sla-escalation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'CLIENT'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let clientId = searchParams.get('clientId')
    const yearParam = searchParams.get('year')
    const monthParam = searchParams.get('month')

    if (session.user.role === 'CLIENT') {
      const clientRecordId = await getClientIdByUserId(session.user.id)
      if (!clientRecordId) {
        return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
      }
      clientId = clientRecordId
    }

    if (!clientId) {
      const firstClient = await prisma.client.findFirst({ select: { id: true } })
      if (!firstClient) {
        return NextResponse.json({ error: 'No clients found' }, { status: 404 })
      }
      clientId = firstClient.id
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { user: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Build date filter if year and month specified
    const dateFilter: any = {}
    if (yearParam) {
      const year = parseInt(yearParam, 10)
      if (!isNaN(year)) {
        if (monthParam) {
          const month = parseInt(monthParam, 10) - 1
          if (!isNaN(month) && month >= 0 && month <= 11) {
            const startDate = new Date(year, month, 1)
            const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999)
            dateFilter.gte = startDate
            dateFilter.lte = endDate
          }
        } else {
          const startDate = new Date(year, 0, 1)
          const endDate = new Date(year, 11, 31, 23, 59, 59, 999)
          dateFilter.gte = startDate
          dateFilter.lte = endDate
        }
      }
    }

    const reports = await prisma.report.findMany({
      where: {
        clientId,
        ...(dateFilter.gte ? { date: dateFilter } : {}),
      },
      include: {
        observations: {
          include: {
            images: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    const totalReports = reports.length
    const allObservations = reports.flatMap((r) => r.observations)
    const totalObservations = allObservations.length

    let criticalCount = 0
    let highCount = 0
    let mediumCount = 0
    let lowCount = 0

    let closedCount = 0
    let openCount = 0
    let underReviewCount = 0
    let overdueCount = 0

    const now = Date.now()
    const sitesMap: Record<string, { total: number; open: number; closed: number }> = {}
    const categoriesMap: Record<string, number> = {}

    for (const report of reports) {
      const site = report.siteName || 'Main Facility'
      if (!sitesMap[site]) {
        sitesMap[site] = { total: 0, open: 0, closed: 0 }
      }
      const cat = report.category || 'General Safety'
      categoriesMap[cat] = (categoriesMap[cat] || 0) + 1

      for (const obs of report.observations) {
        sitesMap[site].total += 1
        const level = (obs.riskLevel || 'LOW').toUpperCase()
        if (level === 'CRITICAL') criticalCount += 1
        else if (level === 'HIGH') highCount += 1
        else if (level === 'MEDIUM') mediumCount += 1
        else lowCount += 1

        const isClosed = obs.status === 'CLOSED' || obs.correctiveActionStatus === 'APPROVED'
        if (isClosed) {
          closedCount += 1
          sitesMap[site].closed += 1
        } else {
          openCount += 1
          sitesMap[site].open += 1
          if (obs.correctiveActionStatus === 'PENDING_REVIEW') {
            underReviewCount += 1
          }

          const deadline = calculateSlaDeadline(report.date, level)
          if (now > deadline.getTime()) {
            overdueCount += 1
          }
        }
      }
    }

    const closureRate = totalObservations > 0 ? Math.round((closedCount / totalObservations) * 100) : 100
    // Overall Safety Performance Index (0-100)
    let safetyIndex = 100
    if (totalObservations > 0) {
      const severityRatio = Math.min(1, (criticalCount * 2 + highCount + overdueCount) / (totalObservations * 2))
      safetyIndex = Math.max(10, Math.min(100, Math.round(closureRate * 0.7 + (1 - severityRatio) * 30)))
    }

    const siteBreakdown = Object.entries(sitesMap).map(([siteName, data]) => ({
      siteName,
      total: data.total,
      open: data.open,
      closed: data.closed,
      complianceRate: data.total > 0 ? Math.round((data.closed / data.total) * 100) : 100,
    }))

    const categoryBreakdown = Object.entries(categoriesMap).map(([category, count]) => ({
      category,
      count,
    }))

    // Auto-generate professional executive commentary
    let executiveEvaluationAr = ''
    let executiveEvaluationEn = ''

    if (totalObservations === 0) {
      executiveEvaluationAr = 'لم يتم تسجيل ملاحظات سلبية خلال الفترة، مما يشير إلى التزام ممتاز بضوابط السلامة الأساسية.'
      executiveEvaluationEn = 'No negative findings were logged during this period, indicating excellent adherence to foundational safety controls.'
    } else if (criticalCount > 0) {
      executiveEvaluationAr = `تتطلب الفترة الحالية تركيزاً عاجلاً على المخاطر الحرجة المرصودة (${criticalCount} ملاحظة حرجة)، مع الحفاظ على معدل الإغلاق العام الذي وصل إلى ${closureRate}%. يُوصى بعقد اجتماع فوري للجنة السلامة بالموقع.`
      executiveEvaluationEn = `Current period requires urgent focus on observed critical hazards (${criticalCount} critical finding), while maintaining the overall closure rate of ${closureRate}%. An emergency site safety committee session is recommended.`
    } else if (closureRate >= 80) {
      executiveEvaluationAr = `أداء متميز في استجابة المنشأة ومعدل إغلاق الملاحظات (${closureRate}%) مع انعدام المخاطر الحرجة. المنظومة تتجه نحو الامتثال الكامل وفق أفضل المعايير الدولية.`
      executiveEvaluationEn = `Outstanding facility responsiveness with a high closure rate (${closureRate}%) and zero critical hazards. The management system demonstrates consistent compliance towards international standards.`
    } else {
      executiveEvaluationAr = `معدل إغلاق الملاحظات (${closureRate}%) يحتاج إلى تسريع لمعالجة الملاحظات المتبقية (${openCount} ملاحظة) قبل انتهاء المهل النظامية (SLA).`
      executiveEvaluationEn = `The current closure rate (${closureRate}%) requires acceleration to address remaining findings (${openCount} open) before exceeding standard SLA deadlines.`
    }

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.companyName,
        nameAr: client.companyNameAr || client.companyName,
        email: client.user.email,
        phone: client.phone,
      },
      period: {
        year: yearParam || new Date().getFullYear().toString(),
        month: monthParam || (new Date().getMonth() + 1).toString(),
      },
      metrics: {
        safetyIndex,
        totalReports,
        totalObservations,
        closedObservations: closedCount,
        openObservations: openCount,
        underReviewObservations: underReviewCount,
        overdueObservations: overdueCount,
        closureRate,
      },
      riskBreakdown: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      siteBreakdown,
      categoryBreakdown,
      commentary: {
        ar: executiveEvaluationAr,
        en: executiveEvaluationEn,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Executive summary error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate executive summary' }, { status: 500 })
  }
}
