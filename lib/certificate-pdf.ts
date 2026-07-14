import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'

type CertificatePdfData = {
  recipientName: string
  courseTitle: string
  score: number | null
  certificateCode: string | null
  issuedAt: string | Date | null
}

async function loadImageData(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to load certificate logo')
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Failed to render certificate logo'))
      element.src = objectUrl
    })
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    canvas.getContext('2d')?.drawImage(image, 0, 0)
    return canvas.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function renderArabicText(text: string) {
  await document.fonts.ready
  const canvas = document.createElement('canvas')
  canvas.width = 1800
  canvas.height = 150
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Failed to render Arabic certificate text')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.direction = 'rtl'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '700 48px Cairo, Arial, sans-serif'
  context.fillStyle = '#1e4031'
  context.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width - 80)
  return canvas.toDataURL('image/png')
}

function repairMojibake(value: string) {
  if (!/[ØÙÃâ]/.test(value)) return value
  try {
    return decodeURIComponent(escape(value))
  } catch {
    return value
  }
}

export async function downloadTrainingCertificatePdf(certificate: CertificatePdfData) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const width = pdf.internal.pageSize.getWidth()
  const height = pdf.internal.pageSize.getHeight()
  const issuedAt = certificate.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-'
  const verificationUrl = `${window.location.origin}/training/verify?code=${encodeURIComponent(certificate.certificateCode || '')}`
  const qrCode = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
    color: { dark: '#123c2f', light: '#ffffff' },
  })
  const logo = await loadImageData(`${window.location.origin}/brand/qhsse-logo-stacked.svg`)
  const courseTitle = repairMojibake(certificate.courseTitle)
  const containsArabic = /[\u0600-\u06FF]/.test(courseTitle)
  const arabicCourseTitle = containsArabic ? await renderArabicText(courseTitle) : null

  pdf.setFillColor(246, 248, 250)
  pdf.rect(0, 0, width, height, 'F')
  pdf.setDrawColor(139, 77, 0)
  pdf.setLineWidth(1.4)
  pdf.rect(12, 12, width - 24, height - 24)
  pdf.setLineWidth(0.35)
  pdf.rect(17, 17, width - 34, height - 34)
  pdf.addImage(logo, 'PNG', width / 2 - 12, 22, 24, 24)
  pdf.setTextColor(30, 64, 49)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(15)
  pdf.text('QHSSE CONSULTANT', width / 2, 51, { align: 'center' })
  pdf.setTextColor(17, 24, 39)
  pdf.setFontSize(30)
  pdf.text('Certificate of Training Completion', width / 2, 70, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(13)
  pdf.setTextColor(75, 85, 99)
  pdf.text('This certificate is proudly presented to', width / 2, 88, { align: 'center' })
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(24)
  pdf.setTextColor(139, 77, 0)
  pdf.text(certificate.recipientName || '-', width / 2, 104, { align: 'center', maxWidth: width - 60 })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(13)
  pdf.setTextColor(75, 85, 99)
  pdf.text('for successfully completing', width / 2, 122, { align: 'center' })
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor(30, 64, 49)
  if (arabicCourseTitle) {
    pdf.addImage(arabicCourseTitle, 'PNG', 42, 126, width - 84, 12)
  } else {
    pdf.text(courseTitle || '-', width / 2, 136, { align: 'center', maxWidth: width - 60 })
  }

  const columns = [width * 0.21, width * 0.42, width * 0.63]
  const values = [`${certificate.score ?? '-'}%`, issuedAt, certificate.certificateCode || '-']
  const labels = ['SCORE', 'ISSUE DATE', 'VERIFICATION CODE']
  labels.forEach((label, index) => {
    pdf.setTextColor(107, 114, 128)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.text(label, columns[index], 158, { align: 'center' })
    pdf.setTextColor(17, 24, 39)
    pdf.setFontSize(index === 2 ? 10 : 14)
    pdf.text(values[index], columns[index], 168, { align: 'center', maxWidth: width / 3 - 20 })
  })

  pdf.setDrawColor(209, 213, 219)
  pdf.addImage(qrCode, 'PNG', width - 71, 146, 32, 32)
  pdf.setTextColor(107, 114, 128)
  pdf.setFontSize(8)
  pdf.text('SCAN TO VERIFY', width - 55, 182, { align: 'center' })
  pdf.line(45, 188, width - 45, 188)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(75, 85, 99)
  pdf.setFontSize(9)
  pdf.text('Scan the QR code or visit /training/verify using the verification code above.', width / 2, 199, { align: 'center' })
  pdf.save(`certificate-${(certificate.certificateCode || 'training').replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`)
}
