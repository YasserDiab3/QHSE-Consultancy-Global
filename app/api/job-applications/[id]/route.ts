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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()
    const headerList = headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const body = await request.json()

    const status = normalizeText(body.status)
    if (!status) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 })
    }

    const application = await prisma.jobApplication.update({
      where: { id: params.id },
      data: { status },
      include: {
        jobOpening: true,
      },
    })

    await logActivity(
      session.user.id,
      'JOB_APPLICATION_UPDATED',
      'job-application',
      params.id,
      `Updated application status to ${status}`,
      ip
    )

    return NextResponse.json(application)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update application' }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
