'use client'

import { useLanguage } from '@/context'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Link from 'next/link'
import {
  Shield,
  Apple,
  BarChart3,
  FileSearch,
  GraduationCap,
  ArrowRight,
  CheckCircle,
} from 'lucide-react'

export default function ServicesPage() {
  const { t, dir } = useLanguage()

  const services = [
    {
      icon: Shield,
      title: t('services.qhseTitle'),
      desc: t('services.qhseDesc'),
      color: 'from-blue-500 to-blue-600',
      features: [
        'ISO 9001 Implementation',
        'ISO 45001 Compliance',
        'ISO 14001 Environmental Management',
        'Integrated Management Systems',
      ],
    },
    {
      icon: Apple,
      title: t('services.foodTitle'),
      desc: t('services.foodDesc'),
      color: 'from-amber-500 to-amber-600',
      features: [
        'HACCP Plan Development',
        'ISO 22000 Certification',
        'Food Safety Audits',
        'Allergen Management',
      ],
    },
    {
      icon: BarChart3,
      title: t('services.riskTitle'),
      desc: t('services.riskDesc'),
      color: 'from-rose-500 to-rose-600',
      features: [
        'Hazard Identification',
        'Risk Assessment & Analysis',
        'Mitigation Strategies',
        'Emergency Response Planning',
      ],
    },
    {
      icon: FileSearch,
      title: t('services.auditTitle'),
      desc: t('services.auditDesc'),
      color: 'from-teal-500 to-teal-600',
      features: [
        'Compliance Audits',
        'Gap Analysis',
        'Site Inspections',
        'Corrective Action Plans',
      ],
    },
    {
      icon: GraduationCap,
      title: t('services.trainingTitle'),
      desc: t('services.trainingDesc'),
      color: 'from-violet-500 to-violet-600',
      features: [
        'Safety Induction Programs',
        'Emergency Response Training',
        'First Aid & CPR',
        'Fire Safety Training',
      ],
    },
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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">{t('services.title')}</h1>
            <p className="text-xl text-white/80">{t('services.subtitle')}</p>
          </div>
        </div>
      </section>

      {/* Services List */}
      <section className="py-16 md:py-24">
        <div className="container-custom">
          <div className="space-y-16">
            {services.map((service, index) => (
              <div
                key={index}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-6 shadow-lg`}>
                    <service.icon className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">{service.title}</h2>
                  <p className="text-gray-600 text-lg leading-relaxed mb-6">{service.desc}</p>
                  <ul className="space-y-3">
                    {service.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-accent-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                  <div className="bg-gray-100 rounded-2xl p-8 md:p-12">
                    <div className={`w-full h-48 md:h-64 rounded-xl bg-gradient-to-br ${service.color} opacity-20`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('services.ctaTitle')}</h2>
            <p className="text-lg text-gray-600 mb-8">{t('services.ctaSubtitle')}</p>
            <Link href="/contact" className="btn-primary px-8 py-4 text-lg">
              {t('services.ctaButton')}
              <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
