import { NextResponse } from 'next/server'
import { getTrainingCertificateByCode } from '@/lib/training-records'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_request: Request, { params }: { params: { code: string } }) {
  try {
    const certificate = await getTrainingCertificateByCode(params.code.trim())
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
