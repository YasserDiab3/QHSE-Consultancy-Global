import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Privacy Policy',
  description:
    'How QHSSE Consultant collects, uses, shares and protects personal data, your rights, retention periods and analytics consent.',
  path: '/privacy',
})

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children
}
