import { randomInt } from 'crypto'
import { prisma } from '@/lib/prisma'
import { isEmailConfigured, sendNotificationEmail } from '@/lib/email'

export const OTP_VALIDITY_MS = 5 * 60 * 1000 // 5 minutes
export const OTP_COOLDOWN_MS = 30 * 1000 // 30 seconds between resends

type MemoryOtpState = {
  code: string
  expiresAt: Date
  attempts: number
}

const memoryOtpStore = new Map<string, MemoryOtpState>()

export function clear2FaStore(): void {
  memoryOtpStore.clear()
}

export function generateOtpCode(): string {
  return randomInt(100000, 999999).toString()
}

/**
 * Normalizes Eastern Arabic / Persian digits to standard Western ASCII digits
 * and strips non-numeric characters.
 */
export function normalizeOtpDigits(str: string): string {
  if (!str) return ''
  const easternArabic = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  const farsi = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  let res = ''
  for (const char of str.trim()) {
    const idx1 = easternArabic.indexOf(char)
    if (idx1 !== -1) {
      res += String(idx1)
      continue
    }
    const idx2 = farsi.indexOf(char)
    if (idx2 !== -1) {
      res += String(idx2)
      continue
    }
    res += char
  }
  return res.replace(/\D/g, '')
}

/**
 * Issues a 6-digit 2FA OTP code to the given admin email and dispatches an email notification.
 * If email is not configured, logs code prominently in console and returns it for development/fallback.
 */
export async function issueAdmin2FaOtp(
  email: string,
  language: string = 'ar'
): Promise<{ success: boolean; cooldown?: boolean; code?: string; smtpConfigured: boolean }> {
  const normalized = email.toLowerCase().trim()
  const smtpConfigured = isEmailConfigured()
  if (!normalized) return { success: false, smtpConfigured }

  const now = new Date()
  const key = `2fa:${normalized}`
  const expiresAt = new Date(now.getTime() + OTP_VALIDITY_MS)

  // Check cooldown in memory
  const existing = memoryOtpStore.get(normalized)
  if (existing && existing.expiresAt > now && now.getTime() < existing.expiresAt.getTime() - OTP_VALIDITY_MS + OTP_COOLDOWN_MS) {
    // Already issued recently (within 30s)
    return {
      success: true,
      cooldown: true,
      code: !smtpConfigured ? existing.code : undefined,
      smtpConfigured,
    }
  }

  const code = generateOtpCode()

  // Save to in-memory store
  memoryOtpStore.set(normalized, {
    code,
    expiresAt,
    attempts: 0,
  })

  // Save to RateLimitEntry for multi-instance persistence
  try {
    await prisma.rateLimitEntry.upsert({
      where: { key },
      create: {
        key,
        count: Number(code),
        resetAt: expiresAt,
      },
      update: {
        count: Number(code),
        resetAt: expiresAt,
      },
    })
  } catch (error) {
    console.warn('[2FA] Database OTP persistence fallback to memory:', error)
  }

  if (smtpConfigured) {
    // Send Email Notification
    const isAr = language === 'ar'
    const subject = isAr
      ? `رمز التحقق الثنائي (2FA) لتسجيل الدخول: ${code}`
      : `Your 2FA Login Security Code: ${code}`

    const textBody = isAr
      ? `رمز التحقق الخاص بك لتسجيل الدخول إلى لوحة الإدارة هو: ${code}\nينتهي هذا الرمز خلال 5 دقائق.\nإذا لم تقم بطلب هذا الرمز، يرجى تغيير كلمة المرور فوراً.`
      : `Your two-factor authentication security code for admin login is: ${code}\nThis code will expire in 5 minutes.\nIf you did not request this code, please change your password immediately.`

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #0f172a; margin-bottom: 8px;">${isAr ? 'التحقق الثنائي لتسجيل الدخول' : 'Two-Factor Authentication'}</h2>
          <p style="color: #64748b; font-size: 14px; margin: 0;">${isAr ? 'استخدم الرمز التالي لتأكيد الدخول إلى لوحة الإدارة' : 'Use the following code to complete your admin login'}</p>
        </div>
        <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0284c7; font-family: monospace;">${code}</span>
        </div>
        <p style="color: #64748b; font-size: 13px; text-align: center; margin-bottom: 24px;">
          ${isAr ? 'ينتهي هذا الرمز خلال 5 دقائق.' : 'This code expires in 5 minutes.'}
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin-bottom: 16px;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          ${isAr ? 'إذا لم تقم بمحاولة تسجيل الدخول، يرجى تجاهل هذه الرسالة وتأمين حسابك فوراً.' : 'If you did not attempt to sign in, please ignore this email and secure your account.'}
        </p>
      </div>
    `

    sendNotificationEmail({
      to: normalized,
      subject,
      text: textBody,
      html: htmlBody,
    }).catch((err) => {
      console.error('[2FA] Failed to send OTP email:', err)
    })
  } else {
    console.log(`\n======================================================`)
    console.log(`🔑 [2FA SECURITY CODE] ADMIN LOGIN OTP`)
    console.log(`📧 Target Account: ${normalized}`)
    console.log(`🔢 ONE-TIME CODE: ${code}`)
    console.log(`⚠️ NOTE: SMTP is not configured in .env.`)
    console.log(`======================================================\n`)
  }

  return { success: true, smtpConfigured, code }
}

/**
 * Verifies a submitted 2FA OTP code for the given email.
 */
export async function verify2FaOtp(email: string, submittedCode: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim()
  const cleanCode = normalizeOtpDigits(submittedCode)
  if (!normalized || !cleanCode) return false

  // Emergency / Configured Backup master code
  const configuredBackup = process.env.ADMIN_2FA_BACKUP_CODE?.trim()
  if (configuredBackup && cleanCode === configuredBackup) {
    return true
  }

  // If email service is NOT configured, allow fallback testing code '123456'
  const smtpConfigured = isEmailConfigured()
  if (!smtpConfigured && cleanCode === '123456') {
    return true
  }

  const now = new Date()
  const key = `2fa:${normalized}`

  // 1. Check in-memory store first
  const memory = memoryOtpStore.get(normalized)
  if (memory) {
    if (memory.expiresAt <= now) {
      memoryOtpStore.delete(normalized)
      return false
    }

    if (memory.code === cleanCode) {
      memoryOtpStore.delete(normalized)
      prisma.rateLimitEntry.delete({ where: { key } }).catch(() => {})
      return true
    }

    memory.attempts += 1
    if (memory.attempts >= 5) {
      memoryOtpStore.delete(normalized)
    }
  }

  // 2. Check Database RateLimitEntry
  try {
    const entry = await prisma.rateLimitEntry.findUnique({
      where: { key },
    })

    if (entry && entry.resetAt > now) {
      const storedCode = String(entry.count).padStart(6, '0')
      if (storedCode === cleanCode) {
        // Success: consume OTP immediately
        await prisma.rateLimitEntry.delete({ where: { key } }).catch(() => {})
        memoryOtpStore.delete(normalized)
        return true
      }
    }
  } catch (error) {
    console.warn('[2FA] Database OTP verification error:', error)
  }

  return false
}

const memory2FaStatusStore = new Map<string, boolean>()

/**
 * Checks if 2FA is active for the given user email.
 * Defaults to false (allowing immediate direct login) unless explicitly enabled
 * by the admin or forced via FORCE_ADMIN_2FA='true'.
 */
export async function is2FaEnabledForUser(email: string): Promise<boolean> {
  const normalized = email.toLowerCase().trim()
  if (!normalized) return false

  if (process.env.FORCE_ADMIN_2FA === 'true') {
    return true
  }

  try {
    const entry = await prisma.rateLimitEntry.findUnique({
      where: { key: `2fa_enabled:${normalized}` },
    })
    if (entry) {
      return entry.count === 1
    }
  } catch (error) {
    console.warn('[2FA] DB read error, using in-memory fallback:', error instanceof Error ? error.message : error)
  }

  return memory2FaStatusStore.get(normalized) ?? false
}

/**
 * Sets the 2FA active status for the given user email.
 */
export async function set2FaEnabledForUser(email: string, enabled: boolean): Promise<boolean> {
  const normalized = email.toLowerCase().trim()
  if (!normalized) return false

  const key = `2fa_enabled:${normalized}`
  const resetAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

  memory2FaStatusStore.set(normalized, enabled)

  try {
    if (enabled) {
      await prisma.rateLimitEntry.upsert({
        where: { key },
        create: {
          key,
          count: 1,
          resetAt,
        },
        update: {
          count: 1,
          resetAt,
        },
      })
    } else {
      await prisma.rateLimitEntry.deleteMany({
        where: { key },
      })
    }
    return true
  } catch (error) {
    console.warn('[2FA] DB write error, status preserved in-memory fallback:', error instanceof Error ? error.message : error)
    return true
  }
}
