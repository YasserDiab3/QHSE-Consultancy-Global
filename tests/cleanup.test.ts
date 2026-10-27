import test from 'node:test'
import assert from 'node:assert/strict'

test('cleanup retention cutoff calculates correct past timestamp', () => {
  const retentionDays = 90
  const now = new Date('2026-10-27T12:00:00.000Z')
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000)

  assert.equal(cutoff.toISOString(), '2026-07-29T12:00:00.000Z')
  assert.equal(now > cutoff, true)
})

test('cleanup allows configurable retention window between 1 and 365 days', () => {
  const clampRetention = (value: number | null | undefined, fallback = 90) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback
    return Math.max(1, Math.min(365, Math.floor(value)))
  }

  assert.equal(clampRetention(30), 30)
  assert.equal(clampRetention(0), 1)
  assert.equal(clampRetention(500), 365)
  assert.equal(clampRetention(undefined), 90)
})
