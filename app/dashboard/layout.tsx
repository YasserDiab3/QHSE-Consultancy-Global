import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/login?callbackUrl=/dashboard')
  }

  if (session.user.role === 'TRAINEE') {
    redirect('/training')
  }

  // The client portal must never be used as a fallback view for administrators.
  // Apart from preventing a confusing first-login experience, this keeps the
  // client-specific UI and its data-fetching paths strictly role-scoped.
  if (session.user.role === 'ADMIN') {
    redirect('/admin')
  }

  if (session.user.role !== 'CLIENT') {
    redirect('/')
  }

  return children
}
