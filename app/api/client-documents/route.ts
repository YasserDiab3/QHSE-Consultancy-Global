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

    const documents = await prisma.clientDocument.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Failed to load client documents:', error)
    return NextResponse.json({ error: 'Unable to load documents' }, { status: 500 })
  }
}
