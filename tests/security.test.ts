import test from 'node:test'
import assert from 'node:assert/strict'
import { anonymizeIpAddress } from '../lib/privacy'
import { parseStorageUrl } from '../lib/storage'

test('IPv4 addresses keep only the network prefix', () => {
  assert.equal(anonymizeIpAddress('192.168.10.42'), '192.168.10.0')
  assert.equal(anonymizeIpAddress('  10.20.30.40  '), '10.20.30.0')
})

test('IPv6 addresses are truncated to three groups', () => {
  assert.equal(anonymizeIpAddress('2001:db8:85a3:8d3:1319:8a2e:370:7348'), '2001:db8:85a3::')
})

test('invalid or missing addresses are discarded', () => {
  assert.equal(anonymizeIpAddress(), undefined)
  assert.equal(anonymizeIpAddress(''), undefined)
  assert.equal(anonymizeIpAddress('not-an-ip'), undefined)
  assert.equal(anonymizeIpAddress('1.2.3'), undefined)
})

test('storage URLs parse into bucket and object path', () => {
  assert.deepEqual(parseStorageUrl('/api/files/qhsse-documents/resumes/2026/report.pdf'), {
    bucket: 'qhsse-documents',
    path: 'resumes/2026/report.pdf',
  })
})

test('storage parser rejects unsafe or foreign URLs', () => {
  assert.equal(parseStorageUrl('https://example.com/file.pdf'), null)
  assert.equal(parseStorageUrl('/api/files/'), null)
  assert.equal(parseStorageUrl('/api/files/bucket/../secret'), null)
})
