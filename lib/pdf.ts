type Report = {
  id: string
  date: string
  siteName: string
  siteNameAr?: string
  category: string
  status: string
  notes?: string
  notesAr?: string
  observations: Observation[]
  client: any
  consultant?: { name: string }
}

type Observation = {
  id: string
  title: string
  titleAr?: string
  description?: string
  descriptionAr?: string
  riskLevel: string
  status: string
  images: any[]
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatDate(date: string, language: string) {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function resolveText(arabicValue: string | undefined, englishValue: string | undefined, isArabic: boolean) {
  const value = isArabic ? arabicValue || englishValue || '' : englishValue || arabicValue || ''
  return value.trim()
}

function getCategoryLabel(category: string, t: (key: string) => string) {
  const key = `categories.${normalizeKey(category)}`
  const translated = t(key)
  return translated === key ? category.replace(/_/g, ' ') : translated
}

function getStatusLabel(status: string, t: (key: string) => string) {
  const key = `statuses.${normalizeKey(status)}`
  const translated = t(key)
  return translated === key ? status.replace(/_/g, ' ') : translated
}

function getRiskLabel(riskLevel: string, t: (key: string) => string) {
  const key = `riskLevels.${riskLevel.toLowerCase()}`
  const translated = t(key)
  return translated === key ? riskLevel.replace(/_/g, ' ') : translated
}

function buildObservationRows(report: Report, isArabic: boolean, t: (key: string) => string) {
  if (report.observations.length === 0) {
    return `
      <tr>
        <td colspan="4" class="empty-row">
          ${isArabic ? 'لا توجد ملاحظات مسجلة في هذا التقرير.' : 'No observations were recorded in this report.'}
        </td>
      </tr>
    `
  }

  return report.observations
    .map((observation, index) => {
      const title = resolveText(observation.titleAr, observation.title, isArabic)
      const description = resolveText(observation.descriptionAr, observation.description, isArabic)

      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div class="cell-title">${escapeHtml(title || '-')}</div>
            ${description ? `<div class="cell-description">${escapeHtml(description)}</div>` : ''}
          </td>
          <td>${escapeHtml(getRiskLabel(observation.riskLevel, t))}</td>
          <td>${escapeHtml(getStatusLabel(observation.status, t))}</td>
        </tr>
      `
    })
    .join('')
}

function buildPrintMarkup(report: Report, t: (key: string) => string, language: string) {
  const isArabic = language === 'ar'
  const reportTitle = isArabic ? 'تقرير زيارة' : 'Visit Report'
  const companyArabic = 'جلوبال لاستشارات الجودة والسلامة والبيئة'
  const companyEnglish = 'QHSSE Consultancy Global'
  const siteName = resolveText(report.siteNameAr, report.siteName, isArabic)
  const notes = resolveText(report.notesAr, report.notes, isArabic)
  const logoUrl = `${window.location.origin}/brand/qhsse-logo-stacked.svg`
  const fileName = `report-${report.siteName.replace(/\s+/g, '-').toLowerCase()}-${new Date(report.date).toISOString().split('T')[0]}`

  return `<!DOCTYPE html>
  <html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(fileName)}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Merriweather:wght@400;700&display=swap" rel="stylesheet" />
      <style>
        :root {
          color-scheme: light;
          --blue: #2f49c5;
          --brown: #8b4d00;
          --text: #1f2937;
          --muted: #6b7280;
          --line: #d7dbe5;
        }

        * { box-sizing: border-box; }

        @page {
          size: A4;
          margin: 18mm 14mm 18mm;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: #f4f6fa;
          color: var(--text);
          font-family: ${isArabic ? "'Cairo', sans-serif" : "'Merriweather', serif"};
        }

        body {
          padding: 16px;
        }

        .sheet {
          width: 100%;
          max-width: 794px;
          margin: 0 auto;
          background: white;
          min-height: calc(100vh - 32px);
          padding: 22px 26px 42px;
          box-shadow: 0 16px 48px rgba(15, 23, 42, 0.08);
        }

        .report-header {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: start;
          gap: 18px;
          padding-bottom: 18px;
        }

        .header-side {
          font-size: 18px;
          line-height: 1.7;
          color: #6a6a6a;
          padding-top: 24px;
        }

        .header-side.left {
          text-align: left;
          font-weight: 700;
        }

        .header-side.right {
          text-align: right;
          font-weight: 600;
          font-family: 'Cairo', sans-serif;
        }

        .logo-wrap {
          display: flex;
          justify-content: center;
        }

        .logo-wrap img {
          width: 108px;
          height: auto;
          display: block;
        }

        .header-divider {
          border-top: 1px solid var(--line);
          margin-top: 12px;
        }

        .report-title-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 20px;
          margin: 26px 0 10px;
          flex-wrap: wrap;
        }

        .report-title {
          margin: 0;
          color: var(--blue);
          font-size: 28px;
          letter-spacing: 0.06em;
          font-weight: 800;
        }

        .report-meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 28px;
          margin: 24px 0;
        }

        .meta-item {
          border-bottom: 1px solid #eef1f6;
          padding-bottom: 8px;
        }

        .meta-label {
          display: block;
          margin-bottom: 4px;
          color: var(--muted);
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .meta-value {
          font-size: 18px;
          line-height: 1.6;
          font-family: ${isArabic ? "'Cairo', sans-serif" : "'Merriweather', serif"};
        }

        .section {
          margin-top: 28px;
          page-break-inside: avoid;
        }

        .section-title {
          margin: 0 0 12px;
          color: #111827;
          font-size: 20px;
          font-weight: 800;
        }

        .notes-box {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 18px 20px;
          background: #fafbfc;
          font-size: 16px;
          line-height: 1.9;
          white-space: pre-wrap;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
          overflow: hidden;
          border-radius: 16px;
        }

        thead {
          display: table-header-group;
        }

        th {
          background: var(--blue);
          color: white;
          padding: 12px 14px;
          font-size: 14px;
          text-align: ${isArabic ? 'right' : 'left'};
          font-weight: 700;
        }

        td {
          border-bottom: 1px solid #e5e7eb;
          padding: 14px;
          vertical-align: top;
          font-size: 14px;
          line-height: 1.8;
        }

        tbody tr:nth-child(even) td {
          background: #fafbff;
        }

        .cell-title {
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }

        .cell-description {
          color: #4b5563;
          font-size: 13px;
        }

        .empty-row {
          text-align: center;
          color: #6b7280;
          font-style: italic;
        }

        .report-footer {
          position: fixed;
          left: 26px;
          right: 26px;
          bottom: 16px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 12px;
          align-items: center;
          color: #7b7b7b;
          font-size: 13px;
        }

        .report-footer .center {
          text-align: center;
        }

        .report-footer .right {
          text-align: right;
        }

        @media print {
          body {
            padding: 0;
            background: white;
          }

          .sheet {
            max-width: none;
            min-height: auto;
            padding: 0 0 44px;
            box-shadow: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="sheet">
        <header>
          <div class="report-header">
            <div class="header-side left">${escapeHtml(companyEnglish)}</div>
            <div class="logo-wrap">
              <img src="${logoUrl}" alt="QHSSE Consultant logo" />
            </div>
            <div class="header-side right">${escapeHtml(companyArabic)}</div>
          </div>
          <div class="header-divider"></div>
        </header>

        <section class="report-title-row">
          <h1 class="report-title">${escapeHtml(reportTitle)}</h1>
          <div class="meta-value">${escapeHtml(siteName)}</div>
        </section>

        <section class="report-meta">
          <div class="meta-item">
            <span class="meta-label">${escapeHtml(t('reports.date'))}</span>
            <div class="meta-value">${escapeHtml(formatDate(report.date, language))}</div>
          </div>
          <div class="meta-item">
            <span class="meta-label">${escapeHtml(t('reports.category'))}</span>
            <div class="meta-value">${escapeHtml(getCategoryLabel(report.category, t))}</div>
          </div>
          <div class="meta-item">
            <span class="meta-label">${escapeHtml(t('reports.status'))}</span>
            <div class="meta-value">${escapeHtml(getStatusLabel(report.status, t))}</div>
          </div>
          <div class="meta-item">
            <span class="meta-label">${escapeHtml(t('reports.consultant'))}</span>
            <div class="meta-value">${escapeHtml(report.consultant?.name || '-')}</div>
          </div>
        </section>

        ${
          notes
            ? `
            <section class="section">
              <h2 class="section-title">${escapeHtml(t('reports.notes'))}</h2>
              <div class="notes-box">${escapeHtml(notes)}</div>
            </section>
          `
            : ''
        }

        <section class="section">
          <h2 class="section-title">${escapeHtml(t('reports.observations'))} (${report.observations.length})</h2>
          <table>
            <thead>
              <tr>
                <th style="width: 58px;">#</th>
                <th>${escapeHtml(t('reports.observation'))}</th>
                <th style="width: 170px;">${escapeHtml(t('reports.riskLevel'))}</th>
                <th style="width: 150px;">${escapeHtml(t('reports.status'))}</th>
              </tr>
            </thead>
            <tbody>
              ${buildObservationRows(report, isArabic, t)}
            </tbody>
          </table>
        </section>

        <footer class="report-footer">
          <div>Email: Support@qhsseconsultant.onmicrosoft.com</div>
          <div class="center">${escapeHtml(reportTitle)} | ${escapeHtml(siteName)}</div>
          <div class="right">Mobile: +20 1117755096</div>
        </footer>
      </div>
    </body>
  </html>`
}

export async function generateReportPDF(report: Report, t: (key: string) => string, language: string) {
  if (typeof window === 'undefined') {
    return
  }

  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=900')
  if (!printWindow) {
    throw new Error('Unable to open print window')
  }

  const markup = buildPrintMarkup(report, t, language)

  printWindow.document.open()
  printWindow.document.write(markup)
  printWindow.document.close()

  await new Promise<void>((resolve) => {
    const finish = () => {
      printWindow.focus()
      resolve()
    }

    printWindow.onload = finish
    window.setTimeout(finish, 700)
  })

  printWindow.onafterprint = () => {
    printWindow.close()
  }

  printWindow.print()
}
