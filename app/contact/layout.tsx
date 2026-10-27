import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Contact QHSSE Consultant',
  description:
    'Request a QHSE consultation, site visit, audit or training proposal. Talk to our team in Cairo, Egypt, or reach us by phone, email or WhatsApp.',
  path: '/contact',
})

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children
}
