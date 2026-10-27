import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Sign in',
  description: 'Sign in to your QHSSE Consultant client or training account.',
  path: '/login',
  noIndex: true,
})

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children
}
