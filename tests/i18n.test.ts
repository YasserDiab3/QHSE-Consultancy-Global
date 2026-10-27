import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeLanguage } from '../lib/i18n-config'

test('only Arabic is treated as RTL', () => {
  assert.equal(normalizeLanguage('ar'), 'ar')
  assert.equal(normalizeLanguage('en'), 'en')
  assert.equal(normalizeLanguage('fr'), 'en')
  assert.equal(normalizeLanguage(undefined), 'en')
})
