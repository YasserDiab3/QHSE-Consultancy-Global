import test from 'node:test'
import assert from 'node:assert/strict'
import {
  tafqitArabic,
  parseFinancialRecord,
  serializeFinancialDetails,
  formatFinancialAmount,
} from '../lib/financial-records'

test('Tafqit converts amounts into professional Arabic words', () => {
  assert.equal(
    tafqitArabic(77000, 'EGP'),
    'فقط سبعة وسبعون ألف جنيه مصري لا غير'
  )
  assert.equal(
    tafqitArabic(1000, 'EGP'),
    'فقط ألف جنيه مصري لا غير'
  )
  assert.equal(
    tafqitArabic(250000, 'SAR'),
    'فقط مائتان وخمسون ألف ريال سعودي لا غير'
  )
  assert.equal(
    tafqitArabic(0, 'EGP'),
    'فقط صفر لا غير'
  )
})

test('parseFinancialRecord handles legacy records gracefully', () => {
  const legacyRecord = {
    id: 'f-1234-uuid',
    clientId: 'c-client-1',
    title: 'فاتورة نهائية',
    amount: 77000,
    currency: 'EGP',
    status: 'PENDING',
    dueDate: '2026-11-01',
    notes: 'ملاحظات سداد سابقة',
    createdAt: '2026-10-25T10:00:00.000Z',
  }

  const parsed = parseFinancialRecord(legacyRecord)
  assert.equal(parsed.title, 'فاتورة نهائية')
  assert.equal(parsed.amount, 77000)
  assert.equal(parsed.status, 'PENDING')
  assert.equal(parsed.details.subtotal, 77000)
  assert.equal(parsed.details.paidAmount, 0)
  assert.equal(parsed.details.remainingAmount, 77000)
  assert.equal(parsed.details.notesText, 'ملاحظات سداد سابقة')
  assert.equal(parsed.details.items.length, 1)
  assert.ok(parsed.details.invoiceNumber.startsWith('INV-2026-'))
})

test('parseFinancialRecord handles rich structured items and tax calculation', () => {
  const richNotes = serializeFinancialDetails({
    invoiceNumber: 'INV-2026-0042',
    invoiceDate: '2026-10-29',
    serviceType: 'CIVIL_DEFENSE',
    items: [
      { id: '1', description: 'إعداد خطة الدفاع المدني', quantity: 1, unitPrice: 50000, total: 50000 },
      { id: '2', description: 'توريد وتركيب أجهزة إنذار', quantity: 2, unitPrice: 10000, total: 20000 },
    ],
    taxRate: 14,
    taxAmount: 9800,
    discount: 2000,
    paidAmount: 30000,
    paymentMethod: 'BANK_TRANSFER',
    paymentReference: 'TRX-100293',
    terms: 'السداد خلال 10 أيام عمل',
  })

  const record = {
    id: 'f-456',
    clientId: 'c-client-1',
    title: 'تطوير اشتراطات الحماية المدنية',
    amount: 77800,
    currency: 'EGP',
    status: 'PARTIAL',
    dueDate: '2026-11-15',
    notes: richNotes,
    createdAt: '2026-10-29T00:00:00.000Z',
  }

  const parsed = parseFinancialRecord(record)
  assert.equal(parsed.details.invoiceNumber, 'INV-2026-0042')
  assert.equal(parsed.details.subtotal, 70000)
  assert.equal(parsed.details.taxAmount, 9800)
  assert.equal(parsed.details.discount, 2000)
  assert.equal(parsed.details.totalAmount, 77800)
  assert.equal(parsed.details.paidAmount, 30000)
  assert.equal(parsed.details.remainingAmount, 47800)
  assert.equal(parsed.status, 'PARTIAL')
})

test('formatFinancialAmount formats numbers with comma and currency', () => {
  assert.equal(formatFinancialAmount(77000, 'EGP'), '77,000.00 EGP')
  assert.equal(formatFinancialAmount(1250.5, 'USD'), '1,250.50 USD')
})
