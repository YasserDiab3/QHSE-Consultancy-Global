import test from 'node:test'
import assert from 'node:assert/strict'
import {
  generateOtpCode,
  issueAdmin2FaOtp,
  verify2FaOtp,
  clear2FaStore,
} from '../lib/auth-2fa'

test('generateOtpCode produces a valid 6-digit numeric string', () => {
  for (let i = 0; i < 20; i++) {
    const code = generateOtpCode()
    assert.equal(code.length, 6)
    assert.match(code, /^[1-9][0-9]{5}$/)
  }
})

test('issueAdmin2FaOtp and verify2FaOtp allow successful authentication with single-use code', async () => {
  clear2FaStore()
  const testEmail = 'admin-2fa-test@safetyglobal.com'

  const issueResult = await issueAdmin2FaOtp(testEmail, 'ar')
  assert.equal(issueResult.success, true)

  // Invalid code must fail
  const invalidResult = await verify2FaOtp(testEmail, '000000')
  assert.equal(invalidResult, false)

  // Requesting again immediately should hit cooldown
  const cooldownResult = await issueAdmin2FaOtp(testEmail, 'ar')
  assert.equal(cooldownResult.cooldown, true)
})
