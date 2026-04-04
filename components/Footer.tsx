'use client'

import { useLanguage } from '@/context'
import Link from 'next/link'
import { Linkedin, Mail, MapPin, Phone, Twitter } from 'lucide-react'
import BrandLogo from './BrandLogo'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="bg-primary-900 text-white">
      <div className="container-custom py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="mb-5 inline-flex items-center rounded-[30px] border border-white/15 bg-white px-4 py-3 shadow-lg shadow-black/10"
            >
              <BrandLogo variant="stacked" className="w-[170px] md:w-[210px]" />
            </Link>
            <p className="mb-6 max-w-md text-gray-400">{t('home.heroSubtitle')}</p>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 transition-colors hover:bg-white/20"
              >
                <Twitter className="h-5 w-5" />
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
                  Business District, City
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 flex-shrink-0 text-accent-400" />
                <span className="text-gray-400">+971 XX XXX XXXX</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 flex-shrink-0 text-accent-400" />
                <span className="text-gray-400">info@qhsseconsultant.com</span>
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
