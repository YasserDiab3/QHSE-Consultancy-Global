import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseUserAgent,
  extractClientIp,
  normalizeCountryCode,
  getCountryName,
  getGoogleMapsUrl,
  getCountryFlagEmoji,
} from '../lib/geo-device'
import {
  buildUserSessionsCsv,
  type ExportSessionItem,
} from '../lib/export-excel'

test('parseUserAgent correctly detects Windows Desktop Chrome', () => {
  const ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  const info = parseUserAgent(ua)
  assert.equal(info.device, 'Desktop')
  assert.equal(info.os, 'Windows 10/11')
  assert.equal(info.browser, 'Chrome 120')
})

test('parseUserAgent correctly detects iPhone Mobile Safari', () => {
  const ua =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
  const info = parseUserAgent(ua)
  assert.equal(info.device, 'Mobile')
  assert.equal(info.os, 'iOS')
  assert.equal(info.browser, 'Safari 17')
})

test('parseUserAgent correctly detects Android Mobile Chrome', () => {
  const ua =
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.163 Mobile Safari/537.36'
  const info = parseUserAgent(ua)
  assert.equal(info.device, 'Mobile')
  assert.equal(info.os, 'Android')
  assert.equal(info.browser, 'Chrome 119')
})

test('parseUserAgent correctly detects iPad Tablet', () => {
  const ua =
    'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
  const info = parseUserAgent(ua)
  assert.equal(info.device, 'Tablet')
  assert.equal(info.os, 'iOS')
})

test('extractClientIp correctly parses first public IP from x-forwarded-for or real-ip', () => {
  assert.equal(
    extractClientIp('197.34.12.5, 10.0.0.1, 192.168.1.1', undefined),
    '197.34.12.5'
  )
  assert.equal(extractClientIp(undefined, '41.233.15.2'), '41.233.15.2')
  assert.equal(extractClientIp(null, null), undefined)
})

test('normalizeCountryCode clamps 2-letter uppercase codes', () => {
  assert.equal(normalizeCountryCode('eg'), 'EG')
  assert.equal(normalizeCountryCode(' sa '), 'SA')
  assert.equal(normalizeCountryCode('EGY'), undefined)
  assert.equal(normalizeCountryCode(''), undefined)
})

test('getCountryName translates country codes into Arabic and English', () => {
  assert.equal(getCountryName('EG', 'ar'), 'مصر')
  assert.equal(getCountryName('SA', 'ar'), 'المملكة العربية السعودية')
  assert.equal(getCountryName('AE', 'ar'), 'الإمارات العربية المتحدة')
  assert.equal(getCountryName('EG', 'en'), 'Egypt')
  assert.equal(getCountryName('SA', 'en'), 'Saudi Arabia')
  assert.equal(getCountryName(null, 'ar'), 'غير محدد')
})

test('getCountryFlagEmoji returns flag emoji for valid code', () => {
  const flagEg = getCountryFlagEmoji('EG')
  assert.ok(flagEg.length > 0)
  assert.equal(getCountryFlagEmoji(null), '🌐')
})

test('getGoogleMapsUrl generates correct Google Maps query URL', () => {
  assert.equal(
    getGoogleMapsUrl(30.0444, 31.2357),
    'https://www.google.com/maps?q=30.0444,31.2357'
  )
  assert.equal(getGoogleMapsUrl(null, 31.2357), null)
  assert.equal(getGoogleMapsUrl(30.0444, NaN), null)
})

test('buildUserSessionsCsv exports formatted session telemetry with UTF-8 BOM', () => {
  const testSessions: ExportSessionItem[] = [
    {
      id: 'sess-1',
      userId: 'user-1',
      ipAddress: '197.34.12.5',
      countryCode: 'EG',
      countryName: 'مصر',
      region: 'القاهرة',
      city: 'القاهرة',
      latitude: 30.0444,
      longitude: 31.2357,
      device: 'Desktop',
      browser: 'Chrome 120',
      os: 'Windows 10/11',
      status: 'ACTIVE',
      loginAt: '2026-10-29T01:00:00.000Z',
      lastActiveAt: '2026-10-29T01:15:00.000Z',
      googleMapsUrl: 'https://www.google.com/maps?q=30.0444,31.2357',
      user: {
        name: 'أحمد محمود',
        email: 'ahmed@company.com',
        role: 'CLIENT',
        phone: '01012345678',
        client: {
          companyName: 'شركة النيل للصناعات',
          companyNameAr: 'شركة النيل للصناعات',
        },
      },
    },
  ]

  const csvAr = buildUserSessionsCsv(testSessions, 'ar')
  // Check UTF-8 BOM
  assert.ok(csvAr.startsWith('\uFEFF'))
  assert.ok(csvAr.includes('اسم المستخدم'))
  assert.ok(csvAr.includes('أحمد محمود'))
  assert.ok(csvAr.includes('197.34.12.5'))
  assert.ok(csvAr.includes('30.0444'))
  assert.ok(csvAr.includes('شركة النيل للصناعات'))
  assert.ok(csvAr.includes('متصل الآن (Online)'))

  const csvEn = buildUserSessionsCsv(testSessions, 'en')
  assert.ok(csvEn.startsWith('\uFEFF'))
  assert.ok(csvEn.includes('User Name'))
  assert.ok(csvEn.includes('Online'))
})
