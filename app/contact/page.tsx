'use client'

import { useLanguage } from '@/context'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Mail, Phone, MapPin, Send, Loader2 } from 'lucide-react'

export default function ContactPage() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Simulate form submission
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast.success(t('contact.successMessage'))
      setFormData({ name: '', company: '', email: '', phone: '', message: '' })
    } catch (error) {
      toast.error(t('common.error'))
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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">{t('contact.title')}</h1>
            <p className="text-xl text-white/80">{t('contact.subtitle')}</p>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-16 md:py-24">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Contact Form */}
            <div className="lg:col-span-3">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label-field">{t('contact.name')} *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">{t('contact.company')}</label>
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label-field">{t('contact.email')} *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">{t('contact.phone')}</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                </div>
                <div>
                  <label className="label-field">{t('contact.message')} *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="input-field resize-none"
                    placeholder={t('contact.messagePlaceholder')}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full md:w-auto px-8 py-3"
                >
                  {loading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />{t('contact.sending')}</>
                  ) : (
                    <><Send className="w-5 h-5" />{t('contact.sendButton')}</>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-6">{t('contact.infoTitle')}</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{t('contact.address')}</p>
                      <p className="text-gray-600">Business District, City</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{t('contact.phoneLabel')}</p>
                      <p className="text-gray-600">+971 XX XXX XXXX</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{t('contact.emailLabel')}</p>
                      <p className="text-gray-600">info@qhsseconsultant.com</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map Placeholder */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{t('contact.mapTitle')}</h3>
                <div className="w-full h-48 bg-gray-200 rounded-xl flex items-center justify-center">
                  <MapPin className="w-10 h-10 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
