import { NextResponse } from 'next/server'
import { getReportRecordById } from '@/lib/report-records'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 })
    }

    const report = await getReportRecordById(id)
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Public sanitized verification payload - strictly no client credentials or account data
    return NextResponse.json({
      id: report.id,
      date: report.date,
      siteName: report.siteName,
      siteNameAr: report.siteNameAr,
      category: report.category,
      status: report.status,
      notes: report.notes,
      notesAr: report.notesAr,
      assessmentScores: report.assessmentScores,
      client: {
        companyName: report.client?.companyName || null,
        companyNameAr: (report.client as any)?.companyNameAr || null,
      },
      consultant: {
        name: report.consultant?.name || null,
      },
      observations: (report.observations || []).map((obs: any) => ({
        id: obs.id,
        title: obs.title,
        titleAr: obs.titleAr,
        description: obs.description,
        descriptionAr: obs.descriptionAr,
        riskLevel: obs.riskLevel,
        status: obs.status,
        sortOrder: obs.sortOrder ?? 0,
        correctiveAction: obs.correctiveAction,
        correctiveActionStatus: obs.correctiveActionStatus,
      })),
    })
  } catch (error: any) {
    console.error('Failed to retrieve public report verification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
