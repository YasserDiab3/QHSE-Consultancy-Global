import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateSlaDeadline, SLA_DAYS } from '../lib/sla-escalation'

test('SLA_DAYS mapping defines valid durations for all severity levels', () => {
  assert.equal(SLA_DAYS.CRITICAL, 2)
  assert.equal(SLA_DAYS.HIGH, 7)
  assert.equal(SLA_DAYS.MEDIUM, 14)
  assert.equal(SLA_DAYS.LOW, 30)
})

test('calculateSlaDeadline computes valid future deadline for critical risks', () => {
  const base = new Date('2026-05-01T10:00:00Z')
  const criticalDeadline = calculateSlaDeadline(base, 'CRITICAL')
  assert.equal(criticalDeadline.getTime() - base.getTime(), 2 * 24 * 60 * 60 * 1000)

  const highDeadline = calculateSlaDeadline(base, 'HIGH')
  assert.equal(highDeadline.getTime() - base.getTime(), 7 * 24 * 60 * 60 * 1000)
})

test('safety index calculation logic penalizes critical items correctly', () => {
  const computeIndex = (critical: number, high: number, total: number, closed: number) => {
    if (total === 0) return 100
    const closureRate = Math.round((closed / total) * 100)
    const severityRatio = Math.min(1, (critical * 2 + high) / (total * 2))
    return Math.max(10, Math.min(100, Math.round(closureRate * 0.7 + (1 - severityRatio) * 30)))
  }

  // Zero observations = 100
  assert.equal(computeIndex(0, 0, 0, 0), 100)
  // Perfect closure and 0 critical = 100
  assert.equal(computeIndex(0, 0, 10, 10), 100)
  // High critical ratio with low closure gives low safety score (< 50)
  const lowScore = computeIndex(4, 1, 5, 1)
  assert.ok(lowScore < 50)
})
