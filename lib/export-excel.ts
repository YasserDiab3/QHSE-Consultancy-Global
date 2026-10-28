export type MatrixObservationItem = {
  id: string
  title: string
  titleAr?: string | null
  description?: string | null
  descriptionAr?: string | null
  riskLevel: string
  status: string
  clientResponse?: string | null
  correctiveAction?: string | null
  correctiveActionStatus?: string | null
  imagesCount?: number
  images?: Array<{ id: string; url?: string }> | null
  reportDate?: string | Date | null
  siteName?: string | null
  siteNameAr?: string | null
  category?: string | null
  reportId?: string | null
}

export type ReportWithObservations = {
  id: string
  date: string | Date
  siteName: string
  siteNameAr?: string | null
  category: string
  status: string
  observations: MatrixObservationItem[]
}

export const RISK_LEVEL_LABELS: Record<string, { ar: string; en: string }> = {
  CRITICAL: { ar: 'حرجة جداً (Critical)', en: 'Critical' },
  HIGH: { ar: 'عالية (High)', en: 'High' },
  MEDIUM: { ar: 'متوسطة (Medium)', en: 'Medium' },
  LOW: { ar: 'منخفضة (Low)', en: 'Low' },
}

export const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  OPEN: { ar: 'مفتوحة (Open)', en: 'Open' },
  IN_PROGRESS: { ar: 'قيد المعالجة (In Progress)', en: 'In Progress' },
  CLOSED: { ar: 'مغلقة (Closed)', en: 'Closed' },
  RESOLVED: { ar: 'تم الحل (Resolved)', en: 'Resolved' },
}

export const CATEGORY_LABELS: Record<string, { ar: string; en: string }> = {
  FOOD_SAFETY: { ar: 'سلامة الغذاء', en: 'Food Safety' },
  OCCUPATIONAL_HEALTH: { ar: 'الصحة المهنية والسلامة', en: 'OH&S' },
  FIRE_SAFETY: { ar: 'السلامة من الحريق', en: 'Fire Safety' },
  ENVIRONMENTAL: { ar: 'البيئة والاستدامة', en: 'Environmental' },
  GENERAL_SAFETY: { ar: 'السلامة العامة', en: 'General Safety' },
}

/**
 * Escapes a cell value for safe CSV output:
 * 1. Neutralizes Excel formula injection (=, +, -, @, \t, \r).
 * 2. Handles internal quotes by doubling them (" -> "").
 * 3. Encloses fields in double quotes when special characters or spaces exist.
 */
export function escapeCsvCell(raw: unknown): string {
  if (raw === null || raw === undefined) return '""'

  let text = String(raw).trim()

  // Neutralize formula injection risk in spreadsheets
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`
  }

  // Double any internal double-quotes
  const escaped = text.replace(/"/g, '""')

  return `"${escaped}"`
}

/**
 * Generates an Excel-compatible CSV string with UTF-8 BOM (\uFEFF)
 * for seamless native Arabic rendering in Microsoft Excel and Google Sheets.
 */
export function buildObservationsMatrixCsv(
  items: MatrixObservationItem[],
  language: string = 'ar'
): string {
  const isAr = language === 'ar'

  const headers = isAr
    ? [
        'م',
        'كود الملاحظة',
        'تاريخ التقرير',
        'الموقع / المنشأة',
        'مجال التقرير',
        'عنوان الملاحظة',
        'تفاصيل الملاحظة',
        'مستوى الخطورة',
        'حالة الملاحظة',
        'رد المنشأة / العميل',
        'الإجراء التصحيحي المطلوب',
        'حالة الإجراء التصحيحي',
        'عدد صور المعاينة',
      ]
    : [
        '#',
        'Observation ID',
        'Report Date',
        'Site / Facility',
        'Category',
        'Observation Title',
        'Description & Details',
        'Risk Level',
        'Observation Status',
        'Client Response',
        'Required Corrective Action',
        'Corrective Action Status',
        'Evidence Photos Count',
      ]

  const headerRow = headers.map(escapeCsvCell).join(',')

  const dataRows = items.map((item, index) => {
    const rawDate = item.reportDate
      ? typeof item.reportDate === 'string'
        ? item.reportDate.split('T')[0]
        : item.reportDate.toISOString().split('T')[0]
      : ''

    const site = isAr && item.siteNameAr ? item.siteNameAr : (item.siteName || '')
    const categoryKey = (item.category || '').toUpperCase()
    const category = CATEGORY_LABELS[categoryKey]
      ? isAr
        ? CATEGORY_LABELS[categoryKey].ar
        : CATEGORY_LABELS[categoryKey].en
      : item.category || ''

    const title = isAr && item.titleAr ? item.titleAr : item.title
    const description = isAr && item.descriptionAr ? item.descriptionAr : (item.description || '')

    const riskKey = (item.riskLevel || '').toUpperCase()
    const riskLabel = RISK_LEVEL_LABELS[riskKey]
      ? isAr
        ? RISK_LEVEL_LABELS[riskKey].ar
        : RISK_LEVEL_LABELS[riskKey].en
      : item.riskLevel || ''

    const statusKey = (item.status || '').toUpperCase()
    const statusLabel = STATUS_LABELS[statusKey]
      ? isAr
        ? STATUS_LABELS[statusKey].ar
        : STATUS_LABELS[statusKey].en
      : item.status || ''

    const photosCount = item.imagesCount ?? (Array.isArray(item.images) ? item.images.length : 0)

    const row = [
      index + 1,
      item.id,
      rawDate,
      site,
      category,
      title,
      description,
      riskLabel,
      statusLabel,
      item.clientResponse || '',
      item.correctiveAction || '',
      item.correctiveActionStatus || '',
      photosCount,
    ]

    return row.map(escapeCsvCell).join(',')
  })

  // Prepend UTF-8 BOM (\uFEFF) for Microsoft Excel Arabic encoding detection
  return `\uFEFF${[headerRow, ...dataRows].join('\r\n')}`
}

/**
 * Triggers a browser file download of CSV content.
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  if (typeof window === 'undefined') return

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(url)
}

/**
 * Flattens an array of reports and their observations into a single unified list.
 */
export function extractObservationsFromReports(
  reports: ReportWithObservations[]
): MatrixObservationItem[] {
  const result: MatrixObservationItem[] = []

  for (const report of reports) {
    if (!Array.isArray(report.observations)) continue

    for (const obs of report.observations) {
      result.push({
        ...obs,
        reportId: report.id,
        reportDate: report.date,
        siteName: report.siteName,
        siteNameAr: report.siteNameAr,
        category: report.category,
      })
    }
  }

  return result
}

/**
 * Exports all observations from a list of reports directly to an Excel-compatible CSV file.
 */
export function exportAllReportsObservationsToCsv(
  reports: ReportWithObservations[],
  language: string = 'ar'
): void {
  const observations = extractObservationsFromReports(reports)
  const isAr = language === 'ar'
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = isAr
    ? `مصفوفة_ملاحظات_السلامة_${dateStr}.csv`
    : `Safety_Observations_Matrix_${dateStr}.csv`

  const csv = buildObservationsMatrixCsv(observations, language)
  downloadCsvFile(filename, csv)
}

/**
 * Exports observations of a single report directly to an Excel-compatible CSV file.
 */
export function exportSingleReportObservationsToCsv(
  report: ReportWithObservations,
  language: string = 'ar'
): void {
  const observations = (report.observations || []).map((obs) => ({
    ...obs,
    reportId: report.id,
    reportDate: report.date,
    siteName: report.siteName,
    siteNameAr: report.siteNameAr,
    category: report.category,
  }))

  const isAr = language === 'ar'
  const dateStr = typeof report.date === 'string'
    ? report.date.split('T')[0]
    : new Date(report.date).toISOString().split('T')[0]

  const cleanSiteName = (isAr && report.siteNameAr ? report.siteNameAr : report.siteName)
    .replace(/[/\\?%*:|"<>]/g, '_')
    .slice(0, 30)

  const filename = isAr
    ? `ملاحظات_${cleanSiteName}_${dateStr}.csv`
    : `Observations_${cleanSiteName}_${dateStr}.csv`

  const csv = buildObservationsMatrixCsv(observations, language)
  downloadCsvFile(filename, csv)
}


export type AuditLogItem = {
  id: string
  action: string
  entityType?: string | null
  entityId?: string | null
  details?: string | null
  ipAddress?: string | null
  createdAt: string | Date
  user?: {
    name?: string | null
    email?: string | null
    role?: string | null
  } | null
}

/**
 * Builds an Excel-compatible CSV string for Activity Logs / Audit Trails with UTF-8 BOM.
 */
export function buildAuditLogCsv(
  items: AuditLogItem[],
  language: string = 'ar'
): string {
  const isAr = language === 'ar'

  const headers = isAr
    ? ['م', 'معرّف السجل', 'التاريخ والوقت', 'المستخدم', 'البريد الإلكتروني', 'الدور', 'الإجراء', 'النوع', 'المعرّف المرتبط', 'التفاصيل', 'عنوان IP']
    : ['#', 'Log ID', 'Timestamp', 'User', 'Email', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Details', 'IP Address']

  const headerRow = headers.map(escapeCsvCell).join(',')

  const dataRows = items.map((item, index) => {
    const rawDate = item.createdAt
      ? typeof item.createdAt === 'string'
        ? item.createdAt
        : item.createdAt.toISOString()
      : ''

    const row = [
      index + 1,
      item.id,
      rawDate,
      item.user?.name || '',
      item.user?.email || '',
      item.user?.role || '',
      item.action,
      item.entityType || '',
      item.entityId || '',
      item.details || '',
      item.ipAddress || '',
    ]

    return row.map(escapeCsvCell).join(',')
  })

  return `\uFEFF${[headerRow, ...dataRows].join('\r\n')}`
}

/**
 * Exports audit logs directly to an Excel-compatible CSV file.
 */
export function exportAuditLogsToCsv(
  logs: AuditLogItem[],
  language: string = 'ar'
): void {
  const isAr = language === 'ar'
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = isAr
    ? `سجل_التدقيق_والأنشطة_${dateStr}.csv`
    : `Audit_Activity_Log_${dateStr}.csv`

  const csv = buildAuditLogCsv(logs, language)
  downloadCsvFile(filename, csv)
}

export type ExportSessionItem = {
  id: string
  userId: string
  ipAddress: string | null
  countryCode: string | null
  countryName: string | null
  region: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  device: string | null
  browser: string | null
  os: string | null
  status: string
  loginAt: string
  lastActiveAt: string
  googleMapsUrl: string | null
  user: {
    name: string
    email: string
    role: string
    phone?: string | null
    client?: {
      companyName: string
      companyNameAr?: string | null
    } | null
  }
}

/**
 * Builds an Excel-compatible CSV string for User Sessions with UTF-8 BOM.
 */
export function buildUserSessionsCsv(
  items: ExportSessionItem[],
  language: string = 'ar'
): string {
  const isAr = language === 'ar'

  const headers = isAr
    ? [
        'م',
        'اسم المستخدم',
        'البريد الإلكتروني',
        'الدور',
        'اسم الشركة / العميل',
        'الهاتف',
        'حالة الاتصال',
        'عنوان IP',
        'الدولة',
        'المدينة والمنطقة',
        'خط العرض (Latitude)',
        'خط الطول (Longitude)',
        'نوع الجهاز',
        'المتصفح',
        'نظام التشغيل',
        'وقت وتاريخ الدخول',
        'آخر نشاط',
        'رابط خرائط جوجل',
      ]
    : [
        '#',
        'User Name',
        'Email',
        'Role',
        'Company Name',
        'Phone',
        'Status',
        'IP Address',
        'Country',
        'City & Region',
        'Latitude',
        'Longitude',
        'Device',
        'Browser',
        'OS',
        'Login Timestamp',
        'Last Active',
        'Google Maps URL',
      ]

  const headerRow = headers.map(escapeCsvCell).join(',')

  const statusMap: Record<string, { ar: string; en: string }> = {
    ACTIVE: { ar: 'متصل الآن (Online)', en: 'Online' },
    IDLE: { ar: 'خامل (Idle)', en: 'Idle' },
    OFFLINE: { ar: 'غير متصل (Offline)', en: 'Offline' },
    LOGGED_OUT: { ar: 'تم تسجيل الخروج (Logged Out)', en: 'Logged Out' },
  }

  const dataRows = items.map((item, index) => {
    const rawLoginDate = item.loginAt ? new Date(item.loginAt).toLocaleString() : ''
    const rawActiveDate = item.lastActiveAt ? new Date(item.lastActiveAt).toLocaleString() : ''
    const statusLabel = statusMap[item.status]
      ? isAr
        ? statusMap[item.status].ar
        : statusMap[item.status].en
      : item.status

    const companyName = item.user.client
      ? isAr
        ? item.user.client.companyNameAr || item.user.client.companyName
        : item.user.client.companyName
      : '-'

    const locationCity = [item.city, item.region].filter(Boolean).join(' - ') || '-'

    const row = [
      index + 1,
      item.user.name,
      item.user.email,
      item.user.role,
      companyName,
      item.user.phone || '-',
      statusLabel,
      item.ipAddress || '-',
      item.countryName || item.countryCode || '-',
      locationCity,
      item.latitude != null ? item.latitude : '-',
      item.longitude != null ? item.longitude : '-',
      item.device || '-',
      item.browser || '-',
      item.os || '-',
      rawLoginDate,
      rawActiveDate,
      item.googleMapsUrl || '-',
    ]

    return row.map(escapeCsvCell).join(',')
  })

  return `\uFEFF${[headerRow, ...dataRows].join('\r\n')}`
}

/**
 * Exports user sessions directly to an Excel-compatible CSV file.
 */
export function exportUserSessionsToCsv(
  sessions: ExportSessionItem[],
  language: string = 'ar'
): void {
  const isAr = language === 'ar'
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = isAr
    ? `سجل_جلسات_المستخدمين_${dateStr}.csv`
    : `User_Sessions_Log_${dateStr}.csv`

  const csv = buildUserSessionsCsv(sessions, language)
  downloadCsvFile(filename, csv)
}
