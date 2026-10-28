import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { terminateUserSession } from '@/lib/user-session-records'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ success: true })
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {}

    await terminateUserSession(session.user.id, body?.sessionId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
