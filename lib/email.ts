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

export function isGraphApiConfigured(): boolean {
  return Boolean(
    process.env.AZURE_TENANT_ID?.trim() &&
    process.env.AZURE_CLIENT_ID?.trim() &&
    process.env.AZURE_CLIENT_SECRET?.trim()
  )
}

export function isEmailConfigured(): boolean {
  return isSmtpConfigured() || isGraphApiConfigured()
}

export function isSmtpConfigured(): boolean {
  const host = process.env.SMTP_HOST?.trim().replace(/^["']|["']$/g, '').toLowerCase()
  const port = process.env.SMTP_PORT?.trim().replace(/^["']|["']$/g, '')
  const user = process.env.SMTP_USER?.trim().replace(/^["']|["']$/g, '')
  const pass = process.env.SMTP_PASS?.trim().replace(/^["']|["']$/g, '')

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

async function sendViaGraphApi(input: SendEmailInput) {
  const tenantId = process.env.AZURE_TENANT_ID!.trim().replace(/^["']|["']$/g, '')
  const clientId = process.env.AZURE_CLIENT_ID!.trim().replace(/^["']|["']$/g, '')
  const clientSecret = process.env.AZURE_CLIENT_SECRET!.trim().replace(/^["']|["']$/g, '')
  const senderEmail = sanitizeHeader(process.env.SMTP_FROM || process.env.SMTP_USER || '').replace(/^["']|["']$/g, '')

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })

  const tokenRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  })

  if (!tokenRes.ok) {
    const errText = await tokenRes.text()
    throw new Error(`Graph token failed: ${tokenRes.status} ${errText}`)
  }

  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token

  const sendUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`
  const sendRes = await fetch(sendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        subject: input.subject,
        body: {
          contentType: input.html ? 'HTML' : 'Text',
          content: input.html || input.text,
        },
        toRecipients: [
          {
            emailAddress: {
              address: input.to,
            },
          },
        ],
      },
      saveToSentItems: true,
    }),
  })

  if (!sendRes.ok) {
    const errText = await sendRes.text()
    throw new Error(`Graph sendMail failed: ${sendRes.status} ${errText}`)
  }

  return { sent: true as const }
}

function getSmtpConfig() {
  if (!isSmtpConfigured()) {
    return null
  }

  const host = process.env.SMTP_HOST!.trim().replace(/^["']|["']$/g, '')
  const port = Number(process.env.SMTP_PORT?.trim().replace(/^["']|["']$/g, ''))
  const user = process.env.SMTP_USER!.trim().replace(/^["']|["']$/g, '')
  const pass = process.env.SMTP_PASS!.trim().replace(/^["']|["']$/g, '')

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
  if (isGraphApiConfigured()) {
    try {
      return await sendViaGraphApi(input)
    } catch (graphError: any) {
      console.error('Failed to send notification email via Microsoft Graph API:', graphError?.message || graphError)
      return { sent: false as const, reason: 'GRAPH_SEND_FAILED' as const, error: graphError?.message }
    }
  }

  const smtpConfig = getSmtpConfig()

  if (!smtpConfig) {
    console.warn('SMTP is not configured. Skipping email notification.')
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' as const }
  }

  const transporter = nodemailer.createTransport(smtpConfig)
  const from = sanitizeHeader(process.env.SMTP_FROM || process.env.SMTP_USER || '').replace(/^["']|["']$/g, '')
  const to = sanitizeHeader(input.to)
  const subject = sanitizeHeader(input.subject)

  if (!from || !to || !subject) {
    throw new Error('Invalid email notification headers')
  }

  try {
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
  } catch (error: any) {
    console.error('Failed to send notification email via SMTP:', error?.message || error)
    return { sent: false as const, reason: 'SMTP_SEND_FAILED' as const, error: error?.message }
  }
}

/**
 * Diagnostic utility to verify SMTP or Microsoft Graph credentials and connectivity.
 */
export async function verifySmtpConnection(): Promise<{
  success: boolean
  message: string
  code?: string
  response?: string
}> {
  if (isGraphApiConfigured()) {
    try {
      const tenantId = process.env.AZURE_TENANT_ID!.trim().replace(/^["']|["']$/g, '')
      const clientId = process.env.AZURE_CLIENT_ID!.trim().replace(/^["']|["']$/g, '')
      const clientSecret = process.env.AZURE_CLIENT_SECRET!.trim().replace(/^["']|["']$/g, '')

      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
      const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      })

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenParams.toString(),
      })

      if (!tokenRes.ok) {
        const errText = await tokenRes.text()
        return {
          success: false,
          message: `فشل التحقق من صلاحيات Microsoft Graph API: ${tokenRes.status} ${errText}`,
          code: 'GRAPH_AUTH_FAILED',
        }
      }

      const tokenData = await tokenRes.json()

      // Verify if Mail.Send permission is present in token roles
      try {
        const payload = JSON.parse(Buffer.from(tokenData.access_token.split('.')[1], 'base64').toString('utf8'))
        const roles: string[] = payload.roles || []
        const hasMailSend = roles.some((r) => r.toLowerCase().startsWith('mail.send'))

        if (!hasMailSend) {
          return {
            success: false,
            message: 'تم الاتصال بتطبيق QHSSE Mailer بنجاح، لكن يلزم إضافة إذن (Mail.Send) والضغط على "Grant admin consent" في لوحة Microsoft Entra لتفعيل إرسال الرسائل.',
            code: 'GRAPH_PERMISSION_MISSING',
          }
        }
      } catch {
        // Fallback if token parse fails
      }

      return {
        success: true,
        message: 'تم التحقق من حساب Microsoft Graph API وصلاحية Mail.Send بنجاح وجاهز للإرسال السحابي المباشر.',
      }
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'خطأ في التحقق من Graph API',
      }
    }
  }

  const smtpConfig = getSmtpConfig()
  if (!smtpConfig) {
    return {
      success: false,
      message: 'إعدادات SMTP أو Microsoft Graph غير مكتملة في ملف .env',
      code: 'SMTP_NOT_CONFIGURED',
    }
  }

  const transporter = nodemailer.createTransport(smtpConfig)

  try {
    await transporter.verify()
    return {
      success: true,
      message: 'تم الاتصال والتحقق من خادم SMTP بنجاح.',
    }
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'فشل الاتصال بخادم البريد الإلكتروني',
      code: error?.code,
      response: error?.response,
    }
  }
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

/**
 * Notifies the QHSSE consultant/admin that a client submitted corrective actions or proof photos.
 */
export async function notifyConsultantClientAction(input: {
  observationId: string
  clientName: string
  actionType: 'PROOF_UPLOADED' | 'CORRECTIVE_ACTION_SUBMITTED'
  observationTitle: string
  siteName?: string
}) {
  const targetEmail = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER || 'support@qhsseconsultant.onmicrosoft.com'
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://qhsseconsultant.com').replace(/\/$/, '')
  const adminUrl = `${appUrl}/admin`

  const isProof = input.actionType === 'PROOF_UPLOADED'
  const subject = isProof
    ? `📸 إثبات معالجة جديد: قام العميل ${input.clientName} برفع صورة إثبات - ${input.observationTitle}`
    : `📝 إجراء تصحيحي جديد: استجابة العميل ${input.clientName} - ${input.observationTitle}`

  const text = `عناية استشاري السلامة،\n\nقام العميل (${input.clientName}) بتقديم ${
    isProof ? 'صورة إثبات معالجة (بعد الإصلاح)' : 'إجراء تصحيحي ورداً رسمياً'
  } للملاحظة التالية:\n\n- المنشأة/الموقع: ${input.siteName || '-'}\n- الملاحظة: ${input.observationTitle}\n- كود الملاحظة: ${input.observationId}\n\nيرجى الدخول إلى لوحة الإدارة لمراجعة الإجراء واعتماده:\n${adminUrl}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="background-color: #0284c7; padding: 18px; border-radius: 12px; text-align: center; color: #ffffff; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 18px;">${isProof ? 'إثبات معالجة جديد من العميل' : 'استجابة جديدة وإجراء تصحيحي'}</h2>
      </div>
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        قام ممثل المنشأة <strong>${input.clientName}</strong> بتقديم تحديث على الملاحظة الميدانية بانتظار مراجعتكم واعتمادكم:
      </p>
      <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px; font-size: 13px;"><strong>الموقع:</strong> ${input.siteName || '-'}</p>
        <p style="margin: 0 0 8px; font-size: 13px;"><strong>الملاحظة:</strong> ${input.observationTitle}</p>
        <p style="margin: 0; font-size: 13px;"><strong>نوع الإجراء:</strong> ${isProof ? 'صورة إثبات بعد المعالجة' : 'خطة عمل تصحيحية (CAPA)'}</p>
      </div>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${adminUrl}" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
          مراجعة واعتماد الإجراء في لوحة الإدارة
        </a>
      </div>
    </div>
  `

  return sendNotificationEmail({
    to: targetEmail,
    subject,
    text,
    html,
  }).catch((err) => {
    console.error('[Notification] Failed to notify consultant of client action:', err)
  })
}

/**
 * Notifies the client when the consultant reviews their corrective action (approved or revision requested).
 */
export async function notifyClientActionReviewed(input: {
  observationId: string
  status: 'APPROVED' | 'REVISION_REQUESTED'
  observationTitle: string
  siteName?: string
}) {
  try {
    const obs = await prisma.observation.findUnique({
      where: { id: input.observationId },
      include: {
        report: {
          include: {
            client: {
              include: { user: true },
            },
          },
        },
      },
    })

    const clientEmail = obs?.report?.client?.user?.email
    if (!clientEmail) return

    const isApproved = input.status === 'APPROVED'
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://qhsseconsultant.com').replace(/\/$/, '')
    const dashboardUrl = `${appUrl}/dashboard`

    const subject = isApproved
      ? `✅ تم اعتماد الإجراء التصحيحي وإغلاق الملاحظة: ${input.observationTitle}`
      : `⚠️ مطلوب تعديل على الإجراء التصحيحي: ${input.observationTitle}`

    const text = isApproved
      ? `عناية إدارة السلامة،\n\nنود إفادتكم بأن استشاري السلامة قد راجع واعتمد الإجراء التصحيحي وإثبات المعالجة المقدم منكم للملاحظة (${input.observationTitle})، وتم إغلاق الملاحظة بنجاح.\n\nرابط البوابة: ${dashboardUrl}`
      : `عناية إدارة السلامة،\n\nقام استشاري السلامة بمراجعة الإجراء التصحيحي للملاحظة (${input.observationTitle})، ويطلب منكم مراجعة الإجراء أو رفع إثباتات إضافية لاستكمال متطلبات السلامة.\n\nرابط البوابة: ${dashboardUrl}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="background-color: ${isApproved ? '#059669' : '#d97706'}; padding: 18px; border-radius: 12px; text-align: center; color: #ffffff; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 18px;">${isApproved ? 'اعتماد الإجراء التصحيحي رسمياً' : 'مطلوب مراجعة الإجراء التصحيحي'}</h2>
        </div>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          ${isApproved
            ? `نفيدكم بأنه تم <strong>اعتماد وإغلاق</strong> الملاحظة الميدانية بنجاح من قِبل استشاري السلامة:`
            : `يرجى مراجعة الملاحظة الميدانية وتحديث الإجراء أو رفع إثبات إضافي طبقاً لتوجيهات الاستشاري:`}
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-size: 13px;"><strong>الملاحظة:</strong> ${input.observationTitle}</p>
          <p style="margin: 0; font-size: 13px;"><strong>الحالة الحالية:</strong> ${isApproved ? 'معتمد ومغلق (Approved & Closed)' : 'مطلوب تعديل (Revision Requested)'}</p>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${dashboardUrl}" style="background-color: ${isApproved ? '#059669' : '#d97706'}; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
            فتح بوابة العميل
          </a>
        </div>
      </div>
    `

    await sendNotificationEmail({
      to: clientEmail,
      subject,
      text,
      html,
    })
  } catch (err) {
    console.error('[Notification] Failed to notify client of action review:', err)
  }
}

