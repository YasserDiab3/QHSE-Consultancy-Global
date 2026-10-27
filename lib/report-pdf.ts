import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

type Observation = {
  title: string
  titleAr?: string
  description?: string
  descriptionAr?: string
  riskLevel: string
  status: string
}

type ReportPdfData = {
  id: string
  date: string
  siteName: string
  siteNameAr?: string
  category: string
  status: string
  notes?: string
  notesAr?: string
  observations: Observation[]
  assessmentScores?: Record<string, number>
  client?: { companyName?: string; companyNameAr?: string }
  consultant?: { name?: string }
}

const PAGE_WIDTH = 1240
const PAGE_HEIGHT = 1754
const FOOTER_LINE_Y = 1536
const MAX_ROWS_Y = 1470

const assessmentItems = [
  { key: 'site', ar: 'الموقع', en: 'Site' },
  { key: 'employees', ar: 'العاملون', en: 'Employees' },
  { key: 'documents', ar: 'المستندات والسجلات', en: 'Documents & records' },
  { key: 'equipment', ar: 'المعدات', en: 'Equipment' },
  { key: 'infrastructure', ar: 'البنية التحتية', en: 'Infrastructure' },
  { key: 'storage', ar: 'الاستلام والتخزين', en: 'Receiving & storage' },
] as const

function repairMojibake(value: string) {
  if (!/[ÃØÙ]/.test(value)) return value
  try {
    return decodeURIComponent(escape(value))
  } catch {
    return value
  }
}

function clampScore(value: unknown, fallback: number) {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric))) : fallback
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

async function imageData(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Unable to load report branding')
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Unable to load report image'))
      image.src = objectUrl
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function drawBox(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color = '#ffffff') {
  context.fillStyle = color
  context.fillRect(x, y, width, height)
  context.strokeStyle = '#d9dfdd'
  context.lineWidth = 1
  context.strokeRect(x, y, width, height)
}

export async function downloadClientReportPdf(report: ReportPdfData, language: string) {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    throw new Error('PDF export is only available in the browser')
  }

  await document.fonts?.ready
  const isArabic = language === 'ar'
  const reportUrl = `${window.location.origin}/dashboard?report=${encodeURIComponent(report.id)}`
  const [logoResult, qrResult] = await Promise.allSettled([
    imageData(`${window.location.origin}/brand/qhsse-logo-stacked.svg`),
    QRCode.toDataURL(reportUrl, { width: 180, margin: 1, errorCorrectionLevel: 'M' }).then(imageData),
  ])
  const logo = logoResult.status === 'fulfilled' ? logoResult.value : undefined
  const qr = qrResult.status === 'fulfilled' ? qrResult.value : undefined
  const observations = Array.isArray(report.observations) ? report.observations : []

  const value = (arabic?: string, english?: string) =>
    repairMojibake(isArabic ? arabic || english || '-' : english || arabic || '-')
  const siteName = value(report.siteNameAr, report.siteName)
  const company = value(report.client?.companyNameAr, report.client?.companyName)
  const notes = value(report.notesAr, report.notes)
  const visitDate = new Date(report.date).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const risks = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  observations.forEach((item) => {
    if (item.riskLevel in risks) risks[item.riskLevel as keyof typeof risks] += 1
  })
  const openPoints = observations.filter((item) => !['CLOSED', 'RESOLVED'].includes(item.status)).length
  const weightedScore = Math.max(0, 100 - risks.CRITICAL * 25 - risks.HIGH * 12 - risks.MEDIUM * 5 - risks.LOW * 2)
  const isFoodSafety = report.category === 'FOOD_SAFETY'
  const formCode = isFoodSafety ? 'QHSSE-FS-VISIT-01' : 'QHSSE-VISIT-01'
  const scores = report.assessmentScores || {}
  const pages: HTMLCanvasElement[] = []

  let context: CanvasRenderingContext2D | null = null
  const canvas = document.createElement('canvas')

  const startPage = () => {
    canvas.width = PAGE_WIDTH
    canvas.height = PAGE_HEIGHT
    context = canvas.getContext('2d')
    if (!context) throw new Error('Unable to prepare report export')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
    return context
  }

  startPage()

  const text = (font: string, color: string, align: CanvasTextAlign = isArabic ? 'right' : 'left') => {
    if (!context) return
    context.font = font
    context.fillStyle = color
    context.textAlign = align
    context.direction = isArabic ? 'rtl' : 'ltr'
  }
  const write = (content: string, x: number, y: number, width?: number) => {
    if (!context) return
    context.fillText(content, x, y, width)
  }

  const drawTableHeader = (top: number) => {
    if (!context) return top
    context.fillStyle = '#bdbdbd'
    context.fillRect(62, top, 1116, 36)
    const headers = isArabic
      ? ['م', 'الملاحظة', 'مستوى الخطورة', 'الحالة']
      : ['#', 'Observation', 'Risk level', 'Status']
    const columns = isArabic ? [1140, 795, 355, 135] : [90, 165, 850, 1060]
    text('700 14px Cairo, Arial', '#151515', isArabic ? 'right' : 'left')
    headers.forEach((header, index) => write(header, columns[index], top + 24))
    return top + 36
  }

  const drawContinuationHeader = () => {
    if (!context) return
    if (logo) {
      context.drawImage(logo, 62, 34, 74, 74)
    }
    text('700 24px Cairo, Arial', '#555555', 'center')
    context.direction = 'ltr'
    write(isArabic ? 'تقرير زيارة — متابعة' : 'VISIT REPORT — CONTINUED', PAGE_WIDTH / 2, 58)
    text('600 14px Cairo, Arial', '#777777', 'center')
    write(company, PAGE_WIDTH / 2, 84, 760)
    write(siteName, PAGE_WIDTH / 2, 106, 760)
    context.fillStyle = '#cfcfcf'
    context.fillRect(42, 126, 1156, 2)
  }

  const drawFooter = (pageContext: CanvasRenderingContext2D, pageNumber: number, totalPages: number) => {
    pageContext.fillStyle = '#777777'
    pageContext.fillRect(62, FOOTER_LINE_Y, 1116, 3)
    if (qr) {
      pageContext.drawImage(qr, PAGE_WIDTH / 2 - 50, FOOTER_LINE_Y + 14, 100, 100)
    } else {
      pageContext.strokeStyle = '#777777'
      pageContext.lineWidth = 2
      pageContext.strokeRect(PAGE_WIDTH / 2 - 50, FOOTER_LINE_Y + 14, 100, 100)
      pageContext.font = '700 12px Arial'
      pageContext.fillStyle = '#555555'
      pageContext.textAlign = 'center'
      pageContext.fillText('VERIFY', PAGE_WIDTH / 2, FOOTER_LINE_Y + 70)
    }
    pageContext.fillStyle = '#303030'
    pageContext.font = '700 13px Cairo, Arial'
    pageContext.textAlign = 'center'
    pageContext.direction = 'ltr'
    pageContext.fillText('SCAN TO OPEN REPORT', PAGE_WIDTH / 2, FOOTER_LINE_Y + 134)
    pageContext.fillStyle = '#666666'
    pageContext.font = '500 13px Cairo, Arial'
    pageContext.fillText(
      `${formCode}  •  REV. 01  •  Page ${pageNumber} of ${totalPages}`,
      PAGE_WIDTH / 2,
      FOOTER_LINE_Y + 158
    )
    pageContext.fillText(
      `${report.id}  •  QHSSE Consultant  •  Safety  •  Quality  •  Environment`,
      PAGE_WIDTH / 2,
      FOOTER_LINE_Y + 180
    )
  }

  // Page 1 header
  if (logo) {
    context!.drawImage(logo, 62, 38, 110, 110)
  } else {
    context!.fillStyle = '#8b4d00'
    context!.beginPath()
    context!.arc(117, 93, 42, 0, Math.PI * 2)
    context!.fill()
    text('700 13px Arial', '#ffffff', 'center')
    write('QHSSE', 117, 98)
  }
  text('700 44px Cairo, Arial', '#666666', 'center')
  write(isArabic ? 'تقرير زيارة' : 'VISIT REPORT', PAGE_WIDTH / 2, 84)
  context!.fillStyle = '#a3a3a3'
  context!.fillRect(PAGE_WIDTH / 2 - 85, 103, 170, 3)
  text('600 15px Cairo, Arial', '#777777', 'center')
  context!.direction = 'ltr'
  write('QHSSE CONSULTANT', PAGE_WIDTH / 2, 135)
  context!.fillStyle = '#777777'
  context!.fillRect(42, 158, 1156, 3)

  const metaRows = [
    [isArabic ? 'اليوم' : 'Date', visitDate],
    [isArabic ? 'العميل' : 'Client', company],
    [isArabic ? 'الموضوع' : 'Subject', siteName],
    [isArabic ? 'الموقع - المكان' : 'Location', siteName],
  ]
  const metaY = 182
  metaRows.forEach(([label, content], index) => {
    const y = metaY + index * 39
    drawBox(context!, 42, y, 1156, 36, index % 2 ? '#fbfcfc' : '#ffffff')
    context!.fillStyle = '#dedede'
    context!.fillRect(isArabic ? 930 : 42, y, 268, 36)
    text('700 16px Cairo, Arial', '#242424', isArabic ? 'right' : 'left')
    write(label, isArabic ? 1175 : 65, y + 24)
    text('500 15px Cairo, Arial', '#303030', isArabic ? 'right' : 'left')
    write(content, isArabic ? 900 : 335, y + 24, 820)
  })

  const assessmentTop = 385
  text('700 20px Cairo, Arial', '#202020', isArabic ? 'right' : 'left')
  write(isArabic ? '١ - الملخص التنفيذي ومراجعة الزيارة:' : '1 - Executive summary and visit review:', isArabic ? 1175 : 62, assessmentTop)
  context!.fillStyle = '#777777'
  context!.fillRect(isArabic ? 785 : 62, assessmentTop + 8, 390, 2)
  drawBox(context!, 62, assessmentTop + 32, 1116, 100, '#fafcfc')
  text('500 16px Cairo, Arial', '#303030', isArabic ? 'right' : 'left')
  const noteLines = wrapText(context!, notes, 1040).slice(0, 3)
  noteLines.forEach((line, index) => write(line, isArabic ? 1145 : 94, assessmentTop + 65 + index * 25, 1040))

  const scoreY = assessmentTop + 162
  const cards: Array<[string, string, string]> = [
    [isArabic ? 'درجة التوافق' : 'Compliance score', `${weightedScore}%`, '#95d14c'],
    [isArabic ? 'إجمالي الملاحظات' : 'Total observations', String(observations.length), '#e8b941'],
    [isArabic ? 'نقاط مفتوحة' : 'Open points', String(openPoints), '#db6b5e'],
  ]
  cards.forEach(([label, metric, color], index) => {
    const x = 62 + index * 375
    drawBox(context!, x, scoreY, 350, 78, '#ffffff')
    context!.fillStyle = color
    context!.fillRect(x, scoreY, 9, 78)
    text('600 14px Cairo, Arial', '#555555', isArabic ? 'right' : 'left')
    write(label, isArabic ? x + 320 : x + 25, scoreY + 29)
    text('700 29px Cairo, Arial', '#1f2937', isArabic ? 'right' : 'left')
    write(metric, isArabic ? x + 320 : x + 25, scoreY + 62)
  })

  let contentY = scoreY + 116
  if (isFoodSafety) {
    text('700 18px Cairo, Arial', '#202020', isArabic ? 'right' : 'left')
    write(
      isArabic
        ? '٢ - تقييم التوافق المبدئي لمتطلبات سلامة الغذاء:'
        : '2 - Preliminary food safety compliance assessment:',
      isArabic ? 1175 : 62,
      contentY
    )
    context!.fillStyle = '#f4e51f'
    context!.fillRect(62, contentY + 18, 1116, 34)
    const headers = isArabic
      ? ['م', 'البند', 'النسبة الحالية %', 'النسبة المطلوبة %']
      : ['#', 'Assessment item', 'Current %', 'Target %']
    const headerXs = isArabic ? [1140, 800, 380, 150] : [88, 155, 850, 1060]
    text('700 14px Cairo, Arial', '#171717', isArabic ? 'right' : 'left')
    headers.forEach((header, index) => write(header, headerXs[index], contentY + 41))
    assessmentItems.forEach((item, index) => {
      const rowY = contentY + 52 + index * 32
      const current = clampScore(scores[item.key], clampScore(weightedScore - (index % 3) * 3, 0))
      drawBox(context!, 62, rowY, 1116, 32, index % 2 ? '#fafcfc' : '#ffffff')
      text('500 13px Cairo, Arial', '#252525', isArabic ? 'right' : 'left')
      if (isArabic) {
        write(String(index + 1), 1140, rowY + 22)
        write(item.ar, 800, rowY + 22)
        write(`${current}%`, 380, rowY + 22)
        write('85%', 150, rowY + 22)
      } else {
        write(String(index + 1), 88, rowY + 22)
        write(item.en, 155, rowY + 22)
        write(`${current}%`, 850, rowY + 22)
        write('85%', 1060, rowY + 22)
      }
    })
    contentY += 282
  }

  text('700 19px Cairo, Arial', '#202020', isArabic ? 'right' : 'left')
  write(
    isArabic ? '٣ - الملاحظات والإجراءات المطلوبة:' : '3 - Observations and required actions:',
    isArabic ? 1175 : 62,
    contentY
  )
  context!.fillStyle = '#777777'
  context!.fillRect(isArabic ? 785 : 62, contentY + 8, 390, 2)

  const tableY = contentY + 28
  let rowY = drawTableHeader(tableY)

  observations.forEach((observation, index) => {
    const title = value(observation.titleAr, observation.title)
    text('500 14px Cairo, Arial', '#222222', isArabic ? 'right' : 'left')
    const lines = wrapText(context!, title, 590).slice(0, 2)
    const height = Math.max(42, lines.length * 21 + 14)

    if (rowY + height > MAX_ROWS_Y) {
      pages.push(canvas)
      startPage()
      drawContinuationHeader()
      rowY = drawTableHeader(168)
    }

    drawBox(context!, 62, rowY, 1116, height, index % 2 ? '#fbfcfc' : '#ffffff')
    if (isArabic) {
      write(String(index + 1), 1140, rowY + 25)
      lines.forEach((line, lineIndex) => write(line, 795, rowY + 22 + lineIndex * 20, 590))
      write(observation.riskLevel, 355, rowY + 25)
      write(observation.status, 135, rowY + 25)
    } else {
      write(String(index + 1), 90, rowY + 25)
      lines.forEach((line, lineIndex) => write(line, 165, rowY + 22 + lineIndex * 20, 590))
      write(observation.riskLevel, 850, rowY + 25)
      write(observation.status, 1060, rowY + 25)
    }
    rowY += height
  })

  if (observations.length === 0) {
    drawBox(context!, 62, rowY, 1116, 64, '#fafcfc')
    text('500 16px Cairo, Arial', '#666666', 'center')
    write(
      isArabic
        ? 'لا توجد ملاحظات مسجلة في هذا التقرير حتى الآن.'
        : 'No observations have been recorded for this report yet.',
      PAGE_WIDTH / 2,
      rowY + 40
    )
  }

  pages.push(canvas)

  const pdf = new jsPDF({ unit: 'px', format: [PAGE_WIDTH, PAGE_HEIGHT] })
  pages.forEach((page, index) => {
    const pageContext = page.getContext('2d')
    if (!pageContext) return
    drawFooter(pageContext, index + 1, pages.length)
    if (index > 0) pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    pdf.addImage(page.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT)
  })
  pdf.save(`qhsse-report-${report.id}.pdf`)
}
