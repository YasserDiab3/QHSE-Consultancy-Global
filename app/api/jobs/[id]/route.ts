import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function normalizeText(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await requireAdmin()
    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const body = await request.json()

    const title = normalizeText(body.title)
    const employmentType = normalizeText(body.employmentType)
    const summary = normalizeText(body.summary)

    if (!title || !employmentType || !summary) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const job = await prisma.jobOpening.update({
      where: { id },
      data: {
        title,
        titleAr: normalizeText(body.titleAr),
        location: normalizeText(body.location),
        locationAr: normalizeText(body.locationAr),
        department: normalizeText(body.department),
        departmentAr: normalizeText(body.departmentAr),
        employmentType,
        employmentTypeAr: normalizeText(body.employmentTypeAr),
        summary,
        summaryAr: normalizeText(body.summaryAr),
        requirements: normalizeText(body.requirements),
        requirementsAr: normalizeText(body.requirementsAr),
        applyEmail: normalizeText(body.applyEmail),
        applyUrl: normalizeText(body.applyUrl),
        status: normalizeText(body.status) || 'OPEN',
        isPublished: typeof body.isPublished === 'boolean' ? body.isPublished : true,
        sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
      },
    })

    await logActivity(
      session.user.id,
      'JOB_UPDATED',
      'job',
      job.id,
      `Updated job opening: ${job.title}`,
      ip
    )

    return NextResponse.json(job)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update job' }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await requireAdmin()
    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'

    await prisma.jobOpening.delete({
      where: { id },
    })

    await logActivity(
      session.user.id,
      'JOB_DELETED',
      'job',
      id,
      'Deleted job opening',
      ip
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete job' }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
