import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getClientIdByUserId } from '@/lib/client-records'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const clientId = await getClientIdByUserId(session.user.id)
    if (!clientId) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

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

    try {
      ;[folders, documents] = await Promise.all([
        prisma.knowledgeFolder.findMany({
          where: { clientId },
          select: { id: true, parentId: true, name: true, category: true },
          orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
        }),
        prisma.clientDocument.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, select: documentSelect }),
      ])
    } catch (error: any) {
      // Keep the existing client document library available until the folder
      // migration has been applied to an older database.
      if (error?.code !== 'P2021') throw error
      documents = await prisma.clientDocument.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, select: documentSelect })
    }

    return NextResponse.json({ folders, documents })
  } catch (error) {
    console.error('Failed to load client documents:', error)
    return NextResponse.json({ error: 'Unable to load documents' }, { status: 500 })
  }
}
