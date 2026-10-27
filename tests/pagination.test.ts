import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPaginationMeta, parsePagination } from '../lib/pagination'

test('requests without pagination stay backward compatible and bounded', () => {
  const pagination = parsePagination(new URLSearchParams())

  assert.equal(pagination.requested, false)
  assert.equal(pagination.page, 1)
  assert.equal(pagination.take, 500)
  assert.equal(pagination.skip, 0)
})

test('page and pageSize are applied and clamped', () => {
  const pagination = parsePagination(new URLSearchParams('page=3&pageSize=25'))

  assert.equal(pagination.requested, true)
  assert.equal(pagination.page, 3)
  assert.equal(pagination.pageSize, 25)
  assert.equal(pagination.skip, 50)
  assert.equal(pagination.take, 25)

  const clamped = parsePagination(new URLSearchParams('page=1&pageSize=9999'))
  assert.equal(clamped.pageSize, 200)
})

test('invalid pagination values fall back to safe defaults', () => {
  const pagination = parsePagination(new URLSearchParams('page=-4&pageSize=abc'))

  assert.equal(pagination.page, 1)
  assert.equal(pagination.pageSize, 50)
  assert.equal(pagination.skip, 0)
})

test('pagination metadata reports boundaries correctly', () => {
  const first = buildPaginationMeta(1, 20, 45)
  assert.equal(first.totalPages, 3)
  assert.equal(first.hasNextPage, true)
  assert.equal(first.hasPreviousPage, false)

  const last = buildPaginationMeta(3, 20, 45)
  assert.equal(last.hasNextPage, false)
  assert.equal(last.hasPreviousPage, true)

  const empty = buildPaginationMeta(1, 20, 0)
  assert.equal(empty.totalPages, 0)
  assert.equal(empty.hasNextPage, false)
})
