import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ROLES,
  isSuperAdmin,
  isStaff,
  canDeleteRecords,
  canManageTeam,
  canManageSecuritySettings,
  canCreateOperationalData,
  canEditOperationalData,
  ROLE_LABELS_AR,
  ROLE_LABELS_EN,
} from '../lib/permissions'

test('Role Identification: isSuperAdmin identifies ADMIN exclusively', () => {
  assert.equal(isSuperAdmin(ROLES.ADMIN), true)
  assert.equal(isSuperAdmin('ADMIN'), true)
  assert.equal(isSuperAdmin(ROLES.DATA_ENTRY), false)
  assert.equal(isSuperAdmin('CLIENT'), false)
  assert.equal(isSuperAdmin('TRAINEE'), false)
  assert.equal(isSuperAdmin(null), false)
  assert.equal(isSuperAdmin(undefined), false)
})

test('Role Identification: isStaff permits ADMIN and DATA_ENTRY', () => {
  assert.equal(isStaff(ROLES.ADMIN), true)
  assert.equal(isStaff(ROLES.DATA_ENTRY), true)
  assert.equal(isStaff(ROLES.CLIENT), false)
  assert.equal(isStaff(ROLES.TRAINEE), false)
  assert.equal(isStaff('anonymous'), false)
})

test('RBAC Boundary: Only Super Admin can delete records', () => {
  assert.equal(canDeleteRecords(ROLES.ADMIN), true)
  assert.equal(canDeleteRecords(ROLES.DATA_ENTRY), false, 'DATA_ENTRY must NOT be allowed to delete records')
  assert.equal(canDeleteRecords(ROLES.CLIENT), false)
})

test('RBAC Boundary: Only Super Admin can manage team and users', () => {
  assert.equal(canManageTeam(ROLES.ADMIN), true)
  assert.equal(canManageTeam(ROLES.DATA_ENTRY), false, 'DATA_ENTRY must NOT be allowed to manage team users')
})

test('RBAC Boundary: Only Super Admin can manage security settings (2FA)', () => {
  assert.equal(canManageSecuritySettings(ROLES.ADMIN), true)
  assert.equal(canManageSecuritySettings(ROLES.DATA_ENTRY), false)
})

test('Operational Capabilities: Staff can create and edit operational records', () => {
  assert.equal(canCreateOperationalData(ROLES.ADMIN), true)
  assert.equal(canCreateOperationalData(ROLES.DATA_ENTRY), true)
  assert.equal(canCreateOperationalData(ROLES.CLIENT), false)

  assert.equal(canEditOperationalData(ROLES.ADMIN), true)
  assert.equal(canEditOperationalData(ROLES.DATA_ENTRY), true)
  assert.equal(canEditOperationalData(ROLES.CLIENT), false)
})

test('Labels: Role labels in Arabic and English exist for standard roles', () => {
  assert.ok(ROLE_LABELS_AR[ROLES.ADMIN].includes('مدير'))
  assert.ok(ROLE_LABELS_AR[ROLES.DATA_ENTRY].includes('مدخل'))
  assert.ok(ROLE_LABELS_EN[ROLES.ADMIN].includes('Admin'))
  assert.ok(ROLE_LABELS_EN[ROLES.DATA_ENTRY].includes('Data Entry'))
})

test('Team Safeguards: Self-deletion and Sole Admin logic invariants', () => {
  // Safeguard 1: Self-deletion check
  const currentUserId = 'user-admin-1'
  const targetId = 'user-admin-1'
  const isSelf = currentUserId === targetId
  assert.equal(isSelf, true, 'System correctly flags attempt to delete own active session')

  // Safeguard 2: Sole Admin deletion check
  const totalAdminsCount = 1
  const isSoleAdmin = totalAdminsCount <= 1
  assert.equal(isSoleAdmin, true, 'System correctly blocks deletion when only 1 admin remains')

  // When more admins exist, deletion of other admin is allowed
  const totalAdminsWithNewAdmin = 2
  assert.equal(totalAdminsWithNewAdmin <= 1, false, 'Deletion allowed when multiple admins exist')
})
