import { getSession } from '@/lib/auth'
import { isStaff } from '@/lib/permissions'
import { redirect } from 'next/navigation'
import AdminDashboardClient from './admin-dashboard-client'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (!isStaff(session.user.role)) redirect('/dashboard')

  return <AdminDashboardClient />
}
