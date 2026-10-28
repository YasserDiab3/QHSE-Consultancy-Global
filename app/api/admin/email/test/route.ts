import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isEmailConfigured, isGraphApiConfigured, sendNotificationEmail, verifySmtpConnection } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getM365Guidance(errorMessage: string) {
  if (errorMessage.includes('535') || errorMessage.includes('Authentication unsuccessful')) {
    return {
      isM365AuthIssue: true,
      reason: 'Microsoft 365 Exchange Online رفض المصادقة الأساسية (535 5.7.3 Authentication unsuccessful).',
      solutions: [
        '1. تأكد من تفعيل "Authenticated SMTP" لحساب البريد في لوحة إدارة Microsoft 365 (Users > Active users > Mail > Manage email apps > Authenticated SMTP).',
        '2. إذا كان التحقق الثنائي (MFA / Two-Step) مفعلاً على الحساب، يرجى توليد "كلمة مرور التطبيق" (App Password) من صفحة myaccount.microsoft.com > Security info واستخدامها في SMTP_PASS.',
        '3. التأكد من دقة كلمة المرور وعدم وجود مسافات إضافية.',
      ],
    }
  }
  return null
}

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.email || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const configured = isEmailConfigured()
    if (!configured) {
      return NextResponse.json({
        configured: false,
        status: 'unconfigured',
        message: 'إعدادات البريد السحابي أو SMTP غير مكتملة في متغيرات البيئة.',
      })
    }

    const check = await verifySmtpConnection()
    const guidance = check.success ? null : getM365Guidance(check.message)

    return NextResponse.json({
      configured: true,
      status: check.success ? 'connected' : 'error',
      message: check.message,
      driver: isGraphApiConfigured() ? 'Microsoft Graph API' : 'SMTP',
      guidance,
      details: {
        driver: isGraphApiConfigured() ? 'Microsoft Graph API' : 'SMTP',
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.email || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const targetEmail = body.to?.trim() || session.user.email

    const check = await verifySmtpConnection()
    if (!check.success) {
      const guidance = getM365Guidance(check.message)
      return NextResponse.json(
        {
          success: false,
          error: check.message,
          guidance,
        },
        { status: 400 }
      )
    }

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://qhsseconsultant.com').replace(/\/$/, '')
    const sendResult = await sendNotificationEmail({
      to: targetEmail,
      subject: '✅ فحص اتصال البريد الإلكتروني - منصة استشارات السلامة والصحة المهنية',
      text: `مرحباً،\n\nهذه رسالة اختبارية لتأكيد عمل خدمة البريد الإلكتروني الرسمية بنجاح عبر بوابة QHSSE Consultant Portal.\n\nالرابط: ${appUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="background-color: #0284c7; padding: 16px; border-radius: 12px; text-align: center; color: #ffffff; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 18px;">✅ اختبار نجاح البريد الإلكتروني</h2>
          </div>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            تم إرسال هذه الرسالة بنجاح من حساب البريد الرسمي: <strong>${process.env.SMTP_USER}</strong> عبر خادم Microsoft 365 Exchange Online.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px; margin: 16px 0; font-size: 13px; color: #475569;">
            <p style="margin: 0 0 6px;"><strong>المستلم:</strong> ${targetEmail}</p>
            <p style="margin: 0;"><strong>التاريخ:</strong> ${new Date().toLocaleString('ar-EG')}</p>
          </div>
          <div style="text-align: center; margin-top: 20px;">
            <a href="${appUrl}/admin" style="background-color: #0284c7; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">
              الرجوع للوحة الإدارة
            </a>
          </div>
        </div>
      `,
    })

    if (!sendResult.sent) {
      return NextResponse.json(
        {
          success: false,
          error: sendResult.error || 'Failed to dispatch email',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `تم إرسال البريد الاختباري بنجاح إلى: ${targetEmail}`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal error' }, { status: 500 })
  }
}
