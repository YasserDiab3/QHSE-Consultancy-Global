import crypto from 'crypto'
import QRCode from 'qrcode'

const RFC4648_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * Encodes a buffer to RFC 4648 Base32 string (without padding)
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]
    bits += 8
    while (bits >= 5) {
      output += RFC4648_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += RFC4648_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

/**
 * Decodes a Base32 string into a Buffer
 */
export function base32Decode(input: string): Buffer {
  const cleanStr = input.toUpperCase().replace(/=+$/, '').replace(/[\s-]/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []

  for (let i = 0; i < cleanStr.length; i++) {
    const val = RFC4648_ALPHABET.indexOf(cleanStr[i])
    if (val === -1) continue // Skip invalid / padding chars
    value = (value << 5) | val
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/**
 * Generates a random Base32 TOTP secret (20 bytes = 160 bits = 32 Base32 chars)
 */
export function generateTotpSecret(byteLength: number = 20): string {
  const randomBytes = crypto.randomBytes(byteLength)
  return base32Encode(randomBytes)
}

/**
 * Formats a Base32 secret for human reading with spaces every 4 characters
 * e.g. "ABCD EFGH IJKL MNOP..."
 */
export function formatSecretForDisplay(secret: string): string {
  const clean = secret.replace(/[\s-]/g, '').toUpperCase()
  return clean.match(/.{1,4}/g)?.join(' ') || clean
}

/**
 * Generates the standard otpauth:// URI for authenticator apps (Google / MS Authenticator)
 */
export function generateTotpUri({
  secret,
  accountName,
  issuer = 'QHSE Global',
}: {
  secret: string
  accountName: string
  issuer?: string
}): string {
  const encodedIssuer = encodeURIComponent(issuer)
  const encodedAccount = encodeURIComponent(accountName)
  const cleanSecret = secret.replace(/[\s-]/g, '').toUpperCase()

  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${cleanSecret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`
}

/**
 * Generates a QR Code as a base64 Data URL (data:image/png;base64,...)
 */
export async function generateTotpQrCode(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  })
}

/**
 * Generates the 6-digit TOTP code for a secret and counter (RFC 6238 / RFC 4226)
 */
export function generateTotpForCounter(secret: string, counter: number): string {
  const secretBuffer = base32Decode(secret)
  if (secretBuffer.length === 0) return ''

  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigInt64BE(BigInt(counter))

  const hmac = crypto.createHmac('sha1', secretBuffer).update(counterBuffer).digest()

  const offset = hmac[hmac.length - 1] & 0x0f
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const otp = binary % 1_000_000
  return otp.toString().padStart(6, '0')
}

/**
 * Generates the current 6-digit TOTP code for a secret
 */
export function generateTotpCode(
  secret: string,
  timestampSeconds: number = Math.floor(Date.now() / 1000),
  stepSeconds: number = 30
): string {
  const counter = Math.floor(timestampSeconds / stepSeconds)
  return generateTotpForCounter(secret, counter)
}

/**
 * Verifies a 6-digit TOTP token against a secret with time drift tolerance
 * @param token The 6-digit token submitted by the user
 * @param secret The Base32 secret string
 * @param window Number of 30-second steps before and after to accept (default: 1 step = ±30s)
 * @param timestampSeconds Current timestamp in seconds
 */
export function verifyTotpCode(
  token: string,
  secret: string,
  window: number = 1,
  timestampSeconds: number = Math.floor(Date.now() / 1000),
  stepSeconds: number = 30
): boolean {
  if (!token || !secret) return false

  const cleanToken = token.trim().replace(/\s+/g, '')
  if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
    return false
  }

  const currentCounter = Math.floor(timestampSeconds / stepSeconds)

  for (let i = -window; i <= window; i++) {
    const counter = currentCounter + i
    const generated = generateTotpForCounter(secret, counter)

    if (generated && generated.length === 6) {
      const match = crypto.timingSafeEqual(
        Buffer.from(cleanToken, 'utf8'),
        Buffer.from(generated, 'utf8')
      )
      if (match) return true
    }
  }

  return false
}
