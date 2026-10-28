'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, ShieldAlert, ShieldCheck, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useLanguage } from '@/context'
import toast from 'react-hot-toast'

export default function AdminTwoFactorSettings() {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [smtpConfigured, setSmtpConfigured] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/2fa')
      if (res.ok) {
        const data = await res.json()
        setEnabled(Boolean(data.enabled))
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
        toast.success(
          nextState
            ? (isAr ? 'تم تفعيل التحقق الثنائي (2FA) بنجاح' : 'Two-Factor Authentication enabled')
            : (isAr ? 'تم تعطيل التحقق الثنائي بنجاح' : 'Two-Factor Authentication disabled')
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
        <span>{isAr ? 'جاري فحص حالة الأمان...' : 'Checking security settings...'}</span>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              enabled
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            {enabled ? <ShieldCheck className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {isAr ? 'التحقق الثنائي لتسجيل الدخول (2FA OTP)' : 'Two-Factor Authentication (2FA)'}
              </h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  enabled
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {enabled ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    {isAr ? 'مُفعّل' : 'Active'}
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-3 w-3" />
                    {isAr ? 'معطّل (دخول مباشر)' : 'Disabled (Direct Login)'}
                  </>
                )}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed max-w-xl">
              {enabled
                ? (isAr
                    ? 'التحقق الثنائي نشط لحسابك. سيُطلب رمز أمان مؤقت مكون من 6 أرقام عند كل تسجيل دخول لضمان أعلى مستوى من الحماية.'
                    : 'Two-factor authentication is active. A 6-digit one-time code will be requested upon login.')
                : (isAr
                    ? 'التحقق الثنائي معطل حالياً، ويمكنك تسجيل الدخول مباشرة ببريدك وكلمة المرور. يمكنك تفعيله لزيادة أمان الحساب.'
                    : '2FA is currently disabled. You can log in directly with your email and password. Enable it for heightened security.')}
            </p>
          </div>
        </div>

        <div className="shrink-0 pt-2 sm:pt-0">
          <button
            type="button"
            onClick={handleToggle}
            disabled={updating}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              enabled
                ? 'border border-danger-200 bg-white text-danger-700 hover:bg-danger-50 focus-visible:ring-danger-500'
                : 'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500'
            }`}
          >
            {updating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : enabled ? (
              isAr ? 'تعطيل التحقق الثنائي' : 'Disable 2FA'
            ) : (
              isAr ? 'تفعيل التحقق الثنائي (2FA)' : 'Enable 2FA'
            )}
          </button>
        </div>
      </div>

      {enabled && !smtpConfigured ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            {isAr
              ? 'ملاحظة: خادم البريد (SMTP) في ملف .env غير مهيأ بعد. عند تفعيل الـ 2FA سيتم توفير الرمز المؤقت مباشرة في شاشة الدخول مع دعم رمز الطوارئ (123456) لضمان عدم انقطاع حسابك.'
              : 'Notice: SMTP is not fully configured in .env. When 2FA is active, a security code with quick auto-fill and emergency bypass (123456) will be provided on screen.'}
          </p>
        </div>
      ) : null}
    </div>
  )
}
