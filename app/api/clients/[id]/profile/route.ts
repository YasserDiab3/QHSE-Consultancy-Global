import { NextResponse } from 'next/server'
import { requireStaff } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getClientAccountById } from '@/lib/client-records'
import { listReportRecords } from '@/lib/report-records'
import { clientDocumentSchema, financialRecordSchema, formatValidationError } from '@/lib/validation'
import { persistDataUrl } from '@/lib/storage'
import { serializeFinancialDetails } from '@/lib/financial-records'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await requireStaff()
    const client = await getClientAccountById(id)
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    const reports = await listReportRecords({ clientId: id })
    const [documents, financialRecords] = await Promise.all([
      prisma.clientDocument.findMany({ where: { clientId: id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.financialRecord.findMany({ where: { clientId: id }, orderBy: { createdAt: 'desc' } }).catch(() => []),
    ])

    const observationCount = reports.reduce((total, report) => total + report.observations.length, 0)

    let financialTotal = 0
    let financialPaid = 0
    let financialPending = 0
    let financialPartialCount = 0

    for (const item of financialRecords) {
      const amount = Number(item.amount) || 0
      financialTotal += amount
      if (item.status === 'PAID') {
        financialPaid += amount
      } else if (item.status === 'PARTIAL') {
        let paid = 0
        try {
          if (item.notes && item.notes.trim().startsWith('{')) {
            const d = JSON.parse(item.notes.trim())
            paid = Number(d.paidAmount) || 0
          }
        } catch {
          paid = 0
        }
        financialPaid += paid
        financialPending += Math.max(0, amount - paid)
        financialPartialCount += 1
      } else {
        financialPending += amount
      }
    }

    return NextResponse.json({
      client: { ...client, reports, documents, financialRecords },
      summary: {
        visits: reports.length,
        reports: reports.length,
        observations: observationCount,
        financialTotal,
        financialPaid,
        financialPending,
        financialPartialCount,
        financialCount: financialRecords.length,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await requireStaff()
    const body = await request.json()
    const client = await getClientAccountById(id)
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    if (body.type === 'financial') {
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Financial operations are restricted to Administrators' }, { status: 403 })
      }

      // If rich details or items provided, serialize into notes
      let notesToSave = body.notes
      if (body.details && typeof body.details === 'object') {
        notesToSave = serializeFinancialDetails(body.details)
      }

      const parsed = financialRecordSchema.safeParse({
        ...body,
        notes: notesToSave,
      })
      if (!parsed.success) return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 })

      const item = await prisma.financialRecord.create({
        data: {
          clientId: id,
          title: parsed.data.title,
          amount: parsed.data.amount,
          currency: parsed.data.currency || 'EGP',
          status: parsed.data.status || 'PENDING',
          dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
          notes: parsed.data.notes || null,
        },
      })
      return NextResponse.json(item, { status: 201 })
    }

    const parsed = clientDocumentSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 })
    const storedUrl = await persistDataUrl(parsed.data.url, {
      folder: 'client-documents',
      originalName: parsed.data.originalName,
    })
    const item = await prisma.clientDocument.create({
      data: { ...parsed.data, url: storedUrl, clientId: id, category: parsed.data.category || 'SYSTEM' },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await requireStaff()
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Financial operations are restricted to Administrators' }, { status: 403 })
    }

    const body = await request.json()
    const recordId = body.recordId || body.id
    if (!recordId) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 })
    }

    const existing = await prisma.financialRecord.findFirst({
      where: { id: recordId, clientId: id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Financial record not found' }, { status: 404 })
    }

    let notesToSave = body.notes
    if (body.details && typeof body.details === 'object') {
      notesToSave = serializeFinancialDetails(body.details)
    }

    const parsed = financialRecordSchema.partial().safeParse({
      ...body,
      notes: notesToSave !== undefined ? notesToSave : existing.notes,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title
    if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount
    if (parsed.data.currency !== undefined) updateData.currency = parsed.data.currency
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status
    if (parsed.data.dueDate !== undefined) {
      updateData.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null
    }
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes

    const updated = await prisma.financialRecord.update({
      where: { id: recordId },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await requireStaff()
    const { searchParams } = new URL(request.url)
    const financialId = searchParams.get('financialId')
    const documentId = searchParams.get('documentId')

    if (financialId) {
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Financial operations are restricted to Administrators' }, { status: 403 })
      }
      const existing = await prisma.financialRecord.findFirst({
        where: { id: financialId, clientId: id },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Financial record not found' }, { status: 404 })
      }
      await prisma.financialRecord.delete({ where: { id: financialId } })
      return NextResponse.json({ success: true, deletedId: financialId })
    }

    if (documentId) {
      const existing = await prisma.clientDocument.findFirst({
        where: { id: documentId, clientId: id },
      })
      if (!existing) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      await prisma.clientDocument.delete({ where: { id: documentId } })
      return NextResponse.json({ success: true, deletedId: documentId })
    }

    return NextResponse.json({ error: 'financialId or documentId is required' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
