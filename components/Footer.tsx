'use client'

import { useLanguage } from '@/context'
import Link from 'next/link'
import { CONTACT_INFO } from '@/lib/contact-info'
import { Linkedin, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import BrandLogo from './BrandLogo'

export default function Footer() {
  const { t, language } = useLanguage()

  return (
    <footer className="bg-primary-900 text-white">
      <div className="container-custom py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="mb-5 inline-flex items-center overflow-hidden rounded-[26px] border border-white/15 bg-white p-3 shadow-lg shadow-black/10"
            >
              <BrandLogo variant="stacked" className="h-[120px] w-[120px] md:h-[140px] md:w-[140px]" />
            </Link>
            <p className="mb-6 max-w-md text-gray-400">{t('home.heroSubtitle')}</p>
            <div className="flex items-center gap-4">
              <a
                href={CONTACT_INFO.linkedin}
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-[#0A66C2] hover:text-white"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href={CONTACT_INFO.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-[#25D366] hover:text-white"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">{t('nav.home')}</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-gray-400 transition-colors hover:text-white">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-400 transition-colors hover:text-white">
                  {t('nav.about')}
                </Link>
              </li>
              <li>
                <Link href="/services" className="text-gray-400 transition-colors hover:text-white">
                  {t('nav.services')}
                </Link>
              </li>
              <li>
                <Link href="/jobs" className="text-gray-400 transition-colors hover:text-white">
                  {language === 'ar' ? 'الوظائف' : 'Jobs'}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 transition-colors hover:text-white">
                  {t('nav.contact')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">{t('contact.infoTitle')}</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-400" />
                <span className="text-gray-400">
                  {t('contact.address')}
                  <br />
                  {CONTACT_INFO.address}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 flex-shrink-0 text-accent-400" />
                <a href={CONTACT_INFO.phoneUrl} className="text-gray-400 transition-colors hover:text-white">
                  {CONTACT_INFO.phone}
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 flex-shrink-0 text-accent-400" />
                <a href={CONTACT_INFO.emailUrl} className="break-all text-gray-400 transition-colors hover:text-white">
                  {CONTACT_INFO.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} QHSSE Consultant. {t('common.tagline')}
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#" className="transition-colors hover:text-white">
              Privacy Policy
            </a>
            <a href="#" className="transition-colors hover:text-white">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
