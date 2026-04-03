'use client'

import { SessionProvider } from 'next-auth/react'
import { LanguageProvider } from '@/context'
import { Toaster } from 'react-hot-toast'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
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
