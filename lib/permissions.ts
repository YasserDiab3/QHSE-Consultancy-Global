export type AppRole = 'ADMIN' | 'DATA_ENTRY' | 'CLIENT' | 'TRAINEE'

export const ROLES = {
  ADMIN: 'ADMIN',
  DATA_ENTRY: 'DATA_ENTRY',
  CLIENT: 'CLIENT',
  TRAINEE: 'TRAINEE',
} as const

export const ROLE_LABELS_AR: Record<string, string> = {
  ADMIN: 'مدير عام النظام (Super Admin)',
  DATA_ENTRY: 'مدخل بيانات (Data Entry)',
  CLIENT: 'حساب عميل (Client)',
  TRAINEE: 'متدرب (Trainee)',
}

export const ROLE_LABELS_EN: Record<string, string> = {
  ADMIN: 'Super Administrator',
  DATA_ENTRY: 'Data Entry Clerk',
  CLIENT: 'Client User',
  TRAINEE: 'Trainee',
}

/**
 * Checks if the user is a full administrator (Super Admin).
 */
export function isSuperAdmin(role?: string | null): boolean {
  return role === ROLES.ADMIN
}

/**
 * Checks if the user has internal backoffice access (Admin or Data Entry).
 */
export function isStaff(role?: string | null): boolean {
  return role === ROLES.ADMIN || role === ROLES.DATA_ENTRY
}

/**
 * Only full administrators can permanently delete records.
 * Data entry clerks are strictly forbidden from deletion.
 */
export function canDeleteRecords(role?: string | null): boolean {
  return isSuperAdmin(role)
}

/**
 * Only full administrators can manage team members, roles, and administrative users.
 */
export function canManageTeam(role?: string | null): boolean {
  return isSuperAdmin(role)
}

/**
 * Only full administrators can change security and 2FA settings.
 */
export function canManageSecuritySettings(role?: string | null): boolean {
  return isSuperAdmin(role)
}

/**
 * Standard operational data entry: staff can create reports, observations, client profiles, documents, etc.
 */
export function canCreateOperationalData(role?: string | null): boolean {
  return isStaff(role)
}

/**
 * Standard operational data entry: staff can update reports, observations, client profiles, documents, etc.
 */
export function canEditOperationalData(role?: string | null): boolean {
  return isStaff(role)
}
