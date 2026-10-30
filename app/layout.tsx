import type { Metadata, Viewport } from 'next'
import { Inter, Cairo } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'
import FloatingContactButtons from '@/components/FloatingContactButtons'
import VisitorTracker from '@/components/VisitorTracker'
import UserPresenceTracker from '@/components/UserPresenceTracker'
import PwaRegister from '@/components/PwaRegister'
import PwaInstallPrompt from '@/components/PwaInstallPrompt'
import ConsentBanner from '@/components/ConsentBanner'
import { getServerI18n } from '@/lib/i18n-server'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-cairo',
  display: 'swap',
})

function siteUrl() {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://qhsseconsultant.com')
  } catch {
    return new URL('https://qhsseconsultant.com')
  }
}

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: 'QHSSE Consultant | Quality, Health, Safety & Environmental Solutions',
    template: '%s | QHSSE Consultant',
  },
  description:
    'QHSSE Consultant provides quality, health, safety, environmental, food-safety and training solutions for organisations across Egypt and the UAE.',
  keywords: [
    'QHSE',
    'QHSSE',
    'safety consultancy',
    'food safety',
    'HACCP',
    'ISO 22000',
    'ISO 45001',
    'risk assessment',
    'safety training',
    'Egypt',
    'UAE',
  ],
  authors: [{ name: 'QHSSE Consultant' }],
  creator: 'QHSSE Consultant',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['ar_EG'],
    url: '/',
    siteName: 'QHSSE Consultant',
    title: 'QHSSE Consultant | Safety, Quality & Environmental Solutions',
    description:
      'Practical QHSE consultancy, audits, risk assessments and accredited-style training for organisations in Egypt and the UAE.',
    images: [
      {
        url: '/images/qhsse-hero-inspection.png',
        width: 1200,
        height: 630,
        alt: 'QHSSE consultant conducting a site inspection',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QHSSE Consultant | Safety, Quality & Environmental Solutions',
    description:
      'Practical QHSE consultancy, audits, risk assessments and training for organisations in Egypt and the UAE.',
    images: ['/images/qhsse-hero-inspection.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'QHSSE',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1e40af',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { language, dir } = await getServerI18n()

  return (
    <html lang={language} dir={dir} suppressHydrationWarning>
      <body className={`${inter.variable} ${cairo.variable}`}>
        <Providers initialLanguage={language}>
          <a href="#main-content" className="skip-link">
            {language === 'ar' ? 'تخطَّ إلى المحتوى الرئيسي' : 'Skip to main content'}
          </a>
          <VisitorTracker />
          <UserPresenceTracker />
          <PwaRegister />
          <PwaInstallPrompt />
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
          <FloatingContactButtons />
          <ConsentBanner />
        </Providers>
      </body>
    </html>
  )
}
