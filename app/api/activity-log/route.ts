import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { listActivityLogRecords } from '@/lib/activity-log-records'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const logs = await listActivityLogRecords(100)

    return NextResponse.json(logs)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
