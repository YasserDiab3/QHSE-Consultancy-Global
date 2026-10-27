import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Client Portal',
  description: 'Access reports, corrective actions and client documents.',
  path: '/dashboard',
  noIndex: true,
})

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children
}
