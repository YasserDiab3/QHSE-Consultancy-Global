import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'

type SendEmailInput = {
  to: string
  subject: string
  text: string
  html?: string
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]+/g, ' ').trim()
}

export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST?.trim().toLowerCase()
  const port = process.env.SMTP_PORT?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()

  if (!host || !port || !user || !pass) {
    return false
  }

  // Reject placeholder values
  if (
    host.includes('example.com') ||
    host === 'smtp.yourdomain.com' ||
    pass === 'your-smtp-password' ||
    pass === 'password'
  ) {
    return false
  }

  return true
}

function getSmtpConfig() {
  if (!isSmtpConfigured()) {
    return null
  }

  const host = process.env.SMTP_HOST!.trim()
  const port = Number(process.env.SMTP_PORT)
  const user = process.env.SMTP_USER!.trim()
  const pass = process.env.SMTP_PASS!.trim()

  return {
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    tls: {
      rejectUnauthorized: true,
    },
    auth: {
      user,
      pass,
    },
  }
}

export async function sendNotificationEmail(input: SendEmailInput) {
  const smtpConfig = getSmtpConfig()

  if (!smtpConfig) {
    console.warn('SMTP is not configured. Skipping email notification.')
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' as const }
  }

  const transporter = nodemailer.createTransport(smtpConfig)
  const from = sanitizeHeader(process.env.SMTP_FROM || process.env.SMTP_USER || '')
  const to = sanitizeHeader(input.to)
  const subject = sanitizeHeader(input.subject)

  if (!from || !to || !subject) {
    throw new Error('Invalid email notification headers')
  }

  await transporter.sendMail({
    from,
    to,
    subject,
    text: input.text,
    html: input.html,
    disableFileAccess: true,
    disableUrlAccess: true,
  })

  return { sent: true as const }
}

export type CriticalRiskAlertInput = {
  to: string
  clientName: string
  siteName: string
  reportId: string
  observationTitle: string
  description?: string | null
  riskLevel: string
  language?: 'ar' | 'en'
}

export async function sendCriticalRiskAlertEmail(input: CriticalRiskAlertInput) {
  const isArabic = input.language === 'ar'
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://qhsseconsultant.com').replace(/\/$/, '')
  const reportUrl = `${appUrl}/dashboard?report=${encodeURIComponent(input.reportId)}`

  const subject = isArabic
    ? `⚠️ تنبيه سلامة حرج: تم تسجيل ملاحظة عالية الخطورة - ${input.siteName}`
    : `⚠️ URGENT Safety Notice: Critical Risk Logged - ${input.siteName}`

  const text = isArabic
    ? `تنبيه أمني وصحي فوري: تم تسجيل ملاحظة ذات خطورة حرجة (CRITICAL) في منشأة ${input.siteName} التابعة لـ ${input.clientName}.\n\nالملاحظة: ${input.observationTitle}\nالتفاصيل: ${input.description || 'يرجى مراجعة المنصة'}\nكود التقرير: ${input.reportId}\n\nيرجى الدخول فوراً إلى بوابة العميل لاتخاذ الإجراء التصحيحي اللازم:\n${reportUrl}`
    : `Urgent QHSSE Notice: A CRITICAL risk observation was recorded for ${input.siteName} (${input.clientName}).\n\nObservation: ${input.observationTitle}\nDetails: ${input.description || 'Please review the portal'}\nReport ID: ${input.reportId}\n\nPlease access the client portal immediately to review and submit corrective actions:\n${reportUrl}`

  const html = `
<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #fee2e2; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.08);">
    <tr>
      <td style="background-color: #dc2626; padding: 24px; text-align: center; color: #ffffff;">
        <span style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">
          ${isArabic ? 'تنبيه سلامة فوري' : 'URGENT SAFETY ALERT'}
        </span>
        <h1 style="margin: 12px 0 0; font-size: 20px; font-weight: 800; line-height: 1.3;">
          ${isArabic ? 'تم رصد ملاحظة ذات خطورة حرجة (CRITICAL)' : 'Critical Risk Observation Logged'}
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 28px;">
        <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #334155;">
          ${isArabic
            ? `عناية إدارة السلامة في <strong>${input.clientName}</strong>، قام استشاري السلامة بتسجيل ملاحظة حرجة تتطلب إجراءً تصحيحياً فورياً لضمان سلامة الأفراد والمنشأة:`
            : `Attention Safety Management at <strong>${input.clientName}</strong>, our QHSSE consultant has recorded a critical risk finding requiring immediate attention and corrective action:`
          }
        </p>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="12" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; margin: 20px 0;">
          <tr>
            <td style="font-size: 13px; color: #991b1b; font-weight: 600; width: 30%;">
              ${isArabic ? 'الموقع / المنشأة:' : 'Site / Facility:'}
            </td>
            <td style="font-size: 14px; color: #1e293b; font-weight: 700;">
              ${input.siteName}
            </td>
          </tr>
          <tr>
            <td style="font-size: 13px; color: #991b1b; font-weight: 600;">
              ${isArabic ? 'الملاحظة الميدانية:' : 'Observation:'}
            </td>
            <td style="font-size: 14px; color: #1e293b; font-weight: 700;">
              ${input.observationTitle}
            </td>
          </tr>
          ${input.description ? `
          <tr>
            <td style="font-size: 13px; color: #991b1b; font-weight: 600; vertical-align: top;">
              ${isArabic ? 'التفاصيل:' : 'Details:'}
            </td>
            <td style="font-size: 13px; color: #475569; line-height: 1.5;">
              ${input.description}
            </td>
          </tr>` : ''}
          <tr>
            <td style="font-size: 13px; color: #991b1b; font-weight: 600;">
              ${isArabic ? 'رقم التقرير المرجعي:' : 'Report Reference:'}
            </td>
            <td style="font-size: 13px; color: #64748b; font-family: monospace;">
              ${input.reportId}
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin: 32px 0 16px;">
          <a href="${reportUrl}" style="display: inline-block; background-color: #1e40af; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 10px rgba(30, 64, 175, 0.25);">
            ${isArabic ? 'فتح التقرير واتخاذ الإجراء التصحيحي' : 'View Report & Submit Corrective Action'}
          </a>
        </div>

        <p style="margin: 24px 0 0; font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
          ${isArabic
            ? 'تم إرسال هذا التنبيه التلقائي نظراً للأهمية القصوى لمعايير السلامة المهنية والصحية.'
            : 'This is an automated safety alert generated because the finding was classified as CRITICAL.'
          }
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
        QHSSE Consultant &bull; Safety &bull; Health &bull; Environment
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  return sendNotificationEmail({
    to: input.to,
    subject,
    text,
    html,
  })
}

export async function notifyCriticalObservation(input: {
  reportId: string
  observationTitle: string
  observationTitleAr?: string | null
  description?: string | null
  descriptionAr?: string | null
  riskLevel: string
}) {
  if (input.riskLevel !== 'CRITICAL') {
    return { notified: false, reason: 'NOT_CRITICAL' as const }
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id: input.reportId },
      include: {
        client: {
          include: {
            user: true,
          },
        },
      },
    })

    const clientEmail = report?.client?.user?.email
    if (!clientEmail) {
      return { notified: false, reason: 'CLIENT_EMAIL_NOT_FOUND' as const }
    }

    const client = report.client
    const isArabic = Boolean(client.user.language === 'ar' || report.siteNameAr || input.observationTitleAr)
    const clientName = (isArabic ? client.companyNameAr : client.companyName) || client.companyName
    const siteName = (isArabic ? report.siteNameAr : report.siteName) || report.siteName
    const observationTitle = (isArabic ? input.observationTitleAr : input.observationTitle) || input.observationTitle
    const description = (isArabic ? input.descriptionAr : input.description) || input.description

    const result = await sendCriticalRiskAlertEmail({
      to: clientEmail,
      clientName,
      siteName,
      reportId: report.id,
      observationTitle,
      description,
      riskLevel: input.riskLevel,
      language: isArabic ? 'ar' : 'en',
    })

    return { notified: true, sent: result.sent }
  } catch (error) {
    console.error('Critical observation notification error:', error)
    return { notified: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

