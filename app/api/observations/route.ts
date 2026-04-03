import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const headerList = headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const body = await request.json()

    const { reportId, title, titleAr, description, descriptionAr, riskLevel, status, sortOrder } = body

    if (!reportId || !title || !riskLevel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const observation = await prisma.observation.create({
      data: {
        reportId,
        title,
        titleAr,
        description,
        descriptionAr,
        riskLevel,
        status: status || 'OPEN',
        sortOrder: sortOrder || 0,
      },
    })

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
