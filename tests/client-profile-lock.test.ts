import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parsePortalSettings,
  serializePortalSettings,
  isProfileLocked,
  isFinancesVisible,
  PortalSettings,
  PROFILE_PREFIX,
} from '../lib/client-profile'

test('parsePortalSettings handles null, legacy strings, and JSON settings', () => {
  assert.deepEqual(parsePortalSettings(null), {})
  assert.deepEqual(parsePortalSettings(undefined), {})

  const legacy = parsePortalSettings('01012345678')
  assert.deepEqual(legacy, { legacyContactInfo: '01012345678' })

  const jsonString = `${PROFILE_PREFIX}${JSON.stringify({
    logoDataUrl: 'data:image/png;base64,abc',
    showProfile: true,
    profileLocked: true,
    lockedAt: '2026-10-28T20:00:00Z',
  })}`
  const parsed = parsePortalSettings(jsonString)
  assert.equal(parsed.logoDataUrl, 'data:image/png;base64,abc')
  assert.equal(parsed.showProfile, true)
  assert.equal(parsed.profileLocked, true)
  assert.equal(parsed.lockedAt, '2026-10-28T20:00:00Z')
})

test('serializePortalSettings prepends correct prefix and encodes JSON', () => {
  const settings: PortalSettings = {
    showProfile: false,
    profileLocked: true,
    lockedBy: 'ADMIN:user123',
  }
  const serialized = serializePortalSettings(settings)
  assert.ok(serialized.startsWith(PROFILE_PREFIX))
  const decoded = JSON.parse(serialized.slice(PROFILE_PREFIX.length))
  assert.equal(decoded.showProfile, false)
  assert.equal(decoded.profileLocked, true)
  assert.equal(decoded.lockedBy, 'ADMIN:user123')
})

test('isProfileLocked logic accurately distinguishes locked vs unlocked states', () => {
  // Fresh client with no settings
  assert.equal(isProfileLocked({}), false)

  // Explicitly locked
  assert.equal(isProfileLocked({ profileLocked: true }), true)

  // Explicitly unlocked by admin (even if logo exists)
  assert.equal(isProfileLocked({ profileLocked: false, logoDataUrl: 'data:image/png;base64,xxx' }), false)

  // Legacy profile with logo but no explicit profileLocked boolean
  assert.equal(isProfileLocked({ logoDataUrl: 'data:image/png;base64,xxx' }), true)
})

test('simulated client profile update locks on first save', () => {
  let settings: PortalSettings = { showProfile: true }
  assert.equal(isProfileLocked(settings), false)

  // Client submits initial profile data
  const incomingClientBody = {
    profile: {
      name: 'Mohamed Nasr',
      companyName: 'Al-Sobky Foods',
    },
  }

  // Update logic triggers lock upon first profile save
  const willLock = isProfileLocked(settings) || incomingClientBody.profile !== undefined
  settings = {
    ...settings,
    profileLocked: willLock,
    lockedAt: new Date().toISOString(),
    lockedBy: 'CLIENT_INITIAL_SAVE',
  }

  assert.equal(isProfileLocked(settings), true)
  assert.equal(settings.profileLocked, true)
  assert.equal(settings.lockedBy, 'CLIENT_INITIAL_SAVE')
})

test('simulated client cannot modify locked profile, but can toggle showProfile', () => {
  const settings: PortalSettings = {
    profileLocked: true,
    showProfile: true,
  }

  // Client attempts second edit
  const secondEdit = { profile: { companyName: 'Hacked Name' } }
  const isBlocked = isProfileLocked(settings) && secondEdit.profile !== undefined
  assert.equal(isBlocked, true)

  // Client toggles showProfile (allowed view preference)
  const viewToggle = { showProfile: false }
  const isViewToggleBlocked = isProfileLocked(settings) && (viewToggle as any).profile !== undefined
  assert.equal(isViewToggleBlocked, false)
})

test('admin can toggle lock status and unlock client profile', () => {
  let settings: PortalSettings = {
    profileLocked: true,
    lockedAt: '2026-10-28T18:00:00Z',
    lockedBy: 'CLIENT_INITIAL_SAVE',
  }
  assert.equal(isProfileLocked(settings), true)

  // Admin unlocks client
  settings = {
    ...settings,
    profileLocked: false,
  }
  delete settings.lockedAt
  delete settings.lockedBy

  assert.equal(isProfileLocked(settings), false)
  assert.equal(settings.lockedAt, undefined)

  // Admin can re-lock client
  settings = {
    ...settings,
    profileLocked: true,
    lockedAt: new Date().toISOString(),
    lockedBy: 'ADMIN:admin_id',
  }
  assert.equal(isProfileLocked(settings), true)
  assert.equal(settings.lockedBy, 'ADMIN:admin_id')
})

test('isFinancesVisible defaults to false and only enables when explicitly set to true', () => {
  // Brand new client with empty settings
  assert.equal(isFinancesVisible({}), false)

  // Explicitly false
  assert.equal(isFinancesVisible({ showFinances: false }), false)

  // Undefined
  assert.equal(isFinancesVisible({ showFinances: undefined }), false)

  // Explicitly true
  assert.equal(isFinancesVisible({ showFinances: true }), true)
})

test('PortalSettings safely serializes and deserializes showFinances and contact details', () => {
  const initial: PortalSettings = {
    showFinances: true,
    contactPerson: 'Eng. Ahmed',
    contactEmail: 'ahmed@factory.com',
    profileLocked: false,
  }

  const raw = serializePortalSettings(initial)
  const parsed = parsePortalSettings(raw)

  assert.equal(parsed.showFinances, true)
  assert.equal(isFinancesVisible(parsed), true)
  assert.equal(parsed.contactPerson, 'Eng. Ahmed')
  assert.equal(parsed.contactEmail, 'ahmed@factory.com')
  assert.equal(parsed.profileLocked, false)
})
