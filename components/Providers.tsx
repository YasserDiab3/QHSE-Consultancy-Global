'use client'

import { SessionProvider } from 'next-auth/react'
import { LanguageProvider } from '@/context'
import type { Language } from '@/lib/i18n-config'
import { Toaster } from 'react-hot-toast'

export default function Providers({
  children,
  initialLanguage = 'en',
}: {
  children: React.ReactNode
  initialLanguage?: Language
}) {
  return (
    <SessionProvider>
      <LanguageProvider initialLanguage={initialLanguage}>
        {children}
      </LanguageProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e40af',
            color: '#fff',
          },
        }}
      />
    </SessionProvider>
  )
}
