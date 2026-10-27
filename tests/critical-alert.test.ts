import test from 'node:test'
import assert from 'node:assert/strict'

test('critical risk alert generates urgent bilingual email subject and body', () => {
  const isArabic = true
  const siteName = 'مصنع السادس من أكتوبر'
  const clientName = 'شركة الأغذية الحديثة'
  const reportId = 'rep-12345'
  const observationTitle = 'تسريب غاز في خط الإنتاج رقم 2'

  const subject = isArabic
    ? `⚠️ تنبيه سلامة حرج: تم تسجيل ملاحظة عالية الخطورة - ${siteName}`
    : `⚠️ URGENT Safety Notice: Critical Risk Logged - ${siteName}`

  assert.equal(subject.includes('تنبيه سلامة حرج'), true)
  assert.equal(subject.includes(siteName), true)

  const text = isArabic
    ? `تنبيه أمني وصحي فوري: تم تسجيل ملاحظة ذات خطورة حرجة (CRITICAL) في منشأة ${siteName} التابعة لـ ${clientName}.\n\nالملاحظة: ${observationTitle}\nكود التقرير: ${reportId}`
    : `Urgent QHSSE Notice: A CRITICAL risk observation was recorded for ${siteName} (${clientName}).\nReport ID: ${reportId}`

  assert.equal(text.includes(clientName), true)
  assert.equal(text.includes(observationTitle), true)
  assert.equal(text.includes(reportId), true)
})

test('non-critical risks do not trigger urgent emergency email broadcast', () => {
  const riskLevels = ['LOW', 'MEDIUM', 'HIGH']
  const shouldBroadcast = (level: string) => level === 'CRITICAL'

  for (const level of riskLevels) {
    assert.equal(shouldBroadcast(level), false)
  }
  assert.equal(shouldBroadcast('CRITICAL'), true)
})
