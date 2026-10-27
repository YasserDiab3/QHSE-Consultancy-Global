import test from 'node:test'
import assert from 'node:assert/strict'
import {
  checkAccountLockout,
  recordFailedAttempt,
  resetFailedAttempts,
  normalizeAuthEmail,
  clearMemoryLockoutStore,
  MAX_FAILED_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
} from '../lib/auth-lockout'

test('normalizeAuthEmail trims and lowercases emails correctly', () => {
  assert.equal(normalizeAuthEmail('  Admin@SafetyGlobal.COM '), 'admin@safetyglobal.com')
  assert.equal(normalizeAuthEmail('USER@EXAMPLE.ORG'), 'user@example.org')
  assert.equal(normalizeAuthEmail(''), '')
})

test('account is not locked initially', async () => {
  clearMemoryLockoutStore()
  const email = 'fresh-user@example.com'
  const status = await checkAccountLockout(email)
  assert.equal(status.locked, false)
})

test('consecutive failed attempts decrement remaining attempts and lock on 5th attempt', async () => {
  clearMemoryLockoutStore()
  const testEmail = 'target-attacker@example.com'

  // Attempts 1 to 4 should NOT lock the account
  for (let i = 1; i <= 4; i++) {
    const res = await recordFailedAttempt(testEmail)
    assert.equal(res.locked, false, `Attempt ${i} should not lock`)
    assert.equal(res.attemptsLeft, MAX_FAILED_LOGIN_ATTEMPTS - i)
  }

  // 5th attempt MUST trigger lockout
  const fifthAttempt = await recordFailedAttempt(testEmail)
  assert.equal(fifthAttempt.locked, true)
  assert.equal(fifthAttempt.attemptsLeft, 0)
  assert.equal(fifthAttempt.remainingMinutes, LOCKOUT_DURATION_MINUTES)

  // Status check should now report locked
  const status = await checkAccountLockout(testEmail)
  assert.equal(status.locked, true)
  assert.equal(typeof status.remainingMinutes, 'number')
  assert.ok(status.remainingMinutes! > 0 && status.remainingMinutes! <= LOCKOUT_DURATION_MINUTES)
})

test('resetFailedAttempts immediately unlocks account on successful login', async () => {
  clearMemoryLockoutStore()
  const testEmail = 'locked-then-reset@example.com'

  // Trigger lockout
  for (let i = 1; i <= 5; i++) {
    await recordFailedAttempt(testEmail)
  }
  const lockedStatus = await checkAccountLockout(testEmail)
  assert.equal(lockedStatus.locked, true)

  // Successful login calls reset
  await resetFailedAttempts(testEmail)

  const unlockedStatus = await checkAccountLockout(testEmail)
  assert.equal(unlockedStatus.locked, false)
})
