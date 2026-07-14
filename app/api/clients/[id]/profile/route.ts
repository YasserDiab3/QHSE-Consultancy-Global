import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: { user: { select: { name: true, email: true, phone: true } }, reports: { include: { observations: true }, orderBy: { date: 'desc' } }, documents: { orderBy: { createdAt: 'desc' } }, financialRecords: { orderBy: { createdAt: 'desc' } } },
    })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    const observationCount = client.reports.reduce((total, report) => total + report.observations.length, 0)
    const financialTotal = client.financialRecords.reduce((total, item) => total + Number(item.amount), 0)
    return NextResponse.json({ client, summary: { visits: client.reports.length, reports: client.reports.length, observations: observationCount, financialTotal } })
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin()
    const body = await request.json()
    if (body.type === 'financial') {
      const item = await prisma.financialRecord.create({ data: { clientId: params.id, title: body.title, amount: body.amount, currency: body.currency || 'EGP', status: body.status || 'PENDING', dueDate: body.dueDate ? new Date(body.dueDate) : null, notes: body.notes } })
      return NextResponse.json(item, { status: 201 })
    }
    if (!body.title || !body.url) return NextResponse.json({ error: 'Missing document data' }, { status: 400 })
    const item = await prisma.clientDocument.create({ data: { clientId: params.id, title: body.title, category: body.category || 'SYSTEM', url: body.url, originalName: body.originalName, mimeType: body.mimeType, size: body.size } })
    return NextResponse.json(item, { status: 201 })
  } catch (error: any) { return NextResponse.json({ error: error.message }, { status: 500 }) }
}
