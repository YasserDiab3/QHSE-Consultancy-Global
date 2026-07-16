import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClientAccountById } from '@/lib/client-records'
import { listReportRecords } from '@/lib/report-records'
import { clientDocumentSchema, financialRecordSchema, formatValidationError } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const client = await getClientAccountById(params.id)
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    const reports = await listReportRecords({ clientId: params.id })
    const [documents, financialRecords] = await Promise.all([
      prisma.clientDocument.findMany({ where: { clientId: params.id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.financialRecord.findMany({ where: { clientId: params.id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
    ])
    const observationCount = reports.reduce((total, report) => total + report.observations.length, 0)
    const financialTotal = financialRecords.reduce((total, item) => total + Number(item.amount), 0)
    return NextResponse.json({ client: { ...client, reports, documents, financialRecords }, summary: { visits: reports.length, reports: reports.length, observations: observationCount, financialTotal } })
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const body = await request.json()
    const client = await getClientAccountById(params.id)
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    if (body.type === 'financial') {
      const parsed = financialRecordSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 })
      const item = await prisma.financialRecord.create({ data: { clientId: params.id, ...parsed.data, currency: parsed.data.currency || 'EGP', status: parsed.data.status || 'PENDING', dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null } })
      return NextResponse.json(item, { status: 201 })
    }
    const parsed = clientDocumentSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 })
    const item = await prisma.clientDocument.create({ data: { clientId: params.id, ...parsed.data, category: parsed.data.category || 'SYSTEM' } })
    return NextResponse.json(item, { status: 201 })
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}
