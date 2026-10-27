import { redirect } from 'next/navigation'
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

  return <ClientDashboard />
}
