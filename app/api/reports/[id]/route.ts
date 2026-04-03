import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const headerList = headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const body = await request.json()

    const { date, siteName, siteNameAr, category, consultantId, notes, notesAr, status } = body

    const report = await prisma.report.update({
      where: { id: params.id },
      data: {
        date: date ? new Date(date) : undefined,
        siteName,
        siteNameAr,
        category,
        consultantId: consultantId || undefined,
        notes,
        notesAr,
        status,
      },
      include: {
        observations: {
          include: {
            images: true,
          },
        },
        client: true,
      },
    })

    await logActivity(session.user.id, 'REPORT_UPDATED', 'report', params.id, `Updated report ${siteName}`, ip)

    return NextResponse.json(report)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const headerList = headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'

    const report = await prisma.report.findUnique({
      where: { id: params.id },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    await prisma.report.delete({
      where: { id: params.id },
    })

    await logActivity(session.user.id, 'REPORT_DELETED', 'report', params.id, `Deleted report`, ip)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
