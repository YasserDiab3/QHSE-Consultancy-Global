import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { listUserSessionRecords } from '@/lib/user-session-records'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const role = searchParams.get('role') || undefined
    const status = searchParams.get('status') || undefined
    const search = searchParams.get('search') || undefined
    const language = (searchParams.get('language') === 'en' ? 'en' : 'ar') as 'ar' | 'en'

    const result = await listUserSessionRecords({
      role,
      status,
      search,
      language,
      limit: 200,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching admin user sessions:', error)
    return NextResponse.json({ error: error.message || 'Failed to list sessions' }, { status: 500 })
  }
}
