import { createActivityLogRecord } from './activity-log-records'

export async function logActivity(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: string,
  ipAddress?: string
) {
  try {
    await createActivityLogRecord({
      userId,
      action,
      entityType,
      entityId,
      details,
      ipAddress,
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}
