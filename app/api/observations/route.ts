import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { createObservationRecord } from '@/lib/observation-records'
import { notifyCriticalObservation } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'DATA_ENTRY'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const headerList = await headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const body = await request.json()

    const { reportId, title, titleAr, description, descriptionAr, riskLevel, status, sortOrder } = body

    if (!reportId || !title || !riskLevel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const observationId = await createObservationRecord({
      reportId,
      title,
      titleAr,
      description,
      descriptionAr,
      riskLevel,
      status: status || 'OPEN',
      sortOrder: sortOrder || 0,
    })

    const observation = {
      id: observationId,
      reportId,
      title,
      titleAr,
      description,
      descriptionAr,
      riskLevel,
      status: status || 'OPEN',
      sortOrder: sortOrder || 0,
      images: [],
    }

    if (riskLevel === 'CRITICAL') {
      void notifyCriticalObservation({
        reportId,
        observationTitle: title,
        observationTitleAr: titleAr,
        description,
        descriptionAr,
        riskLevel,
      }).catch((err) => console.error('Failed to notify critical risk observation:', err))
    }

    await logActivity(
      session.user.id,
      'OBSERVATION_CREATED',
      'observation',
      observation.id,
      `Added observation to report ${reportId}`,
      ip
    )

    return NextResponse.json(observation, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
