import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminDashboardClient from './admin-dashboard-client'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/dashboard')

  return <AdminDashboardClient />
}
