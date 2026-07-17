import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { deleteReportRecord, getReportRecordById, updateReportRecord } from '@/lib/report-records'
import { normalizeAssessmentScores } from '@/lib/report-assessment'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const body = await request.json()

    const { date, siteName, siteNameAr, category, consultantId, notes, notesAr, status, assessmentScores } = body
    const normalizedConsultantId =
      typeof consultantId === 'string' && consultantId.trim().length > 0
        ? consultantId.trim()
        : session.user.id

    const existingReport = await getReportRecordById(id)
    if (!existingReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    await updateReportRecord(id, {
      date,
      siteName,
      siteNameAr,
      category,
      consultantId: normalizedConsultantId,
      notes,
      notesAr,
      assessmentScores: normalizeAssessmentScores(assessmentScores),
      status,
    })

    const report = await getReportRecordById(id)
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    await logActivity(session.user.id, 'REPORT_UPDATED', 'report', id, `Updated report ${siteName}`, ip)

    return NextResponse.json(report)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'

    const report = await getReportRecordById(id)

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    await deleteReportRecord(id)

    await logActivity(session.user.id, 'REPORT_DELETED', 'report', id, `Deleted report`, ip)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
