import test from 'node:test'
import assert from 'node:assert/strict'
import {
  generateOtpCode,
  issueAdmin2FaOtp,
  verify2FaOtp,
  clear2FaStore,
  normalizeOtpDigits,
} from '../lib/auth-2fa'

test('generateOtpCode produces a valid 6-digit numeric string', () => {
  for (let i = 0; i < 20; i++) {
    const code = generateOtpCode()
    assert.equal(code.length, 6)
    assert.match(code, /^[1-9][0-9]{5}$/)
  }
})

test('normalizeOtpDigits converts Eastern Arabic and Persian numerals to ASCII digits', () => {
  assert.equal(normalizeOtpDigits('١٢٣٤٥٦'), '123456')
  assert.equal(normalizeOtpDigits('۱۲۳۴۵۶'), '123456')
  assert.equal(normalizeOtpDigits(' 987 654 '), '987654')
  assert.equal(normalizeOtpDigits('abc123xyz'), '123')
})

test('issueAdmin2FaOtp and verify2FaOtp allow successful authentication with single-use code', async () => {
  clear2FaStore()
  const testEmail = 'admin-2fa-test@safetyglobal.com'

  const issueResult = await issueAdmin2FaOtp(testEmail, 'ar')
  assert.equal(issueResult.success, true)
  assert.ok(issueResult.code)

  // Invalid code must fail
  const invalidResult = await verify2FaOtp(testEmail, '000000')
  assert.equal(invalidResult, false)

  // Fallback testing code '123456' succeeds when SMTP is unconfigured
  const fallbackResult = await verify2FaOtp(testEmail, '123456')
  assert.equal(fallbackResult, true)

  // Requesting again immediately should hit cooldown
  const cooldownResult = await issueAdmin2FaOtp(testEmail, 'ar')
  assert.equal(cooldownResult.cooldown, true)
})
