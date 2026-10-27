import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'About QHSSE Consultant',
  description:
    'Meet QHSSE Consultant: a Cairo-based quality, health, safety and environmental consultancy serving organisations across Egypt and the UAE since 2022.',
  path: '/about',
})

export default function RouteLayout({ children }: { children: ReactNode }) {
  return children
}
