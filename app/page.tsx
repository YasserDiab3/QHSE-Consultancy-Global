'use client'

import { useLanguage } from '@/context'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import {
  Shield,
  Apple,
  Search,
  FileSearch,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Award,
  Users,
  Clock,
  BarChart3,
} from 'lucide-react'

export default function HomePage() {
  const { t, dir } = useLanguage()

  const services = [
    {
      icon: Shield,
      title: t('services.qhseTitle'),
      desc: t('services.qhseDesc'),
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Apple,
      title: t('services.foodTitle'),
      desc: t('services.foodDesc'),
      color: 'from-amber-500 to-amber-600',
    },
    {
      icon: BarChart3,
      title: t('services.riskTitle'),
      desc: t('services.riskDesc'),
      color: 'from-rose-500 to-rose-600',
    },
    {
      icon: FileSearch,
      title: t('services.auditTitle'),
      desc: t('services.auditDesc'),
      color: 'from-teal-500 to-teal-600',
    },
    {
      icon: GraduationCap,
      title: t('services.trainingTitle'),
      desc: t('services.trainingDesc'),
      color: 'from-violet-500 to-violet-600',
    },
  ]

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

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }} />
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl" />

        <div className="container-custom relative z-10 pt-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm mb-8">
              <Shield className="w-4 h-4" />
              <span>{t('common.tagline')}</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {t('home.heroTitle')}
            </h1>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              {t('home.heroSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contact" className="btn-primary bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 text-lg">
                {t('home.heroCTA')}
                <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
              </Link>
              <Link href="/services" className="btn-secondary border-white text-white hover:bg-white/10 px-8 py-4 text-lg">
                {t('home.heroCTA2')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 md:py-28 bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="section-title">{t('home.servicesTitle')}</h2>
            <p className="section-subtitle">{t('home.servicesSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {services.map((service, index) => (
              <div
                key={index}
                className="card group hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-5 shadow-lg group-hover:shadow-xl transition-shadow`}>
                  <service.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                <p className="text-gray-600 leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 md:py-20 bg-primary-600">
        <div className="container-custom">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mb-4">
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-white/70 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 md:py-28">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="section-title">{t('home.whyTitle')}</h2>
            <p className="section-subtitle">{t('home.whySubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {whyFeatures.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 rounded-2xl bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center mx-auto mb-5 transition-colors">
                  <feature.icon className="w-8 h-8 text-primary-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-gray-900 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }} />
        </div>
        <div className="container-custom relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t('home.ctaTitle')}
            </h2>
            <p className="text-lg text-gray-300 mb-8">
              {t('home.ctaSubtitle')}
            </p>
            <Link href="/contact" className="btn-primary bg-accent-500 hover:bg-accent-600 px-8 py-4 text-lg">
              {t('home.ctaButton')}
              <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
