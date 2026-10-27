import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Admin',
  description: 'QHSSE Consultant administration.',
  path: '/admin',
  noIndex: true,
})

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children
}
