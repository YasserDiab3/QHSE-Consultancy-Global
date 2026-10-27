'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useLanguage } from '@/context'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { language } = useLanguage()
  const isArabic = language === 'ar'

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="flex min-h-[70vh] items-center justify-center px-4 pb-16 pt-32">
        <div className="mx-auto max-w-lg text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-50 text-danger-600">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">
            {isArabic ? 'حدث خطأ غير متوقع' : 'Something went wrong'}
          </h1>
          <p className="mt-3 text-slate-600">
            {isArabic
              ? 'تعذر تحميل هذه الصفحة. حاول مرة أخرى أو عد إلى الصفحة الرئيسية.'
              : 'This page could not be loaded. Please try again or return to the home page.'}
          </p>
          {error.digest ? (
            <p className="mt-2 text-xs text-slate-400">
              {isArabic ? 'رقم المرجع:' : 'Reference:'} {error.digest}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={reset} className="btn-primary">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {isArabic ? 'إعادة المحاولة' : 'Try again'}
            </button>
            <Link href="/" className="btn-secondary">
              {isArabic ? 'الرئيسية' : 'Home'}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
