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

    const { title, titleAr, description, descriptionAr, riskLevel, status, sortOrder } = body

    const observation = await prisma.observation.update({
      where: { id: params.id },
      data: {
        title,
        titleAr,
        description,
        descriptionAr,
        riskLevel,
        status,
        sortOrder,
      },
      include: {
        images: true,
      },
    })

    await logActivity(
      session.user.id,
      'OBSERVATION_UPDATED',
      'observation',
      params.id,
      `Updated observation`,
      ip
    )

    return NextResponse.json(observation)
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

    await prisma.observation.delete({
      where: { id: params.id },
    })

    await logActivity(session.user.id, 'OBSERVATION_DELETED', 'observation', params.id, `Deleted observation`, ip)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
