import { prisma } from './prisma'

export async function logActivity(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: string,
  ipAddress?: string
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details,
        ipAddress,
      },
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}
