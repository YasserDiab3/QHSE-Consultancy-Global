import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { sendNotificationEmail } from '@/lib/email'
import { getClientIdByUserId } from '@/lib/client-records'
import {
  backfillMissingReportConsultantIds,
  createReportRecord,
  getReportRecordById,
  listReportRecords,
} from '@/lib/report-records'
import { normalizeAssessmentScores } from '@/lib/report-assessment'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const riskLevel = searchParams.get('riskLevel')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const category = searchParams.get('category')

    let clientId: string | undefined
    if (session.user.role === 'CLIENT') {
      clientId = await getClientIdByUserId(session.user.id) ?? undefined
      if (!clientId) {
        return NextResponse.json([])
      }
    } else if (session.user.role === 'ADMIN') {
      await backfillMissingReportConsultantIds(session.user.id)
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const reports = await listReportRecords({
      clientId,
      status,
      riskLevel,
      dateFrom,
      dateTo,
      category,
    })

    return NextResponse.json(reports)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const headerList = headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const body = await request.json()

    const { clientId, date, siteName, siteNameAr, category, consultantId, notes, notesAr, status, assessmentScores } = body
    const normalizedConsultantId =
      typeof consultantId === 'string' && consultantId.trim().length > 0
        ? consultantId.trim()
        : session.user.id

    if (!clientId || !date || !siteName || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const reportId = await createReportRecord({
      clientId,
      date,
      siteName,
      siteNameAr,
      category,
      status: status || 'OPEN',
      consultantId: normalizedConsultantId,
      notes,
      notesAr,
      assessmentScores: normalizeAssessmentScores(assessmentScores),
    })

    const report = await getReportRecordById(reportId)
    if (!report) {
      throw new Error('Failed to load the created report')
    }

    await logActivity(session.user.id, 'REPORT_CREATED', 'report', report.id, `Created report for ${siteName}`, ip)

    const clientEmail = report.client?.user?.email
    if (clientEmail) {
      const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ''}/dashboard`
      await sendNotificationEmail({
        to: clientEmail,
        subject: `New report available: ${siteName}`,
        text: `A new report for ${siteName} has been added to your portal. View it at ${portalUrl}.`,
        html: `<p>A new report for <strong>${siteName}</strong> has been added to your portal.</p><p><a href="${portalUrl}">Open dashboard</a></p>`,
      }).catch((error) => {
        console.error('Failed to send report notification email:', error)
      })
    }

    return NextResponse.json(report, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
