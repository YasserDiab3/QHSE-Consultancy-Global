import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { isStaff, isSuperAdmin } from '@/lib/permissions'

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
  if (!session?.user || !isSuperAdmin(session.user.role)) {
    throw new Error('Forbidden')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (!user || !isSuperAdmin(user.role)) {
    throw new Error('Forbidden')
  }

  return session
}

export async function requireStaff() {
  const session = await getSession()
  if (!session?.user || !isStaff(session.user.role)) {
    throw new Error('Forbidden')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (!user || !isStaff(user.role)) {
    throw new Error('Forbidden')
  }

  return session
}
