import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

type Observation = { title: string; titleAr?: string; description?: string; descriptionAr?: string; riskLevel: string; status: string }
type ReportPdfData = {
  id: string; date: string; siteName: string; siteNameAr?: string; category: string; status: string
  notes?: string; notesAr?: string; observations: Observation[]
  assessmentScores?: Record<string, number>
  client?: { companyName?: string; companyNameAr?: string }; consultant?: { name?: string }
}

function repairMojibake(value: string) {
  if (!/[ØÙÃâ]/.test(value)) return value
  try { return decodeURIComponent(escape(value)) } catch { return value }
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (context.measureText(next).width > maxWidth && line) { lines.push(line); line = word } else line = next
  }
  if (line) lines.push(line)
  return lines
}

async function imageData(url: string) {
  const response = await fetch(url)
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Unable to load report logo')); image.src = objectUrl
    })
  } finally { URL.revokeObjectURL(objectUrl) }
}

export async function downloadClientReportPdf(report: ReportPdfData, language: string) {
  await document.fonts.ready
  const isArabic = language === 'ar'
  const canvas = document.createElement('canvas')
  canvas.width = 1240; canvas.height = 1754
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Unable to prepare report export')
  const reportUrl = `${window.location.origin}/dashboard?report=${encodeURIComponent(report.id)}`
  const [logo, qrData] = await Promise.all([imageData(`${window.location.origin}/brand/qhsse-logo-stacked.svg`), QRCode.toDataURL(reportUrl, { width: 180, margin: 1, errorCorrectionLevel: 'M' })])
  const qr = await imageData(qrData)
  const choose = (arabic?: string, english?: string) => repairMojibake(isArabic ? arabic || english || '-' : english || arabic || '-')
  const siteName = choose(report.siteNameAr, report.siteName)
  const company = choose(report.client?.companyNameAr, report.client?.companyName)
  const notes = choose(report.notesAr, report.notes)
  const date = new Date(report.date).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const riskCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  report.observations.forEach((observation) => {
    if (observation.riskLevel in riskCounts) riskCounts[observation.riskLevel as keyof typeof riskCounts] += 1
  })
  const openCount = report.observations.filter((observation) => observation.status !== 'CLOSED' && observation.status !== 'RESOLVED').length
  const complianceScore = Math.max(0, 100 - riskCounts.CRITICAL * 25 - riskCounts.HIGH * 12 - riskCounts.MEDIUM * 5 - riskCounts.LOW * 2)
  const isFoodSafety = report.category === 'FOOD_SAFETY'
  const formCode = isFoodSafety ? 'QHSSE-FS-VISIT-01' : 'QHSSE-VISIT-01'
  const formRevision = 'REV. 01'
  const assessmentScores = report.assessmentScores || {}

  ctx.fillStyle = '#f7f9fc'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#123f31'; ctx.fillRect(0, 0, canvas.width, 250)
  ctx.drawImage(logo, 62, 42, 130, 130)
  ctx.fillStyle = '#fff'; ctx.font = '700 38px Cairo, Arial'; ctx.textAlign = isArabic ? 'right' : 'left'; ctx.direction = isArabic ? 'rtl' : 'ltr'
  ctx.fillText(isArabic ? 'تقرير زيارة العميل' : 'CLIENT VISIT REPORT', isArabic ? 1168 : 220, 92)
  ctx.font = '500 20px Cairo, Arial'; ctx.fillStyle = '#d5f2df'; ctx.fillText('QHSSE CONSULTANT', isArabic ? 1168 : 220, 132)
  ctx.fillStyle = '#123f31'; ctx.fillRect(205, 28, 970, 145)
  ctx.fillStyle = '#fff'; ctx.font = '700 38px Cairo, Arial'; ctx.textAlign = 'center'; ctx.direction = isArabic ? 'rtl' : 'ltr'
  ctx.fillText(isArabic ? 'تقرير زيارة العميل' : 'CLIENT VISIT REPORT', canvas.width / 2, 92)
  ctx.font = '500 20px Cairo, Arial'; ctx.fillStyle = '#d5f2df'; ctx.fillText('QHSSE CONSULTANT', canvas.width / 2, 132)
  ctx.fillStyle = '#d5f2df'; ctx.font = '600 14px Cairo, Arial'; ctx.textAlign = 'center'; ctx.direction = 'ltr'
  ctx.fillText(`${formCode}  •  ${formRevision}`, canvas.width / 2, 184)
  ctx.textAlign = isArabic ? 'right' : 'left'; ctx.direction = isArabic ? 'rtl' : 'ltr'
  ctx.textAlign = isArabic ? 'right' : 'left'
  ctx.fillStyle = '#fff'; ctx.font = '700 34px Cairo, Arial'; ctx.fillText(siteName, isArabic ? 1168 : 62, 310, 1080)
  ctx.fillStyle = '#526072'; ctx.font = '500 18px Cairo, Arial';
  const meta = isArabic ? `العميل: ${company}  |  التاريخ: ${date}  |  التصنيف: ${report.category}  |  الحالة: ${report.status}` : `Client: ${company}  |  Date: ${date}  |  Category: ${report.category}  |  Status: ${report.status}`
  ctx.fillText(meta, isArabic ? 1168 : 62, 352, 1100)
  ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(15,23,42,0.08)'; ctx.shadowBlur = 18; ctx.fillRect(62, 392, 1116, 145); ctx.shadowBlur = 0
  ctx.fillStyle = '#123f31'; ctx.font = '700 20px Cairo, Arial'; ctx.fillText(isArabic ? 'الملخص التنفيذي' : 'EXECUTIVE SUMMARY', isArabic ? 1145 : 88, 430)
  ctx.fillStyle = '#374151'; ctx.font = '500 17px Cairo, Arial'; const noteLines = wrapText(ctx, notes, 1050).slice(0, 3); noteLines.forEach((line, index) => ctx.fillText(line, isArabic ? 1145 : 88, 468 + index * 27))
  const metricY = 570
  const metricLabels = isArabic ? ['درجة التوافق', 'إجمالي الملاحظات', 'نقاط مفتوحة'] : ['COMPLIANCE SCORE', 'TOTAL OBSERVATIONS', 'OPEN POINTS']
  const metricValues = [`${complianceScore}%`, String(report.observations.length), String(openCount)]
  const metricColors = ['#19795c', '#2057a6', '#b45309']
  metricLabels.forEach((label, index) => {
    const x = 62 + index * 375
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(15,23,42,0.07)'; ctx.shadowBlur = 12; ctx.fillRect(x, metricY, 350, 92); ctx.shadowBlur = 0
    ctx.fillStyle = metricColors[index]; ctx.fillRect(x, metricY, 7, 92)
    ctx.fillStyle = '#64748b'; ctx.font = '600 14px Cairo, Arial'; ctx.fillText(label, isArabic ? x + 325 : x + 25, metricY + 30)
    ctx.fillStyle = '#0f172a'; ctx.font = '700 30px Cairo, Arial'; ctx.fillText(metricValues[index], isArabic ? x + 325 : x + 25, metricY + 70)
  })
  const chartY = 690
  ctx.fillStyle = '#123f31'; ctx.font = '700 18px Cairo, Arial'; ctx.fillText(isArabic ? 'توزيع مستوى المخاطر' : 'RISK DISTRIBUTION', isArabic ? 1178 : 62, chartY)
  const levels: Array<keyof typeof riskCounts> = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
  const colors = ['#dc2626', '#f97316', '#eab308', '#16a34a']
  levels.forEach((level, index) => {
    const x = 62 + index * 275; const count = riskCounts[level]; const barWidth = Math.max(12, Math.min(190, count * 35))
    ctx.fillStyle = '#e8eef0'; ctx.fillRect(x, chartY + 20, 190, 16); ctx.fillStyle = colors[index]; ctx.fillRect(isArabic ? x + 190 - barWidth : x, chartY + 20, barWidth, 16)
    ctx.fillStyle = '#475569'; ctx.font = '600 13px Cairo, Arial'; ctx.textAlign = isArabic ? 'right' : 'left'; ctx.fillText(`${level}: ${count}`, isArabic ? x + 190 : x, chartY + 58)
  })
  if (isFoodSafety) {
    const assessmentY = 780
    const items = isArabic ? ['الموقع', 'العاملون', 'المستندات والسجلات', 'المعدات', 'البنية التحتية', 'الاستلام والتخزين'] : ['Site', 'Employees', 'Documents & records', 'Equipment', 'Infrastructure', 'Receiving & storage']
    const itemKeys = ['site', 'employees', 'documents', 'equipment', 'infrastructure', 'storage']
    ctx.fillStyle = '#123f31'; ctx.font = '700 17px Cairo, Arial'; ctx.fillText(isArabic ? 'تقييم التوافق المبدئي لسلامة الغذاء' : 'FOOD SAFETY COMPLIANCE ASSESSMENT', isArabic ? 1178 : 62, assessmentY)
    ctx.fillStyle = '#f7d93b'; ctx.fillRect(62, assessmentY + 15, 1116, 32); ctx.fillStyle = '#1f2937'; ctx.font = '700 13px Cairo, Arial'
    const heads = isArabic ? ['م', 'البند', 'النسبة الحالية', 'النسبة المطلوبة'] : ['#', 'ASSESSMENT ITEM', 'CURRENT', 'TARGET']
    const headX = isArabic ? [1140, 820, 360, 135] : [88, 160, 850, 1060]
    heads.forEach((head, index) => ctx.fillText(head, headX[index], assessmentY + 37))
    items.forEach((item, index) => {
      const rowY = assessmentY + 47 + index * 29; const current = assessmentScores[itemKeys[index]] ?? Math.max(0, complianceScore - (index % 3) * 3)
      ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#eff6f2'; ctx.fillRect(62, rowY, 1116, 29); ctx.strokeStyle = '#dbe4df'; ctx.strokeRect(62, rowY, 1116, 29)
      ctx.fillStyle = '#334155'; ctx.font = '500 12px Cairo, Arial'
      if (isArabic) { ctx.fillText(String(index + 1), 1140, rowY + 20); ctx.fillText(item, 820, rowY + 20); ctx.fillText(`${current}%`, 360, rowY + 20); ctx.fillText('85%', 135, rowY + 20) }
      else { ctx.fillText(String(index + 1), 88, rowY + 20); ctx.fillText(item, 160, rowY + 20); ctx.fillText(`${current}%`, 850, rowY + 20); ctx.fillText('85%', 1060, rowY + 20) }
    })
  }
  let y = isFoodSafety ? 1030 : 780
  ctx.fillStyle = '#123f31'; ctx.fillRect(62, y, 1116, 48); ctx.fillStyle = '#fff'; ctx.font = '700 16px Cairo, Arial'
  const headers = isArabic ? ['#', 'الملاحظة', 'مستوى الخطورة', 'الحالة'] : ['#', 'OBSERVATION', 'RISK LEVEL', 'STATUS']
  const columns = isArabic ? [1140, 850, 300, 110] : [95, 165, 870, 1050]
  headers.forEach((header, index) => ctx.fillText(header, columns[index], y + 31))
  y += 48
  if (report.observations.length === 0) {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(62, y, 1116, 90); ctx.strokeStyle = '#dbe4df'; ctx.strokeRect(62, y, 1116, 90)
    ctx.fillStyle = '#64748b'; ctx.font = '500 18px Cairo, Arial'; ctx.textAlign = 'center'
    ctx.fillText(isArabic ? 'لا توجد ملاحظات مسجلة في هذا التقرير بعد' : 'No observations have been recorded for this report yet.', canvas.width / 2, y + 53)
  }
  report.observations.forEach((observation, index) => {
    const observationTitle = choose(observation.titleAr, observation.title)
    const lines = wrapText(ctx, observationTitle, 620).slice(0, 2)
    const rowHeight = Math.max(58, 22 + lines.length * 24)
    if (y + rowHeight > (isFoodSafety ? 1480 : 1580)) return
    ctx.fillStyle = index % 2 === 0 ? '#ffffff' : '#eff6f2'; ctx.fillRect(62, y, 1116, rowHeight)
    ctx.strokeStyle = '#dbe4df'; ctx.strokeRect(62, y, 1116, rowHeight)
    ctx.fillStyle = '#1f2937'; ctx.font = '500 16px Cairo, Arial'
    if (isArabic) {
      ctx.fillText(String(index + 1), 1140, y + 34); lines.forEach((line, lineIndex) => ctx.fillText(line, 850, y + 27 + lineIndex * 23)); ctx.fillText(observation.riskLevel, 300, y + 34); ctx.fillText(observation.status, 110, y + 34)
    } else {
      ctx.fillText(String(index + 1), 95, y + 34); lines.forEach((line, lineIndex) => ctx.fillText(line, 165, y + 27 + lineIndex * 23)); ctx.fillText(observation.riskLevel, 870, y + 34); ctx.fillText(observation.status, 1050, y + 34)
    }
    y += rowHeight
  })
  ctx.drawImage(qr, canvas.width / 2 - 55, 1515, 110, 110); ctx.fillStyle = '#123f31'; ctx.font = '700 14px Cairo, Arial'; ctx.textAlign = 'center'; ctx.direction = 'ltr'; ctx.fillText('SCAN TO OPEN REPORT', canvas.width / 2, 1648)
  ctx.textAlign = isArabic ? 'right' : 'left'; ctx.direction = isArabic ? 'rtl' : 'ltr'; ctx.fillStyle = '#64748b'; ctx.font = '500 13px Cairo, Arial'; ctx.fillText(isArabic ? `رمز التقرير: ${report.id}` : `Report reference: ${report.id}`, isArabic ? 1168 : 62, 1680)
  ctx.fillText('QHSSE Consultant • Safety • Quality • Environment', isArabic ? 1168 : 62, 1712)
  ctx.fillStyle = '#f7f9fc'; ctx.fillRect(0, 1630, canvas.width, 124)
  ctx.fillStyle = '#123f31'; ctx.font = '700 14px Cairo, Arial'; ctx.textAlign = 'center'; ctx.direction = 'ltr'; ctx.fillText('SCAN TO OPEN REPORT', canvas.width / 2, 1648)
  ctx.fillStyle = '#64748b'; ctx.font = '500 13px Cairo, Arial'; ctx.fillText(`${formCode}  •  ${formRevision}  •  ${report.id}`, canvas.width / 2, 1674)
  ctx.fillText('QHSSE Consultant • Safety • Quality • Environment', canvas.width / 2, 1708)
  const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] })
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, canvas.width, canvas.height)
  pdf.save(`qhsse-report-${report.id}.pdf`)
}
