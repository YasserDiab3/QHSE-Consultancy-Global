import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import manifest from '../app/manifest'

test('PWA Manifest: Manifest conforms to W3C PWA specification', () => {
  const m = manifest()

  assert.equal(typeof m.name, 'string')
  assert.ok(m.name ? m.name.includes('QHSSE') : false)
  assert.equal(m.short_name, 'QHSSE')
  assert.equal(m.display, 'standalone')
  assert.equal(m.theme_color, '#1e40af')
  assert.equal(m.background_color, '#0f172a')
  assert.equal(m.start_url, '/')

  // Icons validation
  assert.ok(Array.isArray(m.icons), 'icons must be an array')
  assert.ok(m.icons.length >= 3, 'at least 3 icon variants required')

  const has192 = m.icons.some((icon) => icon.sizes === '192x192' && icon.src.includes('192'))
  const has512 = m.icons.some((icon) => icon.sizes === '512x512' && icon.src.includes('512'))
  const hasMaskable = m.icons.some((icon) => icon.purpose === 'maskable')

  assert.ok(has192, 'Manifest must have a 192x192 icon')
  assert.ok(has512, 'Manifest must have a 512x512 icon')
  assert.ok(hasMaskable, 'Manifest must have a maskable icon for Android adaptive icons')
})

test('PWA Assets: Icons exist on disk with non-zero size', () => {
  const iconsPath = path.join(process.cwd(), 'public', 'icons')

  const requiredIcons = [
    'icon-192.png',
    'icon-512.png',
    'icon-maskable-512.png',
    'apple-touch-icon.png',
  ]

  for (const filename of requiredIcons) {
    const fullPath = path.join(iconsPath, filename)
    assert.ok(fs.existsSync(fullPath), `Icon file ${filename} must exist on disk`)
    const stats = fs.statSync(fullPath)
    assert.ok(stats.size > 500, `Icon file ${filename} must have substantial content`)
  }
})

test('PWA Service Worker: Service worker file is present and configured', () => {
  const swPath = path.join(process.cwd(), 'public', 'sw.js')
  assert.ok(fs.existsSync(swPath), 'public/sw.js must exist')

  const swContent = fs.readFileSync(swPath, 'utf8')
  assert.ok(swContent.includes('CACHE_NAME'), 'SW must define CACHE_NAME')
  assert.ok(swContent.includes('STATIC_ASSETS'), 'SW must define pre-cached assets')
  assert.ok(swContent.includes('addEventListener(\'install\''), 'SW must handle install event')
  assert.ok(swContent.includes('addEventListener(\'fetch\''), 'SW must intercept network requests')
  assert.ok(swContent.includes('skipWaiting'), 'SW must support skipWaiting')
})

test('Offline Field Inspection Data Invariants: Observation & Report structure', () => {
  const sampleOfflineDraft = {
    id: 'draft-test-123',
    clientId: 'client-uuid-456',
    clientName: 'مصنع الأهرام للأغذية',
    siteName: 'خط إنتاج الصلصة',
    date: '2026-10-30',
    category: 'FOOD_SAFETY',
    status: 'OPEN',
    syncStatus: 'PENDING_SYNC',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    observations: [
      {
        id: 'obs-1',
        title: 'عدم ارتداء قفازات معقمة في منطقة التعبئة الحرجة',
        riskLevel: 'HIGH',
        status: 'OPEN',
        images: [
          {
            id: 'img-1',
            type: 'BEFORE',
            dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            name: 'packaging-line.png',
            mimeType: 'image/png',
            size: 68,
          },
        ],
      },
    ],
  }

  assert.equal(sampleOfflineDraft.syncStatus, 'PENDING_SYNC')
  assert.equal(sampleOfflineDraft.observations.length, 1)
  assert.equal(sampleOfflineDraft.observations[0].images.length, 1)
  assert.ok(sampleOfflineDraft.observations[0].images[0].dataUrl.startsWith('data:image/'))
})
