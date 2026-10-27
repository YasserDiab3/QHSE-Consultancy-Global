import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Terms of Service',
  description:
    'The terms governing use of the QHSSE Consultant website, client portal, training platform, reports and certificates.',
  path: '/terms',
})

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children
}
