import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { getClientAccountById } from '@/lib/client-records'
import { prisma } from '@/lib/prisma'
import { clientDocumentSchema, formatValidationError } from '@/lib/validation'

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
