import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  generateTotpSecret,
  generateTotpUri,
  generateTotpQrCode,
  formatSecretForDisplay,
  verifyTotpCode,
} from '@/lib/totp'
import { set2FaEnabledForUser } from '@/lib/auth-2fa'
import { createActivityLogRecord } from '@/lib/activity-log-records'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.email || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const secret = generateTotpSecret(20)
    const uri = generateTotpUri({
      secret,
      accountName: session.user.email,
      issuer: 'QHSE Global',
    })
    const qrCode = await generateTotpQrCode(uri)
    const formattedSecret = formatSecretForDisplay(secret)

    return NextResponse.json({
      secret,
      formattedSecret,
      qrCode,
      uri,
      email: session.user.email,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to initialize TOTP setup' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.email || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const secret = typeof body.secret === 'string' ? body.secret.trim() : ''
    const code = typeof body.code === 'string' ? body.code.trim() : ''

    if (!secret || !code) {
      return NextResponse.json({ error: 'Secret and code are required' }, { status: 400 })
    }

    const isValid = verifyTotpCode(code, secret)
    if (!isValid) {
      return NextResponse.json(
        { error: 'INVALID_CODE', message: 'رمز التحقق غير صحيح، يرجى التأكد من الرمز الظاهر في التطبيق' },
        { status: 400 }
      )
    }

    const cleanSecret = secret.replace(/[\s-]/g, '').toUpperCase()

    // Save secret to user in database
    await prisma.user.updateMany({
      where: { email: session.user.email.toLowerCase().trim() },
      data: { twoFactorSecret: cleanSecret },
    })

    // Enable 2FA for the user
    await set2FaEnabledForUser(session.user.email, true)

    createActivityLogRecord({
      userId: session.user.id,
      action: '2FA_AUTHENTICATOR_ENABLED',
      entityType: 'SECURITY',
      details: 'Admin verified and activated Authenticator app (Google / Microsoft Authenticator)',
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      enabled: true,
      hasAuthenticator: true,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to activate TOTP' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const session = await getSession()
    if (!session?.user?.email || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.updateMany({
      where: { email: session.user.email.toLowerCase().trim() },
      data: { twoFactorSecret: null },
    })

    createActivityLogRecord({
      userId: session.user.id,
      action: '2FA_AUTHENTICATOR_DISABLED',
      entityType: 'SECURITY',
      details: 'Admin unlinked Authenticator app (TOTP)',
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      hasAuthenticator: false,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to unlink TOTP' },
      { status: 500 }
    )
  }
}
