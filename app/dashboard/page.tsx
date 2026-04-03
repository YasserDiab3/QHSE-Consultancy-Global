'use client'

import ClientDashboard from './client-dashboard'
import { SessionProvider } from 'next-auth/react'

export default function DashboardPage() {
  return (
    <SessionProvider>
      <ClientDashboard />
    </SessionProvider>
  )
}
