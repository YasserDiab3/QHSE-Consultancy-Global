import { jsPDF } from 'jspdf'

type CertificatePdfData = {
  recipientName: string
  courseTitle: string
  score: number | null
  certificateCode: string | null
  issuedAt: string | Date | null
}

export function downloadTrainingCertificatePdf(certificate: CertificatePdfData) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const width = pdf.internal.pageSize.getWidth()
  const height = pdf.internal.pageSize.getHeight()
  const issuedAt = certificate.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '-'

  pdf.setFillColor(246, 248, 250)
  pdf.rect(0, 0, width, height, 'F')
  pdf.setDrawColor(139, 77, 0)
  pdf.setLineWidth(1.4)
  pdf.rect(12, 12, width - 24, height - 24)
  pdf.setLineWidth(0.35)
  pdf.rect(17, 17, width - 34, height - 34)
  pdf.setTextColor(30, 64, 49)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(15)
  pdf.text('QHSSE CONSULTANT', width / 2, 37, { align: 'center' })
  pdf.setTextColor(17, 24, 39)
  pdf.setFontSize(30)
  pdf.text('Certificate of Training Completion', width / 2, 57, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(13)
  pdf.setTextColor(75, 85, 99)
  pdf.text('This certificate is proudly presented to', width / 2, 76, { align: 'center' })
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(24)
  pdf.setTextColor(139, 77, 0)
  pdf.text(certificate.recipientName || '-', width / 2, 92, { align: 'center', maxWidth: width - 60 })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(13)
  pdf.setTextColor(75, 85, 99)
  pdf.text('for successfully completing', width / 2, 110, { align: 'center' })
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(18)
  pdf.setTextColor(30, 64, 49)
  pdf.text(certificate.courseTitle || '-', width / 2, 124, { align: 'center', maxWidth: width - 60 })

  const columns = [width * 0.25, width * 0.5, width * 0.75]
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
  pdf.line(45, 188, width - 45, 188)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(75, 85, 99)
  pdf.setFontSize(9)
  pdf.text('Verify this certificate at /training/verify using the verification code above.', width / 2, 199, { align: 'center' })
  pdf.save(`certificate-${(certificate.certificateCode || 'training').replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`)
}
