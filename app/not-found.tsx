'use client'

import Link from 'next/link'
import { Compass, Home, Search } from 'lucide-react'
import { useLanguage } from '@/context'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function NotFound() {
  const { language } = useLanguage()
  const isArabic = language === 'ar'

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="flex min-h-[70vh] items-center justify-center px-4 pb-16 pt-32">
        <div className="mx-auto max-w-lg text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
            <Compass className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-brand-gold">404</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {isArabic ? 'الصفحة غير موجودة' : 'Page not found'}
          </h1>
          <p className="mt-3 text-slate-600">
            {isArabic
              ? 'الرابط الذي فتحته غير صحيح أو تم نقل الصفحة. جرّب البحث أو العودة إلى الرئيسية.'
              : 'The link you followed may be broken or the page may have moved. Try the services page or return home.'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/" className="btn-primary">
              <Home className="h-4 w-4" aria-hidden="true" />
              {isArabic ? 'الرئيسية' : 'Home'}
            </Link>
            <Link href="/services" className="btn-secondary">
              <Search className="h-4 w-4" aria-hidden="true" />
              {isArabic ? 'استكشف الخدمات' : 'Explore services'}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
