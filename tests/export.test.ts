import test from 'node:test'
import assert from 'node:assert/strict'
import {
  escapeCsvCell,
  buildObservationsMatrixCsv,
  extractObservationsFromReports,
  MatrixObservationItem,
  ReportWithObservations,
} from '../lib/export-excel'

test('escapeCsvCell prevents spreadsheet formula injection', () => {
  assert.equal(escapeCsvCell('=1+1'), `"'=1+1"`)
  assert.equal(escapeCsvCell('+cmd|/c calc'), ` "'+cmd|/c calc"`.trim())
  assert.equal(escapeCsvCell('-SUM(A1:A10)'), ` "'-SUM(A1:A10)"`.trim())
  assert.equal(escapeCsvCell('@echo off'), ` "'@echo off"`.trim())
})

test('escapeCsvCell correctly escapes double quotes and handles nulls', () => {
  assert.equal(escapeCsvCell('Hello "World"'), `"Hello ""World"""`)
  assert.equal(escapeCsvCell(null), '""')
  assert.equal(escapeCsvCell(undefined), '""')
})

test('buildObservationsMatrixCsv prepends UTF-8 BOM and outputs valid Arabic structure', () => {
  const mockObservations: MatrixObservationItem[] = [
    {
      id: 'obs-001',
      title: 'تسرب مياه في منطقة الإنتاج',
      titleAr: 'تسرب مياه في منطقة الإنتاج',
      description: 'تسرب أسفل خط التعبئة رقم 2',
      riskLevel: 'CRITICAL',
      status: 'OPEN',
      reportDate: '2026-10-27T10:00:00.000Z',
      siteName: 'Main Factory',
      siteNameAr: 'المصنع الرئيسي',
      category: 'FOOD_SAFETY',
      clientResponse: 'تم توجيه فريق الصيانة للتعامل الفوري',
      correctiveAction: 'استبدال مانع التسرب وتنظيف الأرضية',
      correctiveActionStatus: 'IN_PROGRESS',
      imagesCount: 2,
    },
  ]

  const csv = buildObservationsMatrixCsv(mockObservations, 'ar')

  // Verify UTF-8 BOM is at index 0
  assert.equal(csv.charCodeAt(0), 0xfeff)

  // Verify Arabic headers are present
  assert.ok(csv.includes('"م"'))
  assert.ok(csv.includes('"كود الملاحظة"'))
  assert.ok(csv.includes('"تاريخ التقرير"'))
  assert.ok(csv.includes('"الموقع / المنشأة"'))
  assert.ok(csv.includes('"مستوى الخطورة"'))

  // Verify Arabic content is rendered
  assert.ok(csv.includes('"المصنع الرئيسي"'))
  assert.ok(csv.includes('"حرجة جداً (Critical)"'))
  assert.ok(csv.includes('"تسرب مياه في منطقة الإنتاج"'))
  assert.ok(csv.includes('"2026-10-27"'))
})

test('buildObservationsMatrixCsv outputs English headers when requested', () => {
  const mockObservations: MatrixObservationItem[] = [
    {
      id: 'obs-002',
      title: 'Missing Fire Extinguisher',
      riskLevel: 'HIGH',
      status: 'CLOSED',
      reportDate: '2026-10-25',
      siteName: 'Warehouse 4',
      category: 'FIRE_SAFETY',
    },
  ]

  const csv = buildObservationsMatrixCsv(mockObservations, 'en')

  assert.equal(csv.charCodeAt(0), 0xfeff)
  assert.ok(csv.includes('"Observation ID"'))
  assert.ok(csv.includes('"Site / Facility"'))
  assert.ok(csv.includes('"High"'))
  assert.ok(csv.includes('"Closed"'))
})

test('extractObservationsFromReports combines observations across reports', () => {
  const reports: ReportWithObservations[] = [
    {
      id: 'rep-1',
      date: '2026-10-20',
      siteName: 'Site Alpha',
      category: 'GENERAL_SAFETY',
      status: 'COMPLETED',
      observations: [
        { id: 'obs-1', title: 'Obs 1', riskLevel: 'LOW', status: 'OPEN' },
        { id: 'obs-2', title: 'Obs 2', riskLevel: 'MEDIUM', status: 'CLOSED' },
      ],
    },
    {
      id: 'rep-2',
      date: '2026-10-22',
      siteName: 'Site Beta',
      category: 'FIRE_SAFETY',
      status: 'OPEN',
      observations: [
        { id: 'obs-3', title: 'Obs 3', riskLevel: 'HIGH', status: 'OPEN' },
      ],
    },
  ]

  const extracted = extractObservationsFromReports(reports)
  assert.equal(extracted.length, 3)
  assert.equal(extracted[0].siteName, 'Site Alpha')
  assert.equal(extracted[2].siteName, 'Site Beta')
})
