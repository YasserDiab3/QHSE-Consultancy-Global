import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getClientIdByUserId } from '@/lib/client-records'
import { prisma } from '@/lib/prisma'
import { buildPaginationMeta, paginationHeaders, parsePagination } from '@/lib/pagination'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let clientId: string | null = null

    if (session.user.role === 'CLIENT') {
      clientId = await getClientIdByUserId(session.user.id)
      if (!clientId) {
        return NextResponse.json({ documents: [], folders: [] }, { status: 200 })
      }
    } else if (session.user.role === 'ADMIN') {
      const urlClientId = new URL(request.url).searchParams.get('clientId')
      clientId = urlClientId || null
      if (!clientId) {
        return NextResponse.json({ documents: [], folders: [] }, { status: 200 })
      }
    } else {
      return NextResponse.json({ documents: [], folders: [] }, { status: 200 })
    }

    const pagination = parsePagination(new URL(request.url).searchParams)

    const documentSelect = {
      id: true,
      folderId: true,
      title: true,
      category: true,
      url: true,
      originalName: true,
      mimeType: true,
      size: true,
      createdAt: true,
    } as const

    let folders: Array<{ id: string; parentId: string | null; name: string; category: string }> = []
    let documents: Array<{
      id: string
      folderId: string | null
      title: string
      category: string
      url: string
      originalName: string | null
      mimeType: string | null
      size: number | null
      createdAt: Date
    }>
    let total = 0

    try {
      const [loadedFolders, documentCount, loadedDocuments] = await Promise.all([
        prisma.knowledgeFolder.findMany({
          where: { clientId },
          select: { id: true, parentId: true, name: true, category: true },
          orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
        }),
        prisma.clientDocument.count({ where: { clientId } }),
        prisma.clientDocument.findMany({
          where: { clientId },
          orderBy: { createdAt: 'desc' },
          skip: pagination.skip,
          take: pagination.take,
          select: documentSelect,
        }),
      ])
      folders = loadedFolders
      documents = loadedDocuments
      total = documentCount
    } catch {
      // Keep the existing client document library available until the folder
      // migration has been applied to an older database.
      const legacyDocuments = await prisma.clientDocument.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
        select: {
          id: true,
          title: true,
          category: true,
          url: true,
          originalName: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      })
      documents = legacyDocuments.map((document) => ({ ...document, folderId: null }))
      total = documents.length
    }

    const headers = paginationHeaders(total, pagination)

    if (pagination.requested) {
      return NextResponse.json(
        {
          folders,
          documents,
          pagination: buildPaginationMeta(pagination.page, pagination.pageSize, total),
        },
        { headers }
      )
    }

    return NextResponse.json({ folders, documents }, { headers })
  } catch (error) {
    console.error('Failed to load client documents:', error)
    return NextResponse.json({ error: 'Unable to load documents' }, { status: 500 })
  }
}
