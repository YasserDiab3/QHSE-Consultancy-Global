import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

type ReportPdfObservation = { title: string; titleAr?: string; riskLevel: string; status: string }
type ReportPdfData = {
  id: string; date: string; siteName: string; siteNameAr?: string; category: string; status: string
  notes?: string; notesAr?: string; observations: ReportPdfObservation[]
  client?: { companyName?: string; companyNameAr?: string }; consultant?: { name?: string }
}

export function downloadClientReportPdf(report: ReportPdfData, language: string) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const width = pdf.internal.pageSize.getWidth()
  const siteName = report.siteName
  const company = report.client?.companyName
  const formattedDate = new Date(report.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  pdf.setFillColor(21, 68, 53); pdf.rect(0, 0, width, 37, 'F')
  pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(19); pdf.text('QHSSE CONSULTANT', 15, 17)
  pdf.setFontSize(10); pdf.text('CLIENT VISIT REPORT', 15, 26)
  pdf.setTextColor(17, 24, 39); pdf.setFontSize(17); pdf.text(siteName, 15, 52, { maxWidth: width - 30 })
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(75, 85, 99)
  pdf.text(`Client: ${company || '-'}   |   Date: ${formattedDate}   |   Category: ${report.category}   |   Status: ${report.status}`, 15, 62)
  const notes = report.notes || report.notesAr
  let tableStart = 72
  if (notes) {
    pdf.setFillColor(248, 250, 252); pdf.roundedRect(15, 70, width - 30, 22, 2, 2, 'F')
    pdf.setTextColor(17, 24, 39); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.text('Executive summary', 19, 77)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.text(notes, 19, 84, { maxWidth: width - 38 }); tableStart = 102
  }
  autoTable(pdf, {
    startY: tableStart,
    head: [['#', 'Observation', 'Risk level', 'Status']],
    body: report.observations.map((observation, index) => [index + 1, observation.title, observation.riskLevel, observation.status]),
    theme: 'grid', styles: { fontSize: 9, cellPadding: 3, textColor: [31, 41, 55] },
    headStyles: { fillColor: [21, 68, 53], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 27 }, 3: { cellWidth: 27 } }, margin: { left: 15, right: 15 },
  })
  const pageCount = pdf.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page); pdf.setTextColor(107, 114, 128); pdf.setFontSize(8)
    pdf.text(`Report ID: ${report.id}  •  QHSSE Consultant  •  Page ${page} of ${pageCount}`, width / 2, 289, { align: 'center' })
  }
  pdf.save(`qhsse-report-${report.id}.pdf`)
}
