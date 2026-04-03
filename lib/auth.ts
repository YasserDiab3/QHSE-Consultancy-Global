import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

export async function requireAuth() {
  const session = await getSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireAdmin() {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Forbidden')
  }
  return session
}
