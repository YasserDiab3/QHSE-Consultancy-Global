import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getSession, requireAdmin } from '@/lib/auth'
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

export async function GET() {
  try {
    const session = await getSession()
    const isAdmin = session?.user?.role === 'ADMIN'

    const jobs = await prisma.jobOpening.findMany({
      where: isAdmin
        ? undefined
        : {
            isPublished: true,
            status: 'OPEN',
          },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json(jobs, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load jobs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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

    const job = await prisma.jobOpening.create({
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
      'JOB_CREATED',
      'job',
      job.id,
      `Created job opening: ${job.title}`,
      ip
    )

    return NextResponse.json(job, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create job' }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
