import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login?callbackUrl=/admin')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return children
}
