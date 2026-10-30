import test from 'node:test'
import assert from 'node:assert/strict'
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateTotpUri,
  generateTotpQrCode,
  generateTotpCode,
  verifyTotpCode,
  formatSecretForDisplay,
} from '../lib/totp'

test('TOTP base32 encodes and decodes correctly', () => {
  const original = Buffer.from('Hello world! 12345', 'utf8')
  const encoded = base32Encode(original)
  const decoded = base32Decode(encoded)
  assert.equal(decoded.toString('utf8'), 'Hello world! 12345')
})

test('generateTotpSecret generates a 32-character base32 secret', () => {
  const secret = generateTotpSecret(20)
  assert.equal(secret.length, 32)
  assert.match(secret, /^[A-Z2-7]+$/)
})

test('formatSecretForDisplay formats secret with spaces', () => {
  const formatted = formatSecretForDisplay('JBSWY3DPEHPK3PXP')
  assert.equal(formatted, 'JBSW Y3DP EHPK 3PXP')
})

test('generateTotpUri generates a valid otpauth uri', () => {
  const uri = generateTotpUri({
    secret: 'JBSWY3DPEHPK3PXP',
    accountName: 'admin@qhse.com',
    issuer: 'QHSE Global',
  })
  assert.ok(uri.includes('otpauth://totp/QHSE%20Global:admin%40qhse.com'))
  assert.ok(uri.includes('secret=JBSWY3DPEHPK3PXP'))
  assert.ok(uri.includes('issuer=QHSE%20Global'))
})

test('generateTotpQrCode generates QR code data URL', async () => {
  const uri = generateTotpUri({
    secret: 'JBSWY3DPEHPK3PXP',
    accountName: 'admin@qhse.com',
  })
  const qrDataUrl = await generateTotpQrCode(uri)
  assert.ok(qrDataUrl.startsWith('data:image/png;base64,'))
})

test('generateTotpCode and verifyTotpCode verify 6-digit TOTP codes accurately', () => {
  const secret = generateTotpSecret(20)
  const now = Math.floor(Date.now() / 1000)

  const code = generateTotpCode(secret, now)
  assert.match(code, /^\d{6}$/)

  // Current code should verify
  assert.equal(verifyTotpCode(code, secret, 1, now), true)

  // Code from previous 30s window should verify within window=1
  const pastCode = generateTotpCode(secret, now - 30)
  assert.equal(verifyTotpCode(pastCode, secret, 1, now), true)

  // Code from next 30s window should verify within window=1
  const futureCode = generateTotpCode(secret, now + 30)
  assert.equal(verifyTotpCode(futureCode, secret, 1, now), true)

  // Code outside window should fail
  const oldCode = generateTotpCode(secret, now - 90)
  assert.equal(verifyTotpCode(oldCode, secret, 1, now), false)

  // Invalid codes should fail
  assert.equal(verifyTotpCode('000000', secret, 1, now), false)
  assert.equal(verifyTotpCode('12345', secret, 1, now), false)
  assert.equal(verifyTotpCode('', secret, 1, now), false)
})
