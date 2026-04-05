import type { Metadata } from 'next'
import { Inter, Cairo } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'
import FloatingContactButtons from '@/components/FloatingContactButtons'
import VisitorTracker from '@/components/VisitorTracker'

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

export const metadata: Metadata = {
  title: 'QHSSE Consultant | Quality, Health, Safety & Environmental Solutions',
  description: 'Premier consultancy firm specializing in Quality, Health, Safety, and Environmental (QHSE) solutions since 2022.',
  keywords: 'QHSE, safety, quality, health, environment, consultancy, food safety, HACCP, ISO 22000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${inter.variable} ${cairo.variable}`}>
        <Providers>
          <VisitorTracker />
          {children}
          <FloatingContactButtons />
        </Providers>
      </body>
    </html>
  )
}
