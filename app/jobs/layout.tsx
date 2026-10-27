import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Careers',
  description:
    'Explore current opportunities at QHSSE Consultant and apply to join our safety, quality, food-safety and training teams.',
  path: '/jobs',
})

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children
}
