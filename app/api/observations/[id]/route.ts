import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-log'
import { headers } from 'next/headers'
import { deleteObservationRecord, updateObservationRecord } from '@/lib/observation-records'
import { getClientIdByUserId } from '@/lib/client-records'
import { listReportRecords } from '@/lib/report-records'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || !['ADMIN', 'CLIENT'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const headerList = headers()
    const ip = headerList.get('x-forwarded-for') || 'unknown'
    const body = await request.json()

    const { title, titleAr, description, descriptionAr, riskLevel, status, sortOrder, clientResponse, correctiveAction, correctiveActionStatus } = body

    if (session.user.role === 'CLIENT') {
      const clientId = await getClientIdByUserId(session.user.id)
      const reports = clientId ? await listReportRecords({ clientId }) : []
      if (!reports.some((report) => report.observations.some((observation) => observation.id === params.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      await updateObservationRecord(params.id, { clientResponse, correctiveAction, correctiveActionStatus: correctiveActionStatus || 'IN_PROGRESS' })
      await logActivity(session.user.id, 'CLIENT_CORRECTIVE_ACTION', 'observation', params.id, 'Client added a response or corrective action', ip)
      return NextResponse.json({ id: params.id, clientResponse, correctiveAction, correctiveActionStatus: correctiveActionStatus || 'IN_PROGRESS' })
    }

    await updateObservationRecord(params.id, {
      title,
      titleAr,
      description,
      descriptionAr,
      riskLevel,
      status,
      sortOrder,
      clientResponse,
      correctiveAction,
      correctiveActionStatus,
    })

    const observation = {
      id: params.id,
      title,
      titleAr,
      description,
      descriptionAr,
      riskLevel,
      status,
      sortOrder,
    }

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

    await deleteObservationRecord(params.id)

    await logActivity(session.user.id, 'OBSERVATION_DELETED', 'observation', params.id, `Deleted observation`, ip)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.message === 'Forbidden' ? 403 : 500 })
  }
}
