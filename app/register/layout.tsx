import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Create a training account',
  description: 'Create a QHSSE Consultant training account to enrol in courses and receive verifiable certificates.',
  path: '/register',
  noIndex: true,
})

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children
}
