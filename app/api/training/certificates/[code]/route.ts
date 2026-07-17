import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getTrainingCertificateByCode } from '@/lib/training-records'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const certificate = await getTrainingCertificateByCode(code)
    if (!certificate) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
    }

    const canView = session.user.role === 'ADMIN' || certificate.userId === session.user.id
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(certificate, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load certificate' }, { status: 500 })
  }
}
