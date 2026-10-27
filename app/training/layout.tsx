import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'QHSE Training & Certification',
  description:
    'Practical safety, food-safety and quality training with online assessments, verifiable certificates and a learner portal.',
  path: '/training',
})

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children
}
