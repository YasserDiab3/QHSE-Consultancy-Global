import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { getClientAccountById } from '@/lib/client-records'
import { prisma } from '@/lib/prisma'
import { clientDocumentSchema, formatValidationError } from '@/lib/validation'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const folderSchema = z.object({
  clientId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().min(1).max(50).optional(),
})

const documentSchema = clientDocumentSchema.extend({
  clientId: z.string().uuid(),
  folderId: z.string().uuid().nullable().optional(),
})

const documentUpdateSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  title: z.string().trim().min(1).max(180),
  category: z.string().trim().min(1).max(50).optional(),
  folderId: z.string().uuid().nullable().optional(),
})

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const clientId = new URL(request.url).searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ error: 'Client is required' }, { status: 400 })

    const client = await getClientAccountById(clientId)
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    const [folders, documents] = await Promise.all([
      prisma.knowledgeFolder.findMany({
        where: { clientId },
        orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      }),
      prisma.clientDocument.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return NextResponse.json({ client, folders, documents })
  } catch (error) {
    console.error('Failed to load knowledge bank:', error)
    return NextResponse.json({ error: 'Unable to load knowledge bank' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()

    if (body.type === 'folder') {
      const parsed = folderSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 })
      const client = await getClientAccountById(parsed.data.clientId)
      if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

      if (parsed.data.parentId) {
        const parent = await prisma.knowledgeFolder.findFirst({ where: { id: parsed.data.parentId, clientId: parsed.data.clientId } })
        if (!parent) return NextResponse.json({ error: 'Parent folder not found' }, { status: 400 })
      }

      const folder = await prisma.knowledgeFolder.create({
        data: { ...parsed.data, parentId: parsed.data.parentId || null, category: parsed.data.category || 'SYSTEM' },
      })
      return NextResponse.json(folder, { status: 201 })
    }

    if (body.type === 'document') {
      const parsed = documentSchema.safeParse(body)
      if (!parsed.success) return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 })
      const client = await getClientAccountById(parsed.data.clientId)
      if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

      if (parsed.data.folderId) {
        const folder = await prisma.knowledgeFolder.findFirst({ where: { id: parsed.data.folderId, clientId: parsed.data.clientId } })
        if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 400 })
      }

      const document = await prisma.clientDocument.create({
        data: {
          clientId: parsed.data.clientId,
          folderId: parsed.data.folderId || null,
          title: parsed.data.title,
          category: parsed.data.category || 'SYSTEM',
          url: parsed.data.url,
          originalName: parsed.data.originalName,
          mimeType: parsed.data.mimeType,
          size: parsed.data.size,
        },
      })
      return NextResponse.json(document, { status: 201 })
    }

    return NextResponse.json({ error: 'Unsupported knowledge bank action' }, { status: 400 })
  } catch (error) {
    console.error('Failed to update knowledge bank:', error)
    return NextResponse.json({ error: 'Unable to update knowledge bank' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAdmin()
    const parsed = documentUpdateSchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ error: formatValidationError(parsed.error) }, { status: 400 })

    const document = await prisma.clientDocument.findFirst({
      where: { id: parsed.data.id, clientId: parsed.data.clientId },
    })
    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    if (parsed.data.folderId) {
      const folder = await prisma.knowledgeFolder.findFirst({
        where: { id: parsed.data.folderId, clientId: parsed.data.clientId },
      })
      if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 400 })
    }

    const updated = await prisma.clientDocument.update({
      where: { id: document.id },
      data: {
        title: parsed.data.title,
        category: parsed.data.category || document.category,
        folderId: parsed.data.folderId === undefined ? document.folderId : parsed.data.folderId,
      },
    })
    await logActivity(session.user.id, 'KNOWLEDGE_DOCUMENT_UPDATED', 'client_document', updated.id, `Updated knowledge bank document ${updated.title}`)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to edit knowledge bank document:', error)
    return NextResponse.json({ error: 'Unable to edit knowledge bank document' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireAdmin()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const clientId = searchParams.get('clientId')
    if (!id || !clientId) return NextResponse.json({ error: 'Document and client are required' }, { status: 400 })

    const document = await prisma.clientDocument.findFirst({ where: { id, clientId } })
    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    await prisma.clientDocument.delete({ where: { id: document.id } })
    await logActivity(session.user.id, 'KNOWLEDGE_DOCUMENT_DELETED', 'client_document', document.id, `Deleted knowledge bank document ${document.title}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete knowledge bank document:', error)
    return NextResponse.json({ error: 'Unable to delete knowledge bank document' }, { status: 500 })
  }
}
