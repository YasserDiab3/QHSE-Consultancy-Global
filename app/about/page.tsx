'use client'

import { useLanguage } from '@/context'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Shield, Award, Heart, Lightbulb, Users, FileSearch, CheckCircle2 } from 'lucide-react'

export default function AboutPage() {
  const { t } = useLanguage()

  const values = [
    {
      icon: Shield,
      title: t('about.value1Title'),
      desc: t('about.value1Desc'),
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: Award,
      title: t('about.value2Title'),
      desc: t('about.value2Desc'),
      color: 'from-amber-500 to-amber-600',
    },
    {
      icon: Heart,
      title: t('about.value3Title'),
      desc: t('about.value3Desc'),
      color: 'from-rose-500 to-rose-600',
    },
    {
      icon: Lightbulb,
      title: t('about.value4Title'),
      desc: t('about.value4Desc'),
      color: 'from-violet-500 to-violet-600',
    },
  ]

  const stats = [
    { value: '50+', label: t('about.stat1Label') },
    { value: '200+', label: t('about.stat2Label') },
    { value: '4+', label: t('about.stat3Label') },
    { value: '99%', label: t('about.stat4Label') },
  ]

  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-primary-800 to-primary-600 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
            backgroundSize: '50px 50px',
          }} />
        </div>
        <div className="container-custom relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">{t('about.title')}</h1>
            <p className="text-xl text-white/80">{t('about.subtitle')}</p>
          </div>
        </div>
      </section>

      {/* About Description */}
      <section className="py-16 md:py-24">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
              <div className="lg:col-span-3">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('about.subtitle')}</h2>
                <p className="text-gray-600 leading-relaxed text-lg">
                  {t('about.description')}
                </p>
              </div>
              <div className="lg:col-span-2">
                <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-8 text-white">
                  <Shield className="w-16 h-16 mb-6 opacity-80" />
                  <div className="space-y-4">
                    {stats.map((stat, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{stat.value}</span>
                        <span className="text-white/70 text-sm">{stat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="section-title">{t('about.valuesTitle')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="card text-center group hover:-translate-y-1 transition-all duration-300">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${value.color} flex items-center justify-center mx-auto mb-5 shadow-lg`}>
                  <value.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600 text-sm">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-16 md:py-24">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-primary-600 to-primary-800 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <CheckCircle2 className="w-12 h-12 mb-6 text-accent-400" />
              <h3 className="text-2xl md:text-3xl font-bold mb-4">Our Commitment</h3>
              <p className="text-white/80 text-lg leading-relaxed">
                We are committed to helping organizations build safer workplaces, ensure legal compliance, and foster a proactive safety culture through expert guidance and integrated systems.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
