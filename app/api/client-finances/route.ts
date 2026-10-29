import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getClientIdByUserId } from '@/lib/client-records'
import { prisma } from '@/lib/prisma'

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
        return NextResponse.json({ financialRecords: [], summary: { total: 0, paid: 0, pending: 0 } }, { status: 200 })
      }
    } else if (session.user.role === 'ADMIN' || session.user.role === 'DATA_ENTRY') {
      const urlClientId = new URL(request.url).searchParams.get('clientId')
      clientId = urlClientId || null
      if (!clientId) {
        return NextResponse.json({ financialRecords: [], summary: { total: 0, paid: 0, pending: 0 } }, { status: 200 })
      }
    } else {
      return NextResponse.json({ financialRecords: [], summary: { total: 0, paid: 0, pending: 0 } }, { status: 200 })
    }

    const records = await prisma.financialRecord.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
    })

    let total = 0
    let paid = 0
    let pending = 0

    for (const item of records) {
      const amount = Number(item.amount) || 0
      total += amount
      if (item.status === 'PAID') {
        paid += amount
      } else if (item.status === 'PARTIAL') {
        let p = 0
        try {
          if (item.notes && item.notes.trim().startsWith('{')) {
            const d = JSON.parse(item.notes.trim())
            p = Number(d.paidAmount) || 0
          }
        } catch {
          p = 0
        }
        paid += p
        pending += Math.max(0, amount - p)
      } else {
        pending += amount
      }
    }

    return NextResponse.json({
      financialRecords: records,
      summary: {
        total,
        paid,
        pending,
        count: records.length,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
