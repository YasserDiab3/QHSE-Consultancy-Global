import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateSlaDeadline,
  checkSlaEscalations,
  SLA_DAYS,
} from '../lib/sla-escalation'

test('calculateSlaDeadline computes correct deadlines based on risk level', () => {
  const baseDate = new Date('2026-10-01T00:00:00.000Z')

  const criticalDeadline = calculateSlaDeadline(baseDate, 'CRITICAL')
  assert.equal(
    criticalDeadline.getTime() - baseDate.getTime(),
    SLA_DAYS.CRITICAL * 24 * 60 * 60 * 1000
  )

  const highDeadline = calculateSlaDeadline(baseDate, 'HIGH')
  assert.equal(
    highDeadline.getTime() - baseDate.getTime(),
    SLA_DAYS.HIGH * 24 * 60 * 60 * 1000
  )

  const mediumDeadline = calculateSlaDeadline(baseDate, 'MEDIUM')
  assert.equal(
    mediumDeadline.getTime() - baseDate.getTime(),
    SLA_DAYS.MEDIUM * 24 * 60 * 60 * 1000
  )

  const lowDeadline = calculateSlaDeadline(baseDate, 'LOW')
  assert.equal(
    lowDeadline.getTime() - baseDate.getTime(),
    SLA_DAYS.LOW * 24 * 60 * 60 * 1000
  )
})

test('checkSlaEscalations returns valid structured metrics without crashing', async () => {
  const res = await checkSlaEscalations({ sendEmails: false })
  assert.equal(typeof res.checkedCount, 'number')
  assert.equal(typeof res.approachingCount, 'number')
  assert.equal(typeof res.overdueCount, 'number')
  assert.equal(Array.isArray(res.alerts), true)
  assert.equal(res.emailsSent, 0)
})
