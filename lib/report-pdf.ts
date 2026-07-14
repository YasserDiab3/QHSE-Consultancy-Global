import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

type Observation = { title: string; titleAr?: string; description?: string; descriptionAr?: string; riskLevel: string; status: string }
type ReportPdfData = {
  id: string; date: string; siteName: string; siteNameAr?: string; category: string; status: string
  notes?: string; notesAr?: string; observations: Observation[]
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

  ctx.fillStyle = '#f7f9fc'; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#123f31'; ctx.fillRect(0, 0, canvas.width, 250)
  ctx.drawImage(logo, 62, 42, 130, 130)
  ctx.fillStyle = '#fff'; ctx.font = '700 38px Cairo, Arial'; ctx.textAlign = isArabic ? 'right' : 'left'; ctx.direction = isArabic ? 'rtl' : 'ltr'
  ctx.fillText(isArabic ? 'تقرير زيارة العميل' : 'CLIENT VISIT REPORT', isArabic ? 1168 : 220, 92)
  ctx.font = '500 20px Cairo, Arial'; ctx.fillStyle = '#d5f2df'; ctx.fillText('QHSSE CONSULTANT', isArabic ? 1168 : 220, 132)
  ctx.fillStyle = '#fff'; ctx.font = '700 34px Cairo, Arial'; ctx.fillText(siteName, isArabic ? 1168 : 62, 310, 1080)
  ctx.fillStyle = '#526072'; ctx.font = '500 18px Cairo, Arial';
  const meta = isArabic ? `العميل: ${company}  |  التاريخ: ${date}  |  التصنيف: ${report.category}  |  الحالة: ${report.status}` : `Client: ${company}  |  Date: ${date}  |  Category: ${report.category}  |  Status: ${report.status}`
  ctx.fillText(meta, isArabic ? 1168 : 62, 352, 1100)
  ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(15,23,42,0.08)'; ctx.shadowBlur = 18; ctx.fillRect(62, 392, 1116, 145); ctx.shadowBlur = 0
  ctx.fillStyle = '#123f31'; ctx.font = '700 20px Cairo, Arial'; ctx.fillText(isArabic ? 'الملخص التنفيذي' : 'EXECUTIVE SUMMARY', isArabic ? 1145 : 88, 430)
  ctx.fillStyle = '#374151'; ctx.font = '500 17px Cairo, Arial'; const noteLines = wrapText(ctx, notes, 1050).slice(0, 3); noteLines.forEach((line, index) => ctx.fillText(line, isArabic ? 1145 : 88, 468 + index * 27))
  let y = 590
  ctx.fillStyle = '#123f31'; ctx.fillRect(62, y, 1116, 48); ctx.fillStyle = '#fff'; ctx.font = '700 16px Cairo, Arial'
  const headers = isArabic ? ['#', 'الملاحظة', 'مستوى الخطورة', 'الحالة'] : ['#', 'OBSERVATION', 'RISK LEVEL', 'STATUS']
  const columns = isArabic ? [1140, 850, 300, 110] : [95, 165, 870, 1050]
  headers.forEach((header, index) => ctx.fillText(header, columns[index], y + 31))
  y += 48
  report.observations.forEach((observation, index) => {
    const observationTitle = choose(observation.titleAr, observation.title)
    const lines = wrapText(ctx, observationTitle, 620).slice(0, 2)
    const rowHeight = Math.max(58, 22 + lines.length * 24)
    if (y + rowHeight > 1580) return
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
  ctx.drawImage(qr, 910, 1530, 110, 110); ctx.fillStyle = '#123f31'; ctx.font = '700 14px Cairo, Arial'; ctx.textAlign = 'center'; ctx.direction = 'ltr'; ctx.fillText('SCAN TO OPEN REPORT', 965, 1662)
  ctx.textAlign = isArabic ? 'right' : 'left'; ctx.direction = isArabic ? 'rtl' : 'ltr'; ctx.fillStyle = '#64748b'; ctx.font = '500 13px Cairo, Arial'; ctx.fillText(isArabic ? `رمز التقرير: ${report.id}` : `Report reference: ${report.id}`, isArabic ? 1168 : 62, 1680)
  ctx.fillText('QHSSE Consultant • Safety • Quality • Environment', isArabic ? 1168 : 62, 1712)
  const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] })
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, canvas.width, canvas.height)
  pdf.save(`qhsse-report-${report.id}.pdf`)
}
