'use client'

import { useLanguage } from '@/context'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { CONTACT_INFO } from '@/lib/contact-info'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { AlertCircle, ArrowUpRight, Mail, Phone, MapPin, Send, Loader2, Briefcase, MessageCircle } from 'lucide-react'

export default function ContactPage() {
  const { t, language } = useLanguage()
  const [selectedService, setSelectedService] = useState('')
  const [loading, setLoading] = useState(false)
  const [consent, setConsent] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
  })

  const serviceMessageTemplate = useMemo(() => {
    if (!selectedService) {
      return ''
    }

    return language === 'ar'
      ? `أرغب في طلب خدمة: ${selectedService}\n\nيرجى التواصل معي لتقديم عرض مناسب وتوضيح الخطوات التالية.`
      : `I would like to request the following service: ${selectedService}\n\nPlease contact me with a suitable proposal and the next steps.`
  }, [language, selectedService])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const service = new URLSearchParams(window.location.search).get('service')?.trim() || ''
    setSelectedService(service)
  }, [])

  useEffect(() => {
    if (!serviceMessageTemplate) {
      return
    }

    setFormData((prev) => ({
      ...prev,
      message: prev.message.trim() ? prev.message : serviceMessageTemplate,
    }))
  }, [serviceMessageTemplate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!consent) {
      setFormError(
        language === 'ar'
          ? 'يرجى الموافقة على سياسة الخصوصية قبل إرسال الطلب.'
          : 'Please agree to the privacy policy before sending your request.'
      )
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || t('common.error'))
      }

      toast.success(t('contact.successMessage'))
      setFormData({
        name: '',
        company: '',
        email: '',
        phone: '',
        message: serviceMessageTemplate,
      })
      setConsent(false)
    } catch (error) {
      console.error('Failed to submit contact form:', error)
      const message = error instanceof Error ? error.message : t('common.error')
      setFormError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="min-h-screen">
      <Header />

      <section className="relative overflow-hidden bg-gradient-to-br from-primary-800 to-primary-600 pb-20 pt-32">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
        </div>
        <div className="container-custom relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl">{t('contact.title')}</h1>
            <p className="text-xl text-white/80">{t('contact.subtitle')}</p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-custom">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
            <div className="lg:col-span-3">
              {selectedService ? (
                <div className="mb-6 rounded-2xl border border-primary-100 bg-primary-50 p-5">
                  <div className="mb-2 flex items-center gap-3 text-primary-700">
                    <Briefcase className="h-5 w-5" />
                    <span className="text-sm font-semibold">
                      {language === 'ar' ? 'الخدمة المختارة' : 'Selected Service'}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-primary-900">{selectedService}</p>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-6">
                {formError ? (
                  <div
                    id="contact-form-error"
                    role="alert"
                    className="flex items-start gap-2 rounded-lg border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{formError}</span>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className="label-field">
                      {t('contact.name')} <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      autoComplete="name"
                      aria-invalid={Boolean(formError)}
                      aria-describedby={formError ? 'contact-form-error' : undefined}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-company" className="label-field">
                      {t('contact.company')}
                    </label>
                    <input
                      id="contact-company"
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      autoComplete="organization"
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label htmlFor="contact-email" className="label-field">
                      {t('contact.email')} <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      autoComplete="email"
                      inputMode="email"
                      aria-invalid={Boolean(formError)}
                      aria-describedby={formError ? 'contact-form-error' : undefined}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="label-field">
                      {t('contact.phone')}
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      autoComplete="tel"
                      inputMode="tel"
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="contact-message" className="label-field">
                    {t('contact.message')} <span aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    minLength={10}
                    rows={6}
                    className="input-field resize-none"
                    placeholder={t('contact.messagePlaceholder')}
                    aria-describedby="contact-response-time"
                  />
                  <p id="contact-response-time" className="mt-2 text-xs text-slate-500">
                    {language === 'ar'
                      ? 'نرد عادةً خلال يوم عمل واحد. لا تشارك بيانات حساسة في هذا النموذج.'
                      : 'We usually reply within one business day. Please do not include sensitive data in this form.'}
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <input
                    id="contact-consent"
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    required
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
                  />
                  <label htmlFor="contact-consent" className="text-sm leading-6 text-slate-600">
                    {language === 'ar' ? (
                      <>
                        أوافق على معالجة QHSSE Consultant لبياناتي للرد على هذا الطلب وفق{' '}
                        <Link href="/privacy" className="font-medium text-brand-gold underline underline-offset-2">
                          سياسة الخصوصية
                        </Link>
                        .
                      </>
                    ) : (
                      <>
                        I agree to QHSSE Consultant processing my details to respond to this request, in line with the{' '}
                        <Link href="/privacy" className="font-medium text-brand-gold underline underline-offset-2">
                          Privacy Policy
                        </Link>
                        .
                      </>
                    )}
                  </label>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full px-8 py-3 md:w-auto">
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                      {t('contact.sending')}
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" aria-hidden="true" />
                      {t('contact.sendButton')}
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="space-y-8 lg:col-span-2">
              <div>
                <h3 className="mb-6 text-xl font-bold text-gray-900">{t('contact.infoTitle')}</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50">
                      <MapPin className="h-5 w-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{t('contact.address')}</p>
                      <p className="text-gray-600">{CONTACT_INFO.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50">
                      <Phone className="h-5 w-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{t('contact.phoneLabel')}</p>
                      <a href={CONTACT_INFO.phoneUrl} className="text-gray-600 transition-colors hover:text-primary-600">
                        {CONTACT_INFO.phone}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50">
                      <Mail className="h-5 w-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{t('contact.emailLabel')}</p>
                      <a
                        href={CONTACT_INFO.emailUrl}
                        className="break-all text-gray-600 transition-colors hover:text-primary-600"
                      >
                        {CONTACT_INFO.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-50">
                      <MessageCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">WhatsApp</p>
                      <a
                        href={CONTACT_INFO.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gray-600 transition-colors hover:text-green-600"
                      >
                        {CONTACT_INFO.whatsapp}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-xl font-bold text-gray-900">{t('contact.mapTitle')}</h3>
                <a
                  href={CONTACT_INFO.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-h-48 w-full flex-col justify-between rounded-xl border border-slate-200 bg-gradient-to-br from-primary-50 to-white p-6 transition hover:border-primary-300 hover:shadow-card"
                  aria-label={
                    language === 'ar'
                      ? `افتح موقع المكتب على خرائط Google — ${CONTACT_INFO.address}`
                      : `Open our office location in Google Maps — ${CONTACT_INFO.address}`
                  }
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-500 text-white">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="mt-8">
                    <span className="block text-sm font-semibold text-slate-900">{t('contact.address')}</span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600">{CONTACT_INFO.address}</span>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 group-hover:text-primary-700">
                      {language === 'ar' ? 'افتح في خرائط Google' : 'Open in Google Maps'}
                      <ArrowUpRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                    </span>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
