import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'QHSE Consultancy Services',
  description:
    'Safety audits, risk assessments, HACCP and food-safety reviews, ISO management-system support, onsite inspections and professional QHSE training.',
  path: '/services',
})

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children
}
