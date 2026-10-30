import test from 'node:test'
import assert from 'node:assert/strict'
import {
  generateOtpCode,
  issueAdmin2FaOtp,
  verify2FaOtp,
  clear2FaStore,
  normalizeOtpDigits,
  is2FaEnabledForUser,
  set2FaEnabledForUser,
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

test('is2FaEnabledForUser is false by default and toggles cleanly', async () => {
  const testUser = 'user-toggle-test@safetyglobal.com'
  // Ensure starting clean
  await set2FaEnabledForUser(testUser, false)

  const initialStatus = await is2FaEnabledForUser(testUser)
  assert.equal(initialStatus, false)

  await set2FaEnabledForUser(testUser, true)
  const enabledStatus = await is2FaEnabledForUser(testUser)
  assert.equal(enabledStatus, true)

  await set2FaEnabledForUser(testUser, false)
  const disabledStatus = await is2FaEnabledForUser(testUser)
  assert.equal(disabledStatus, false)
})

test('issueAdmin2FaOtp and verify2FaOtp allow successful authentication with single-use code', async () => {
  clear2FaStore()
  const testEmail = 'admin-2fa-test@safetyglobal.com'

  const issueResult = await issueAdmin2FaOtp(testEmail, 'ar')
  assert.equal(issueResult.success, true)
  assert.ok(issueResult.code)

  // Requesting again immediately should hit cooldown
  const cooldownResult = await issueAdmin2FaOtp(testEmail, 'ar')
  assert.equal(cooldownResult.cooldown, true)

  // Invalid code must fail
  const invalidResult = await verify2FaOtp(testEmail, '000000')
  assert.equal(invalidResult, false)

  // Valid code must succeed
  const validResult = await verify2FaOtp(testEmail, issueResult.code!)
  assert.equal(validResult, true)

  // Reusing the same code must fail (single-use token)
  const reuseResult = await verify2FaOtp(testEmail, issueResult.code!)
  assert.equal(reuseResult, false)
})

test('verify2FaOtp validates Authenticator TOTP token when secret exists in database', async () => {
  const { prisma } = await import('../lib/prisma')
  const { generateTotpSecret, generateTotpCode } = await import('../lib/totp')

  const testEmail = 'totp-auth-test@safetyglobal.com'
  const secret = generateTotpSecret(20)

  // Ensure user exists or is created with twoFactorSecret
  const user = await prisma.user.upsert({
    where: { email: testEmail },
    create: {
      name: 'TOTP Tester',
      email: testEmail,
      password: 'hashed-password',
      role: 'ADMIN',
      twoFactorSecret: secret,
    },
    update: {
      twoFactorSecret: secret,
    },
  })

  const isEnabled = await is2FaEnabledForUser(testEmail)
  assert.equal(isEnabled, true)

  const currentCode = generateTotpCode(secret)
  const isValid = await verify2FaOtp(testEmail, currentCode)
  assert.equal(isValid, true)

  const isInvalid = await verify2FaOtp(testEmail, '999999')
  assert.equal(isInvalid, false)

  // Cleanup
  await prisma.user.delete({ where: { id: user.id } }).catch(() => {})
})
