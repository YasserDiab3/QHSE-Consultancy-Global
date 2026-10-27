import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import ClientDashboard from './client-dashboard'

interface DashboardPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined
  const reportId = typeof resolvedParams?.report === 'string' ? resolvedParams.report : undefined

  if (reportId) {
    redirect(`/reports/verify/${encodeURIComponent(reportId)}`)
  }

  const session = await getSession()
  if (!session?.user) {
    redirect('/login')
  }

  if (session.user.role === 'ADMIN') {
    redirect('/admin')
  }

  if (session.user.role === 'TRAINEE') {
    redirect('/training')
  }

  return <ClientDashboard />
}
