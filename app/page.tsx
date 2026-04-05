'use client'

import { useEffect, useRef } from 'react'
import { useLanguage } from '@/context'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getAllServiceCards } from '@/lib/service-cards'
import Image from 'next/image'
import Link from 'next/link'
import {
  Shield,
  FileSearch,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Award,
  Users,
  Clock,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export default function HomePage() {
  const { t, dir, language } = useLanguage()
  const partnersRef = useRef<HTMLDivElement>(null)

  const allServiceCards = getAllServiceCards(t, language)

  const whyFeatures = [
    {
      icon: Award,
      title: t('home.whyFeature1Title'),
      desc: t('home.whyFeature1Desc'),
    },
    {
      icon: CheckCircle2,
      title: t('home.whyFeature2Title'),
      desc: t('home.whyFeature2Desc'),
    },
    {
      icon: TrendingUp,
      title: t('home.whyFeature3Title'),
      desc: t('home.whyFeature3Desc'),
    },
    {
      icon: Shield,
      title: t('home.whyFeature4Title'),
      desc: t('home.whyFeature4Desc'),
    },
  ]

  const stats = [
    { value: '50+', label: t('about.stat1Label'), icon: Users },
    { value: '200+', label: t('about.stat2Label'), icon: FileSearch },
    { value: '4+', label: t('about.stat3Label'), icon: Clock },
    { value: '99%', label: t('about.stat4Label'), icon: Shield },
  ]

  const clientLogos = [
    '/clients/1631322692916.jpeg',
    '/clients/633160a66af18.jpg',
    '/clients/B8RTGzcIGnBm3vnsFei2HaMjjqObSsDYFY1fNG0I.png',
    '/clients/caro3A.jpg',
    '/clients/CEGY.png',
    '/clients/d9HTnmZPXYxKrGzZX5b08nm0Xu2n5Y3hquYrdXYU.png',
    '/clients/El-Zomoroda-for-corn-products-1.webp',
    '/clients/FTt5ksm7hAvBUwWhcrmX4cHKaScfdFlP0pUobhwA.png',
    '/clients/images.png',
    '/clients/LdpueF42rsXw3I3NbwoPNW4vRrHGoQgYSgPAKFIt.webp',
    '/clients/Logo%20G%C3%B6rsel%202025-01-31%20saat%2016.26.51_966469d2%20(002).jpg',
    '/clients/Logo%20-grmany.png',
    '/clients/loqj5E1nT9fSe8PTuYCmoNxNKizEODNu70kEISNS.png',
    '/clients/n9Dmt6xuWnLZYpMBiJaYYesgcZXiJ9Bdad8kreUl.webp',
    '/clients/oBJ4VI0wAWuBf1QcYdMjk9Pk7hxX5EVSonI5uVSy.webp',
    '/clients/Picture1.png',
    '/clients/xTbWEjOGbPZomISDerNd9h4IZcosnpmBzTUgMOzG.webp',
    '/clients/ZOMARDA.png',
  ]

  useEffect(() => {
    const container = partnersRef.current
    if (!container) {
      return
    }

    const step = 320
    const timer = window.setInterval(() => {
      const maxScroll = container.scrollWidth - container.clientWidth
      if (maxScroll <= 0) {
        return
      }

      if (dir === 'rtl') {
        const next = container.scrollLeft <= 0 ? maxScroll : Math.max(container.scrollLeft - step, 0)
        container.scrollTo({ left: next, behavior: 'smooth' })
      } else {
        const next = container.scrollLeft >= maxScroll - 4 ? 0 : Math.min(container.scrollLeft + step, maxScroll)
        container.scrollTo({ left: next, behavior: 'smooth' })
      }
    }, 3200)

    return () => window.clearInterval(timer)
  }, [dir, language])

  const scrollPartners = (direction: 'next' | 'prev') => {
    const container = partnersRef.current
    if (!container) {
      return
    }

    const amount = 340
    const isNext = direction === 'next'
    const delta = dir === 'rtl' ? (isNext ? -amount : amount) : isNext ? amount : -amount
    container.scrollBy({ left: delta, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen">
      <Header />

      <section className="relative flex min-h-[90vh] items-center overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
        </div>
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-accent-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-primary-400/20 blur-3xl" />

        <div className="container-custom relative z-10 pt-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">
              <Shield className="h-4 w-4" />
              <span>{t('common.tagline')}</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              {t('home.heroTitle')}
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-xl text-white/80">{t('home.heroSubtitle')}</p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/contact" className="btn-primary bg-white px-8 py-4 text-lg text-primary-600 hover:bg-gray-100">
                {t('home.heroCTA')}
                <ArrowRight className={`h-5 w-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
              </Link>
              <Link href="/services" className="btn-secondary border-white px-8 py-4 text-lg text-white hover:bg-white/10">
                {t('home.heroCTA2')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-20 md:py-28">
        <div className="container-custom">
          <div className="mb-16 text-center">
            <h2 className="section-title">{t('home.servicesTitle')}</h2>
            <p className="section-subtitle">{t('home.servicesSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {allServiceCards.map((service, index) => (
              <Link
                key={index}
                href={`/contact?service=${encodeURIComponent(service.title)}`}
                className="card group block cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={`mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${service.color} shadow-lg transition-shadow group-hover:shadow-xl`}
                >
                  <service.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{service.title}</h3>
                <p className="leading-relaxed text-gray-600">{service.desc}</p>
                <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary-600">
                  <span>{language === 'ar' ? 'اطلب هذه الخدمة' : 'Request this service'}</span>
                  <ArrowRight className={`h-4 w-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary-600 py-16 md:py-20">
        <div className="container-custom">
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="mb-1 text-3xl font-bold text-white md:text-4xl">{stat.value}</div>
                <div className="text-sm text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-custom">
          <div className="mb-16 text-center">
            <h2 className="section-title">{t('home.whyTitle')}</h2>
            <p className="section-subtitle">{t('home.whySubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {whyFeatures.map((feature, index) => (
              <div key={index} className="group text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 transition-colors group-hover:bg-primary-100">
                  <feature.icon className="h-8 w-8 text-primary-500" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-900">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden bg-white py-20 md:py-24">
        <div className="container-custom">
          <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="text-center lg:text-start">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700">
                <Building2 className="h-4 w-4" />
                <span>{language === 'ar' ? 'شركاء النجاح' : 'Trusted Partnerships'}</span>
              </div>
              <h2 className="section-title">Partners Who Power Our Mission</h2>
              <p className="section-subtitle">
                {language === 'ar'
                  ? 'تصفح شركاءنا بسهولة مع حركة تلقائية وإمكانية العودة أو التقدم باستخدام الأسهم.'
                  : 'Browse our partners with automatic motion and quick previous/next controls.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 lg:justify-end">
              <button
                type="button"
                onClick={() => scrollPartners('prev')}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-primary-200 hover:text-primary-600 hover:shadow-md"
                aria-label={language === 'ar' ? 'عرض الشركاء السابقين' : 'Previous partners'}
              >
                {dir === 'rtl' ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => scrollPartners('next')}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-primary-200 hover:text-primary-600 hover:shadow-md"
                aria-label={language === 'ar' ? 'عرض الشركاء التاليين' : 'Next partners'}
              >
                {dir === 'rtl' ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-white to-transparent" />

            <div
              ref={partnersRef}
              className="flex snap-x snap-mandatory gap-6 overflow-x-auto py-4 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {clientLogos.map((clientSrc, index) => (
                <div key={`${clientSrc}-${index}`} className="snap-start">
                  <div
                    className="group flex h-32 w-[240px] shrink-0 items-center justify-center rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                      <Image
                        src={clientSrc}
                        alt={`Client logo ${index + 1}`}
                        fill
                        sizes="240px"
                        className="object-contain p-4"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-primary-900 py-20 md:py-28">
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>
        <div className="container-custom relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">{t('home.ctaTitle')}</h2>
            <p className="mb-8 text-lg text-gray-300">{t('home.ctaSubtitle')}</p>
            <Link href="/contact" className="btn-primary bg-accent-500 px-8 py-4 text-lg hover:bg-accent-600">
              {t('home.ctaButton')}
              <ArrowRight className={`h-5 w-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
