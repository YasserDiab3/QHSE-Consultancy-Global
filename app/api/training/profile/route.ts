import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTrainingProfile } from '@/lib/training-records'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profile = await getTrainingProfile(session.user.id)
    return NextResponse.json(profile, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load training profile' }, { status: 500 })
  }
}
