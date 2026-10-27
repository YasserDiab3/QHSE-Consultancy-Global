import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { purgeExpiredData } from '@/lib/retention'
import { checkSlaEscalations } from '@/lib/sla-escalation'
import { logActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isAuthorized(request: Request, adminUser?: { id: string; role: string } | null) {
  if (adminUser?.role === 'ADMIN') {
    return true
  }

  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    return false
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) {
    return true
  }

  const customHeader = request.headers.get('x-cron-secret')
  if (customHeader === cronSecret) {
    return true
  }

  return false
}

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!isAuthorized(request, session?.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const daysParam = searchParams.get('days')
    const visitorRetentionDays = daysParam ? Math.max(1, Math.min(365, parseInt(daysParam, 10) || 90)) : 90

    const result = await purgeExpiredData({ visitorRetentionDays })
    const slaResult = await checkSlaEscalations({ sendEmails: true })

    if (session?.user?.id) {
      await logActivity(
        session.user.id,
        'DATA_PURGE',
        'SYSTEM',
        'RETENTION',
        `Purged ${result.purgedVisitors} visitor sessions and ${result.purgedRateLimits} rate limit entries. Checked ${slaResult.checkedCount} SLAs (${slaResult.approachingCount} approaching, ${slaResult.overdueCount} overdue).`
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Expired data cleanup and SLA escalation checks completed successfully',
      ...result,
      slaSummary: {
        checkedObservations: slaResult.checkedCount,
        approachingBreach: slaResult.approachingCount,
        overdue: slaResult.overdueCount,
        emailsSent: slaResult.emailsSent,
      },
    })
  } catch (error) {
    console.error('Data purge cron error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute data cleanup' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
