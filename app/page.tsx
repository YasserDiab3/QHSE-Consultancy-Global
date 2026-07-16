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
  ClipboardCheck,
  ShieldCheck,
  FileText,
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

      <section className="relative overflow-hidden bg-primary-800">
        <div className="absolute inset-0 opacity-[0.07]">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
        </div>
        <div className="absolute -right-24 top-24 h-96 w-96 rounded-full bg-accent-400/15 blur-3xl" />
        <div className="absolute -bottom-28 left-0 h-96 w-96 rounded-full bg-primary-400/20 blur-3xl" />

        <div className="container-custom relative z-10 py-28 pt-32 lg:py-32 lg:pt-36">
          <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
            <div className={dir === 'rtl' ? 'text-right' : 'text-left'}>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">
              <Shield className="h-4 w-4" />
              <span>{t('common.tagline')}</span>
            </div>
              <h1 className="mb-6 max-w-2xl text-4xl font-bold leading-[1.15] text-white md:text-5xl lg:text-6xl">
              {t('home.heroTitle')}
            </h1>
              <p className="mb-9 max-w-xl text-lg leading-relaxed text-white/80 md:text-xl">{t('home.heroSubtitle')}</p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-start">
              <Link href="/contact" className="btn-primary bg-white px-8 py-4 text-lg text-primary-600 hover:bg-gray-100">
                {t('home.heroCTA')}
                <ArrowRight className={`h-5 w-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
              </Link>
              <Link href="/services" className="inline-flex items-center justify-center rounded-lg border border-white/70 px-8 py-4 text-lg font-semibold text-white transition-colors hover:bg-white/10">
                {t('home.heroCTA2') || (language === 'ar' ? 'استكشف خدماتنا' : 'Explore services')}
              </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/75">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent-300" />{language === 'ar' ? 'حلول قابلة للتطبيق' : 'Practical solutions'}</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent-300" />{language === 'ar' ? 'خبرة ميدانية موثوقة' : 'Trusted field expertise'}</span>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-[580px] lg:mx-0">
              <div className="absolute -inset-3 rounded-[2rem] border border-white/10 bg-white/[0.04]" />
              <div className="relative overflow-hidden rounded-[1.55rem] border border-white/15 bg-primary-950 shadow-2xl shadow-primary-950/30">
                <div className="relative aspect-[4/3]">
                  <Image
                    src="/images/qhsse-hero-inspection.png"
                    alt={language === 'ar' ? 'فريق استشاري خلال مراجعة ميدانية لسلامة الغذاء والجودة' : 'Consulting team conducting a food safety and quality review'}
                    fill
                    priority
                    sizes="(min-width: 1024px) 48vw, 100vw"
                    className="hero-inspection-motion object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary-950/70 via-transparent to-primary-950/10" />
                  <div className="hero-scan-line absolute inset-x-[8%] top-[24%] h-px bg-accent-200/70" />
                  <span className="hero-status-ping absolute left-[13%] top-[19%] h-3 w-3 rounded-full bg-accent-300" />
                  <span className="hero-status-ping hero-status-ping-delayed absolute right-[16%] top-[35%] h-2.5 w-2.5 rounded-full bg-white/90" />
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/65">QHSSE CONSULTANT</p>
                    <p className="mt-1 text-sm font-semibold">{language === 'ar' ? 'زيارة ميدانية • تحسين مستمر' : 'On-site review • continuous improvement'}</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"><ShieldCheck className="h-5 w-5 text-accent-200" /></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 -mt-8 pb-8">
        <div className="container-custom">
          <div className="grid overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl shadow-primary-950/10 md:grid-cols-3">
            {[
              { icon: ClipboardCheck, title: language === 'ar' ? 'تقييم واضح' : 'Clear assessment', desc: language === 'ar' ? 'نراجع الواقع الميداني ونرتب الأولويات.' : 'We review your site and prioritise what matters.' },
              { icon: FileText, title: language === 'ar' ? 'خطة قابلة للتنفيذ' : 'Actionable plan', desc: language === 'ar' ? 'توصيات عملية تناسب منشأتك وفريقك.' : 'Practical recommendations for your facility and team.' },
              { icon: TrendingUp, title: language === 'ar' ? 'تحسن يمكن قياسه' : 'Measurable improvement', desc: language === 'ar' ? 'نتابع الأداء حتى تتحول التوصية إلى نتيجة.' : 'We follow performance through to results.' },
            ].map((item, index) => (
              <div key={item.title} className={`flex gap-4 p-6 md:p-7 ${index < 2 ? 'border-b border-gray-100 md:border-b-0 md:border-e' : ''}`}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600"><item.icon className="h-5 w-5" /></div>
                <div>
                  <h2 className="font-bold text-gray-900">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{item.desc}</p>
                </div>
              </div>
            ))}
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
                className="card group relative block cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl"
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

      <section className="relative overflow-hidden bg-primary-700 py-16 md:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,.16),transparent_55%)]" />
        <div className="container-custom relative">
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
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700">
              <Building2 className="h-4 w-4" />
              <span>{language === 'ar' ? 'شركاء النجاح' : 'Trusted Partnerships'}</span>
            </div>
            <h2 className="section-title">
              {language === 'ar' ? 'شركاء يدعمون رسالتنا' : 'Partners Who Power Our Mission'}
            </h2>
            <p className="section-subtitle">
              {language === 'ar'
                ? 'تصفح شعارات شركائنا بسهولة مع حركة تلقائية وإمكانية التنقل يمينًا ويسارًا باستخدام الأسهم.'
                : 'Browse our partners smoothly with automatic motion and simple previous/next controls.'}
            </p>

            <div className="mt-8 flex items-center justify-center gap-3">
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
