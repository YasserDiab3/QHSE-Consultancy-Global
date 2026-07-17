import { NextResponse } from 'next/server'
import { getTrainingCertificateByCode } from '@/lib/training-records'
import { enforceRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: certificateCode } = await params
  try {
    const code = certificateCode.trim().toUpperCase()
    if (!/^QHSSE-TR-\d{4}-[A-Z0-9-]{6,40}$/.test(code)) {
      return NextResponse.json({ valid: false, error: 'Certificate not found' }, { status: 404 })
    }

    const rateLimit = await enforceRateLimit(
      _request,
      { keyPrefix: 'certificate-verify', limit: 30, windowMs: 60 * 1000 },
      code
    )
    if (!rateLimit.success) return rateLimitResponse(rateLimit)

    const certificate = await getTrainingCertificateByCode(code)
    if (!certificate) {
      return NextResponse.json({ valid: false, error: 'Certificate not found' }, { status: 404 })
    }

    return NextResponse.json({
      valid: true,
      certificateCode: certificate.certificateCode,
      recipientName: certificate.userName,
      courseTitle: certificate.courseTitle,
      courseTitleAr: certificate.courseTitleAr,
      score: certificate.score,
      issuedAt: certificate.certificateIssuedAt,
    })
  } catch (error: any) {
    return NextResponse.json({ valid: false, error: error.message || 'Failed to verify certificate' }, { status: 500 })
  }
}
