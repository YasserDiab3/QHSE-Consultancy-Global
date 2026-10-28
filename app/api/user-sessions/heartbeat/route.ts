import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { heartbeatUserSession } from '@/lib/user-session-records'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {}

    const success = await heartbeatUserSession(session.user.id, {
      latitude: typeof body?.latitude === 'number' ? body.latitude : null,
      longitude: typeof body?.longitude === 'number' ? body.longitude : null,
      accuracy: typeof body?.accuracy === 'number' ? body.accuracy : null,
    })

    return NextResponse.json({ success })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
