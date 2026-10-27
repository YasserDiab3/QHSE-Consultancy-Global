import { listReportRecords } from '@/lib/report-records'
import { sendNotificationEmail } from '@/lib/email'

export const SLA_DAYS: Record<string, number> = {
  CRITICAL: 2, // 48 hours
  HIGH: 7,     // 7 days
  MEDIUM: 14,  // 14 days
  LOW: 30,     // 30 days
}

export type SlaObservationAlert = {
  observationId: string
  title: string
  titleAr?: string | null
  riskLevel: string
  siteName: string
  siteNameAr?: string | null
  reportDate: Date
  deadline: Date
  hoursRemaining: number
  status: 'APPROACHING_BREACH' | 'OVERDUE'
  clientEmail?: string | null
  clientName?: string | null
}

export type SlaEscalationResult = {
  checkedCount: number
  approachingCount: number
  overdueCount: number
  alerts: SlaObservationAlert[]
  emailsSent: number
}

/**
 * Calculates deadline for a given report date and risk level.
 */
export function calculateSlaDeadline(reportDate: Date | string, riskLevel: string): Date {
  const base = new Date(reportDate)
  const days = SLA_DAYS[riskLevel.toUpperCase()] ?? 14
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
}

/**
 * Scans open observations for upcoming SLA deadlines (< 24 hours) or overdue breaches,
 * and optionally dispatches email warnings to client and consultant.
 */
export async function checkSlaEscalations(
  options: { sendEmails?: boolean } = {}
): Promise<SlaEscalationResult> {
  const sendEmails = options.sendEmails ?? true
  const now = new Date()

  let reports: any[] = []

  try {
    reports = await listReportRecords({ includeImages: false })
  } catch (error) {
    console.warn('[SLA Escalation] Error querying reports:', error)
    return {
      checkedCount: 0,
      approachingCount: 0,
      overdueCount: 0,
      alerts: [],
      emailsSent: 0,
    }
  }

  const alerts: SlaObservationAlert[] = []
  let totalChecked = 0

  for (const report of reports) {
    if (!Array.isArray(report.observations)) continue

    const clientEmail = report.client?.user?.email ?? null
    const clientName = report.client?.companyName ?? null

    for (const obs of report.observations) {
      const isClosed = ['CLOSED', 'RESOLVED'].includes(obs.status) || obs.correctiveActionStatus === 'APPROVED'
      const isTargetRisk = ['CRITICAL', 'HIGH'].includes((obs.riskLevel || '').toUpperCase())

      if (isClosed || !isTargetRisk) continue

      totalChecked += 1
      const deadline = calculateSlaDeadline(report.date, obs.riskLevel)
      const diffMs = deadline.getTime() - now.getTime()
      const hoursRemaining = Math.round(diffMs / (1000 * 60 * 60))

      // Alert if overdue OR within 24 hours of breach
      if (hoursRemaining <= 24) {
        alerts.push({
          observationId: obs.id,
          title: obs.title,
          titleAr: obs.titleAr,
          riskLevel: obs.riskLevel,
          siteName: report.siteName,
          siteNameAr: report.siteNameAr,
          reportDate: new Date(report.date),
          deadline,
          hoursRemaining,
          status: hoursRemaining <= 0 ? 'OVERDUE' : 'APPROACHING_BREACH',
          clientEmail,
          clientName,
        })
      }
    }
  }

  let emailsSent = 0

  if (sendEmails && alerts.length > 0) {
    for (const alert of alerts) {
      if (!alert.clientEmail) continue

      const isOverdue = alert.status === 'OVERDUE'
      const subject = isOverdue
        ? `[تنبيه تجاوز المهلة - SLA] تأخر معالجة ملاحظة ${alert.riskLevel}: ${alert.title}`
        : `[تنبيه اقتراب الموعد - SLA] يتبقى ${alert.hoursRemaining} ساعة لمعالجة ملاحظة: ${alert.title}`

      const text = `
تنبيه متابعة معالجة الملاحظات الميدانية (SLA Escalation Alert):
الموقع: ${alert.siteName}
مستوى الخطورة: ${alert.riskLevel}
الملاحظة: ${alert.title}
تاريخ الزيارة: ${alert.reportDate.toISOString().split('T')[0]}
الموعد النهائي: ${alert.deadline.toISOString().split('T')[0]}
الحالة: ${isOverdue ? `تجاوزت المهلة المحددة (${Math.abs(alert.hoursRemaining)} ساعة)` : `يتبقى ${alert.hoursRemaining} ساعة فقط على انتهاء المهلة`}

يرجى تسجيل الدخول إلى لوحة تحكم المنشأة ورفع إثبات المعالجة أو رد العميل في أقرب وقت.
      `.trim()

      sendNotificationEmail({
        to: alert.clientEmail,
        subject,
        text,
      })
        .then((res) => {
          if (res?.sent) emailsSent += 1
        })
        .catch(() => {})
    }
  }

  const approachingCount = alerts.filter((a) => a.status === 'APPROACHING_BREACH').length
  const overdueCount = alerts.filter((a) => a.status === 'OVERDUE').length

  return {
    checkedCount: totalChecked,
    approachingCount,
    overdueCount,
    alerts,
    emailsSent,
  }
}
