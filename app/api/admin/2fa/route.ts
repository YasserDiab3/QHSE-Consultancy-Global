import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { is2FaEnabledForUser, set2FaEnabledForUser } from '@/lib/auth-2fa'
import { isEmailConfigured } from '@/lib/email'
import { createActivityLogRecord } from '@/lib/activity-log-records'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.email || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const enabled = await is2FaEnabledForUser(session.user.email)
    const smtpConfigured = isEmailConfigured()

    return NextResponse.json({
      enabled,
      smtpConfigured,
      email: session.user.email,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.email || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const enable = Boolean(body.enabled)

    const success = await set2FaEnabledForUser(session.user.email, enable)
    if (!success) {
      return NextResponse.json({ error: 'Failed to update 2FA status' }, { status: 500 })
    }

    createActivityLogRecord({
      userId: session.user.id,
      action: enable ? '2FA_ENABLED' : '2FA_DISABLED',
      entityType: 'SECURITY',
      details: enable
        ? 'Admin enabled Two-Factor Authentication (2FA)'
        : 'Admin disabled Two-Factor Authentication (2FA)',
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      enabled: enable,
      smtpConfigured: isEmailConfigured(),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
