'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Cookie, X } from 'lucide-react'
import { useLanguage } from '@/context'

const CONSENT_KEY = 'qhsse-analytics-consent'
export const CONSENT_EVENT = 'qhsse-consent-changed'

export default function ConsentBanner() {
  const { language } = useLanguage()
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
      setVisible(false)
      return
    }

    try {
      setVisible(!window.localStorage.getItem(CONSENT_KEY))
    } catch {
      setVisible(false)
    }
  }, [pathname])

  useEffect(() => {
    const openBanner = () => setVisible(true)
    window.addEventListener('qhsse-open-consent', openBanner)
    return () => window.removeEventListener('qhsse-open-consent', openBanner)
  }, [])

  const choose = (value: 'accepted' | 'declined') => {
    try {
      window.localStorage.setItem(CONSENT_KEY, value)
      window.localStorage.setItem(`${CONSENT_KEY}-at`, new Date().toISOString())
    } catch {
      // Consent still applies for this page view even if storage is blocked.
    }
    setVisible(false)
    window.dispatchEvent(new Event(CONSENT_EVENT))
  }

  if (!visible) return null

  const isArabic = language === 'ar'

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-lifted sm:inset-x-4 sm:bottom-4 sm:p-5"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gold-100 text-brand-gold">
          <Cookie className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="consent-title" className="text-sm font-semibold text-slate-900">
            {isArabic ? 'خصوصيتك أولًا' : 'Your privacy matters'}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {isArabic
              ? 'نستخدم قياسات زيارات مجهولة الهوية لفهم استخدام الموقع وتحسينه. لا نفعّلها قبل موافقتك، ويمكنك رفضها دون التأثير على تجربتك.'
              : 'We use privacy-friendly visitor analytics to understand and improve the site. Nothing is measured until you agree, and declining will not affect your experience.'}{' '}
            <Link href="/privacy" className="font-medium text-brand-gold underline underline-offset-2 hover:text-brand-gold-600">
              {isArabic ? 'سياسة الخصوصية' : 'Privacy policy'}
            </Link>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => choose('accepted')}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              {isArabic ? 'أوافق' : 'Accept'}
            </button>
            <button
              type="button"
              onClick={() => choose('declined')}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              {isArabic ? 'رفض' : 'Decline'}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => choose('declined')}
          aria-label={isArabic ? 'إغلاق والرفض' : 'Close and decline'}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
