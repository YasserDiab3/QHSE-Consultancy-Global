'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Send,
  RefreshCw,
  Info,
  QrCode,
  Smartphone,
  Copy,
  Check,
  X,
  KeyRound,
} from 'lucide-react'
import Image from 'next/image'
import { useLanguage } from '@/context'
import toast from 'react-hot-toast'

type SmtpStatusState = {
  configured: boolean
  status: 'idle' | 'checking' | 'connected' | 'error' | 'unconfigured'
  message?: string
  guidance?: {
    isM365AuthIssue: boolean
    reason: string
    solutions: string[]
  } | null
  details?: {
    host?: string
    port?: string
    user?: string
    from?: string
  }
}

type SetupData = {
  secret: string
  formattedSecret: string
  qrCode: string
  uri: string
  email: string
}

export default function AdminTwoFactorSettings() {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [hasAuthenticator, setHasAuthenticator] = useState(false)
  const [smtpConfigured, setSmtpConfigured] = useState(false)

  // Setup Modal State
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  // SMTP Test State
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatusState>({
    configured: false,
    status: 'idle',
  })
  const [testingEmail, setTestingEmail] = useState(false)
  const [sendingTestMail, setSendingTestMail] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/2fa')
      if (res.ok) {
        const data = await res.json()
        setEnabled(Boolean(data.enabled))
        setHasAuthenticator(Boolean(data.hasAuthenticator))
        setSmtpConfigured(Boolean(data.smtpConfigured))
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleToggle = async () => {
    const nextState = !enabled
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setEnabled(nextState)
        if (!nextState) {
          setHasAuthenticator(false)
        }
        toast.success(
          nextState
            ? isAr
              ? 'تم تفعيل التحقق الثنائي (2FA) بنجاح'
              : 'Two-Factor Authentication enabled'
            : isAr
            ? 'تم تعطيل التحقق الثنائي بنجاح'
            : 'Two-Factor Authentication disabled'
        )
      } else {
        toast.error(isAr ? 'تعذر تعديل إعدادات التحقق الثنائي' : 'Failed to update 2FA settings')
      }
    } catch {
      toast.error(isAr ? 'حدث خطأ في الاتصال' : 'Connection error')
    } finally {
      setUpdating(false)
    }
  }

  const handleOpenSetup = async () => {
    setShowSetupModal(true)
    setSetupLoading(true)
    setSetupError(null)
    setVerifyCode('')
    setCopiedSecret(false)

    try {
      const res = await fetch('/api/admin/2fa/setup')
      if (res.ok) {
        const data = await res.json()
        setSetupData(data)
      } else {
        const err = await res.json().catch(() => ({}))
        setSetupError(err.error || (isAr ? 'فشل تحميل بيانات التهيئة' : 'Failed to load setup'))
      }
    } catch {
      setSetupError(isAr ? 'خطأ في الاتصال بالخادم' : 'Server connection error')
    } finally {
      setSetupLoading(false)
    }
  }

  const handleCopySecret = async () => {
    if (!setupData?.secret) return
    try {
      await navigator.clipboard.writeText(setupData.secret)
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2500)
      toast.success(isAr ? 'تم نسخ المفتاح السري' : 'Secret key copied')
    } catch {
      toast.error(isAr ? 'تعذر النسخ' : 'Failed to copy')
    }
  }

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!setupData?.secret || verifyCode.trim().length < 6) return

    setVerifying(true)
    setSetupError(null)

    try {
      const res = await fetch('/api/admin/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: setupData.secret,
          code: verifyCode.trim(),
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setHasAuthenticator(true)
        setEnabled(true)
        setShowSetupModal(false)
        toast.success(
          isAr
            ? 'تم ربط وتفعيل تطبيق المصادقة (Authenticator) بنجاح!'
            : 'Authenticator app linked and 2FA activated successfully!'
        )
      } else {
        setSetupError(
          data.message || (isAr ? 'رمز التحقق غير صحيح، تأكد من الرمز الظاهر في التطبيق' : 'Invalid verification code')
        )
      }
    } catch {
      setSetupError(isAr ? 'حدث خطأ في الاتصال' : 'Connection error')
    } finally {
      setVerifying(false)
    }
  }

  const handleUnlinkAuthenticator = async () => {
    const confirmed = window.confirm(
      isAr
        ? 'هل أنت متأكد من رغبتك في فصل تطبيق المصادقة؟'
        : 'Are you sure you want to unlink the Authenticator app?'
    )
    if (!confirmed) return

    setUnlinking(true)
    try {
      const res = await fetch('/api/admin/2fa/setup', {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setHasAuthenticator(false)
        toast.success(isAr ? 'تم فصل تطبيق المصادقة بنجاح' : 'Authenticator unlinked')
      } else {
        toast.error(isAr ? 'فشل فصل التطبيق' : 'Failed to unlink')
      }
    } catch {
      toast.error(isAr ? 'حدث خطأ في الاتصال' : 'Connection error')
    } finally {
      setUnlinking(false)
    }
  }

  const handleTestSmtpConnection = async () => {
    setTestingEmail(true)
    setSmtpStatus((prev) => ({ ...prev, status: 'checking' }))
    try {
      const res = await fetch('/api/admin/email/test')
      const data = await res.json()
      if (res.ok && data.status === 'connected') {
        setSmtpStatus({
          configured: true,
          status: 'connected',
          message: data.message,
          details: data.details,
        })
        toast.success(data.message || (isAr ? 'تم الاتصال بخادم البريد بنجاح!' : 'Connected successfully!'))
      } else {
        setSmtpStatus({
          configured: data.configured ?? false,
          status: 'error',
          message: data.message || data.error || (isAr ? 'فشل التحقق من خادم البريد' : 'Verification failed'),
          guidance: data.guidance,
          details: data.details,
        })
        toast.error(data.message || data.error || (isAr ? 'فشل التحقق من خادم البريد' : 'Verification failed'))
      }
    } catch {
      setSmtpStatus({
        configured: false,
        status: 'error',
        message: isAr ? 'تعذر الاتصال بالخادم الداخلي' : 'Failed to connect to internal API',
      })
      toast.error(isAr ? 'خطأ في الاتصال' : 'Connection error')
    } finally {
      setTestingEmail(false)
    }
  }

  const handleSendTestEmail = async () => {
    setSendingTestMail(true)
    try {
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message || (isAr ? 'تم إرسال البريد الاختباري بنجاح' : 'Test email sent successfully'))
      } else {
        toast.error(data.error || (isAr ? 'فشل إرسال البريد الاختباري' : 'Failed to send test email'))
      }
    } catch {
      toast.error(isAr ? 'حدث خطأ أثناء الإرسال' : 'Error sending email')
    } finally {
      setSendingTestMail(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
        <span>{isAr ? 'جاري فحص حالة الأمان...' : 'Checking security settings...'}</span>
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* Security Hub Control Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition ${
                enabled && hasAuthenticator
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20'
                  : enabled
                  ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-primary-500/20'
                  : 'bg-slate-100 text-slate-500 border border-slate-200'
              }`}
            >
              {enabled ? <ShieldCheck className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {isAr ? 'مركز أمان الدخول والمصادقة (2FA Hub)' : 'Security & Authentication Hub (2FA)'}
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    enabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  {enabled
                    ? isAr
                      ? 'التحقق الثنائي نشط'
                      : '2FA Active'
                    : isAr
                    ? 'التحقق الثنائي معطل'
                    : '2FA Disabled'}
                </span>
                {hasAuthenticator && enabled ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700 border border-primary-200">
                    <CheckCircle2 className="h-3 w-3 text-primary-600" />
                    {isAr ? 'تطبيق Authenticator محمي' : 'TOTP Protected'}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-2xl">
                {isAr
                  ? 'إدارة طبقات الحماية المتعددة لحسابات الإدارة وقنوات تسليم أكواد التحقق والتنبيهات الأمنية.'
                  : 'Manage multi-factor security layers for administrator accounts and notification channels.'}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3 self-end sm:self-center">
            <button
              type="button"
              onClick={handleToggle}
              disabled={updating}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                enabled
                  ? 'border border-danger-200 bg-white text-danger-700 hover:bg-danger-50 focus-visible:ring-danger-500'
                  : 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500 shadow-primary-600/20 shadow-md'
              }`}
            >
              {updating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : enabled ? (
                <>
                  <ShieldAlert className="h-3.5 w-3.5 text-danger-600" />
                  <span>{isAr ? 'تعطيل التحقق الثنائي' : 'Disable 2FA'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{isAr ? 'تفعيل التحقق الثنائي' : 'Enable 2FA'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2-Column Responsive Grid Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full max-w-full overflow-hidden">
        {/* Card 1: Authenticator App (Google / Microsoft Authenticator) */}
        <div
          className={`relative flex flex-col justify-between rounded-2xl border p-5 sm:p-6 transition shadow-sm hover:shadow-md ${
            hasAuthenticator
              ? 'border-emerald-200 bg-gradient-to-b from-emerald-50/20 via-white to-white'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
                    hasAuthenticator
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/20'
                      : 'bg-primary-50 text-primary-600 border-primary-200'
                  }`}
                >
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2 py-0.5 rounded-md border border-primary-200/50">
                      {isAr ? 'المسار الأساسي (موصى به)' : 'PRIMARY METHOD'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">
                    {isAr
                      ? 'تطبيق المصادقة (Authenticator TOTP)'
                      : 'Authenticator App (TOTP)'}
                  </h4>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${
                  hasAuthenticator
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {hasAuthenticator ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{isAr ? 'مربوط وجاهز' : 'Linked & Ready'}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span>{isAr ? 'غير مربوط' : 'Not Linked'}</span>
                  </>
                )}
              </span>
            </div>

            {/* Description */}
            <p className="mt-3.5 text-xs leading-relaxed text-slate-600">
              {hasAuthenticator
                ? isAr
                  ? 'تطبيقك مهيأ ومؤمّن بالكامل. يتم توليد رمز الأمان محلياً على هاتفك كل 30 ثانية بدون الحاجة إلى خادم بريد أو اتصال بالإنترنت.'
                  : 'Your authenticator is fully linked. 6-digit codes generate locally every 30 seconds with zero dependency on email or internet connectivity.'
                : isAr
                ? 'اربط تطبيق Google Authenticator أو Microsoft Authenticator للحصول على أعلى درجات الأمان وتسجيل الدخول الفوري عبر مسح رمز QR.'
                : 'Link Google or Microsoft Authenticator for top security and instant offline code generation via QR code.'}
            </p>

            {/* Feature Badges */}
            <div className="mt-4 flex flex-wrap gap-1.5 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200 px-2 py-1 font-medium">
                <Check className="h-3 w-3 text-emerald-600" />
                <span>Google Authenticator</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200 px-2 py-1 font-medium">
                <Check className="h-3 w-3 text-emerald-600" />
                <span>Microsoft Authenticator</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200 px-2 py-1 font-medium">
                <Check className="h-3 w-3 text-emerald-600" />
                <span>{isAr ? 'توليد أوفلاين (RFC 6238)' : 'Offline RFC 6238'}</span>
              </span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 w-full">
            {hasAuthenticator ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenSetup}
                  className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none"
                >
                  <QrCode className="h-3.5 w-3.5 text-primary-600" />
                  <span>{isAr ? 'إعادة مسح QR جديد' : 'Re-configure QR'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleUnlinkAuthenticator}
                  disabled={unlinking}
                  className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-danger-200 bg-white px-3 py-2 text-xs font-bold text-danger-700 shadow-sm transition hover:bg-danger-50 focus:outline-none disabled:opacity-60"
                >
                  {unlinking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  <span>{isAr ? 'فصل التطبيق' : 'Unlink'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleOpenSetup}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none shadow-primary-600/20 shadow-md"
              >
                <QrCode className="h-4 w-4" />
                <span>{isAr ? 'ربط تطبيق المصادقة الآن (QR Code)' : 'Link Authenticator App Now'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Card 2: Live Mail Server (Microsoft 365 SMTP) */}
        <div
          className={`relative flex flex-col justify-between rounded-2xl border p-5 sm:p-6 transition shadow-sm hover:shadow-md ${
            smtpStatus.status === 'connected'
              ? 'border-sky-200 bg-gradient-to-b from-sky-50/20 via-white to-white'
              : 'border-slate-200 bg-white'
          }`}
        >
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
                    smtpStatus.status === 'connected'
                      ? 'bg-sky-500 text-white border-sky-600 shadow-sm shadow-sky-500/20'
                      : 'bg-sky-50 text-sky-600 border-sky-200'
                  }`}
                >
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">
                      {isAr ? 'قناة الإشعارات والبريد' : 'RELAY NOTIFICATIONS'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">
                    {isAr ? 'خادم البريد (Microsoft 365)' : 'Mail Server (Microsoft 365)'}
                  </h4>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${
                  smtpStatus.status === 'connected'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : smtpStatus.status === 'error'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {smtpStatus.status === 'connected' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{isAr ? 'متصل وجاهز' : 'Connected'}</span>
                  </>
                ) : smtpStatus.status === 'error' ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                    <span>{isAr ? 'بحاجة لضبط المتغيرات' : 'Needs Config'}</span>
                  </>
                ) : (
                  <>
                    <Info className="h-3.5 w-3.5 text-slate-500" />
                    <span>{isAr ? 'غير مفحوص' : 'Untested'}</span>
                  </>
                )}
              </span>
            </div>

            {/* Description */}
            <p className="mt-3.5 text-xs leading-relaxed text-slate-600">
              {isAr
                ? 'يستخدم لإرسال تنبيهات المخاطر الحرجة الفورية لفريق السلامة، إشعارات الـ SLA، تحديثات خطط الإجراءات، ورموز الأمان الاحتياطية.'
                : 'Dispatches instant critical risk alerts, SLA escalation notifications, CAPA updates, and fallback security tokens.'}
            </p>

            {/* Status / Alert Message */}
            {!smtpConfigured && smtpStatus.status === 'idle' ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span className="leading-snug">
                  {isAr
                    ? 'خادم البريد (SMTP) غير مفعل في متغيرات البيئة. لا يؤثر ذلك على تسجيل الدخول طالما أن تطبيق Authenticator مربوط.'
                    : 'SMTP is unconfigured in .env. Login remains secure and uninterrupted via Authenticator app.'}
                </span>
              </div>
            ) : null}
            {smtpStatus.status === 'error' && smtpStatus.message ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/80 p-2.5 text-[11px] text-rose-800 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="leading-snug">{smtpStatus.message}</span>
              </div>
            ) : smtpStatus.status === 'connected' && smtpStatus.message ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 text-[11px] text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{smtpStatus.message}</span>
              </div>
            ) : null}

            {/* M365 Guidance */}
            {smtpStatus.guidance?.isM365AuthIssue ? (
              <div className="mt-2.5 rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 text-[11px] text-amber-900">
                <p className="font-bold mb-1">{smtpStatus.guidance.reason}</p>
                <ul className="list-disc list-inside space-y-1">
                  {smtpStatus.guidance.solutions.slice(0, 2).map((sol, idx) => (
                    <li key={idx}>{sol}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {/* Action Footer */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 w-full">
            <button
              type="button"
              onClick={handleTestSmtpConnection}
              disabled={testingEmail}
              className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none disabled:opacity-60"
            >
              {testingEmail ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span>{isAr ? 'فحص الاتصال' : 'Test Connection'}</span>
            </button>

            {smtpStatus.status === 'connected' ? (
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTestMail}
                className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none disabled:opacity-60"
              >
                {sendingTestMail ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                <span>{isAr ? 'إرسال بريد تجريبي' : 'Send Test Mail'}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isAr
                      ? 'ربط تطبيق المصادقة (Authenticator)'
                      : 'Link Authenticator App'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr
                      ? 'Google Authenticator / Microsoft Authenticator'
                      : 'Google Authenticator / Microsoft Authenticator'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            {setupLoading ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                <p className="text-sm font-medium">
                  {isAr ? 'جاري توليد مفتاح الأمان ورمز QR...' : 'Generating security key & QR code...'}
                </p>
              </div>
            ) : setupData ? (
              <form onSubmit={handleVerifySetup} className="mt-5 space-y-5">
                {/* Step 1: Scan QR */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[11px] font-bold text-white">
                      1
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">
                      {isAr
                        ? 'امسح رمز الـ QR التالي بواسطة التطبيق'
                        : 'Scan this QR code with your app'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    {isAr
                      ? 'افتح تطبيق Google Authenticator أو Microsoft Authenticator على هاتفك، اضغط على زر (+) واختر "مسح رمز الاستجابة السريعة (Scan QR code)".'
                      : 'Open Google Authenticator or Microsoft Authenticator on your mobile device, tap (+) and select "Scan a QR code".'}
                  </p>

                  <div className="flex justify-center p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 inline-block">
                      <Image
                        src={setupData.qrCode}
                        alt="2FA QR Code"
                        width={180}
                        height={180}
                        className="rounded-lg"
                        unoptimized
                      />
                    </div>
                  </div>
                </div>

                {/* Manual Secret Key */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <KeyRound className="h-3 w-3 text-slate-400" />
                      {isAr ? 'أو أدخل المفتاح السري يدوياً في التطبيق:' : 'Or enter secret key manually:'}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-600 hover:text-primary-700"
                    >
                      {copiedSecret ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-600">{isAr ? 'تم النسخ!' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>{isAr ? 'نسخ المفتاح' : 'Copy Key'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-center text-xs font-bold tracking-widest text-slate-800 bg-white p-2 rounded-lg border border-slate-200 select-all">
                    {setupData.formattedSecret}
                  </div>
                </div>

                {/* Step 2: Verification Input */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[11px] font-bold text-white">
                      2
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">
                      {isAr
                        ? 'أدخل الرمز المكون من 6 أرقام لتأكيد الربط'
                        : 'Enter the 6-digit code to confirm'}
                    </h4>
                  </div>

                  {setupError && (
                    <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{setupError}</span>
                    </div>
                  )}

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full rounded-xl border border-slate-300 p-3 text-center text-2xl font-bold tracking-[0.4em] text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    autoFocus
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowSetupModal(false)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={verifying || verifyCode.trim().length < 6}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{isAr ? 'جاري التأكيد...' : 'Verifying...'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{isAr ? 'تأكيد وتفعيل التطبيق' : 'Verify & Activate'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-8 text-center text-xs text-rose-600">
                {setupError || (isAr ? 'تعذر تحميل بيانات التهيئة' : 'Failed to initialize setup')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
