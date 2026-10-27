'use client'

import NextImage from 'next/image'
import { CardGridSkeleton } from '@/components/Skeleton'

import { useLanguage } from '@/context'
import { useEffect, useState, useCallback, useRef } from 'react'
import {
  FileText,
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  TrendingUp,
  Filter,
  Download,
  Eye,
  Calendar,
  Loader2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  X,
  Image as ImageIcon,
  LayoutDashboard,
  BarChart3,
  FolderOpen,
} from 'lucide-react'
import { getRiskLevelColor, getStatusColor, getCategoryColor } from '@/lib/colors'
import Header from '@/components/Header'
import { downloadClientReportPdf } from '@/lib/report-pdf'
import { exportAllReportsObservationsToCsv, exportSingleReportObservationsToCsv } from '@/lib/export-excel'
import toast from 'react-hot-toast'
import DashboardSignOutButton from '@/components/DashboardSignOutButton'
import ClientKnowledgeBank from '@/components/ClientKnowledgeBank'
import ClientProfilePanel from '@/components/ClientProfilePanel'

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
  images: Image[]
  clientResponse?: string
  correctiveAction?: string
  correctiveActionStatus?: string
}

type Image = {
  id: string
  type: string
  url: string
}

type ClientDocument = {
  id: string
  folderId?: string | null
  title: string
  category: string
  url: string
  originalName?: string | null
  mimeType?: string | null
  size?: number | null
  createdAt: string
}

type KnowledgeFolder = {
  id: string
  parentId?: string | null
  name: string
  category: string
}

const OBSERVATION_IMAGE_TYPES = ['BEFORE', 'AFTER', 'EVIDENCE'] as const

function ObservationImages({
  images,
  t,
}: {
  images: Image[]
  t: (key: string) => string
}) {
  const groups = OBSERVATION_IMAGE_TYPES.map((type) => ({
    type,
    label:
      type === 'BEFORE'
        ? t('reports.before')
        : type === 'AFTER'
          ? t('reports.after')
          : t('reports.photos'),
    items: images.filter((image) => image.type === type),
  })).filter((group) => group.items.length > 0)

  if (groups.length === 0) {
    return null
  }

  return (
    <div className="mt-3 space-y-3">
      {groups.map((group) => (
        <div key={group.type}>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <ImageIcon className="h-4 w-4 text-gray-400" />
            <span>{group.label}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {group.items.map((img) => (
              <NextImage
                key={img.id}
                src={img.url}
                alt={group.label}
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ClientDashboard() {
  const { t, language, dir } = useLanguage()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [filters, setFilters] = useState({
    status: '',
    riskLevel: '',
    dateFrom: '',
    dateTo: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'performance' | 'documents'>('dashboard')
  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const [folders, setFolders] = useState<KnowledgeFolder[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [documentsError, setDocumentsError] = useState('')

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.set('status', filters.status)
      if (filters.riskLevel) params.set('riskLevel', filters.riskLevel)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)

      const res = await fetch(`/api/reports?${params}`)
      if (res.ok) {
        const data = await res.json()
        setReports(data)
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const fetchDocuments = useCallback(async () => {
    setDocumentsLoading(true)
    setDocumentsError('')
    try {
      const response = await fetch('/api/client-documents')
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Unable to load documents')
      setDocuments(Array.isArray(payload?.documents) ? payload.documents : [])
      setFolders(Array.isArray(payload?.folders) ? payload.folders : [])
    } catch (error) {
      console.error('Failed to fetch client documents:', error)
      setDocumentsError(language === 'ar' ? 'تعذر تحميل بنك المعلومات حالياً.' : 'Unable to load the knowledge bank right now.')
    } finally {
      setDocumentsLoading(false)
    }
  }, [language])

  useEffect(() => {
    void fetchDocuments()
  }, [fetchDocuments])

  const handleDownloadPDF = async (report: Report) => {
    try {
      await downloadClientReportPdf(report, language)
      toast.success(language === 'ar' ? 'تم تنزيل ملف PDF' : 'PDF downloaded')
    } catch {
      toast.error(language === 'ar' ? 'تعذر إنشاء ملف PDF' : 'Failed to generate PDF')
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pt-24 pb-12">
        <div className="w-full px-4 sm:px-6 lg:px-10">
          {/* Page Header */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {t('reports.title')}
              </h1>
              <p className="text-gray-600 mt-1">{t('reports.subtitle')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  if (reports.length === 0) {
                    toast.error(language === 'ar' ? 'لا توجد تقارير أو ملاحظات للتصدير' : 'No reports to export')
                    return
                  }
                  exportAllReportsObservationsToCsv(reports as any, language)
                  toast.success(language === 'ar' ? 'تم تصدير مصفوفة الملاحظات إلى Excel بنجاح' : 'Observations matrix exported to Excel')
                }}
                className="btn-secondary px-4 py-2"
                title={language === 'ar' ? 'تصدير مصفوفة الملاحظات إلى ملف Excel' : 'Export observations matrix to Excel'}
              >
                <Download className="w-4 h-4 text-emerald-600" />
                {language === 'ar' ? 'تصدير المصفوفة (Excel)' : 'Export Matrix (Excel)'}
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary px-4 py-2"
              >
                <Filter className="w-4 h-4" />
                {t('common.filter')}
              </button>
              <DashboardSignOutButton />
            </div>
          </div>

          <div className="mb-6">
            <ClientProfilePanel language={language} />
          </div>

          <div className="mb-6 flex w-fit items-center gap-1 rounded-xl border border-gray-200 bg-white p-1">
            {[
              ['dashboard', language === 'ar' ? 'لوحة التحكم' : 'Dashboard', LayoutDashboard],
              ['reports', language === 'ar' ? 'تقارير الزيارات' : 'Visit reports', FileText],
              ['performance', language === 'ar' ? 'مؤشرات الأداء' : 'Performance', BarChart3],
              ['documents', language === 'ar' ? 'بنك المعلومات' : 'Knowledge bank', FolderOpen],
            ].map(([id, label, Icon]) => <button key={id as string} onClick={() => { setActiveTab(id as 'dashboard' | 'reports' | 'performance' | 'documents'); setSelectedReport(null) }} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${activeTab === id ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}><Icon className="h-4 w-4" />{label as string}</button>)}
          </div>

          {activeTab === 'dashboard' ? <ClientOverview reports={reports} language={language} onReports={() => setActiveTab('reports')} /> : activeTab === 'performance' ? <ClientPerformance reports={reports} language={language} /> : activeTab === 'documents' ? <ClientKnowledgeBank documents={documents} folders={folders} loading={documentsLoading} error={documentsError} language={language} onRetry={fetchDocuments} /> : <>

          {/* Filters */}
          {showFilters && (
            <div className="card mb-6 slide-up">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{t('common.filter')}</h3>
                <button onClick={() => setShowFilters(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="label-field">{t('reports.filterByStatus')}</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">{t('reports.allStatus')}</option>
                    <option value="OPEN">{t('reports.open')}</option>
                    <option value="IN_PROGRESS">{t('reports.inProgress')}</option>
                    <option value="CLOSED">{t('reports.closed')}</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">{t('reports.filterByRisk')}</label>
                  <select
                    value={filters.riskLevel}
                    onChange={(e) => setFilters((f) => ({ ...f, riskLevel: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">{t('reports.allRisk')}</option>
                    <option value="LOW">{t('riskLevels.low')}</option>
                    <option value="MEDIUM">{t('riskLevels.medium')}</option>
                    <option value="HIGH">{t('riskLevels.high')}</option>
                    <option value="CRITICAL">{t('riskLevels.critical')}</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">From</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">To</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Reports List */}
          {selectedReport ? (
            <ReportDetail
              report={selectedReport}
              onBack={() => setSelectedReport(null)}
              onDownloadPDF={handleDownloadPDF}
              t={t}
              language={language}
              dir={dir}
              formatDate={formatDate}
              onObservationUpdated={(obsId, newImg) => {
                setReports((prev) =>
                  prev.map((r) =>
                    r.id === selectedReport.id
                      ? {
                          ...r,
                          observations: r.observations.map((o) =>
                            o.id === obsId ? { ...o, images: [...(o.images || []), newImg] } : o
                          ),
                        }
                      : r
                  )
                )
                setSelectedReport((prev) =>
                  prev
                    ? {
                        ...prev,
                        observations: prev.observations.map((o) =>
                          o.id === obsId ? { ...o, images: [...(o.images || []), newImg] } : o
                        ),
                      }
                    : null
                )
              }}
            />
          ) : (
            <div className="space-y-4">
              {loading ? (
                <CardGridSkeleton count={4} />
              ) : reports.length === 0 ? (
                <div className="card text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('reports.noReports')}</h3>
                  <p className="text-gray-600">{t('reports.noReportsDesc')}</p>
                </div>
              ) : (
                reports.map((report) => {
                  const riskColors = getCategoryColor(report.category)
                  const statusColor = getStatusColor(report.status)
                  const highRiskCount = report.observations.filter((o) => o.riskLevel === 'HIGH' || o.riskLevel === 'CRITICAL').length

                  return (
                    <div
                      key={report.id}
                      className="card hover:shadow-md cursor-pointer transition-all"
                      onClick={() => setSelectedReport(report)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900">
                              {language === 'ar' && report.siteNameAr ? report.siteNameAr : report.siteName}
                            </h3>
                            <span className={`badge ${riskColors.bg} ${riskColors.text}`}>
                              {t(`categories.${report.category.toLowerCase().replace(/\s+/g, '')}`)}
                            </span>
                            <span className={`badge ${statusColor.bg} ${statusColor.text}`}>
                              {t(`statuses.${report.status.toLowerCase().replace(/\s+/g, '')}`)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(report.date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {language === 'ar' && report.siteNameAr ? report.siteNameAr : report.siteName}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {report.observations.length} {t('reports.observations')}
                            </span>
                            {highRiskCount > 0 && (
                              <span className="flex items-center gap-1 text-red-500">
                                <AlertTriangle className="w-4 h-4" />
                                {highRiskCount} {t('riskLevels.high')}+
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              await handleDownloadPDF(report)
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                            title={t('reports.downloadPDF')}
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedReport(report)
                            }}
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                            title={t('reports.viewReport')}
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <ChevronLeft className={`w-5 h-5 text-gray-400 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
          </>}
        </div>
      </main>
    </div>
  )
}

function ClientOverview({ reports, language, onReports }: { reports: Report[]; language: string; onReports: () => void }) {
  const observations = reports.flatMap((report) => report.observations)
  const open = observations.filter((item) => !['CLOSED', 'RESOLVED'].includes(item.status)).length
  const closed = observations.length - open
  return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-3"><ProfileCard label={language === 'ar' ? 'تقارير الزيارات' : 'Visit reports'} value={reports.length} icon={<FileText />} /><ProfileCard label={language === 'ar' ? 'ملاحظات مفتوحة' : 'Open observations'} value={open} icon={<AlertTriangle />} /><ProfileCard label={language === 'ar' ? 'ملاحظات مغلقة' : 'Closed observations'} value={closed} icon={<CheckCircle2 />} /></div><div className="card"><h2 className="text-lg font-bold text-gray-900">{language === 'ar' ? 'الوصول السريع' : 'Quick access'}</h2><p className="mt-2 text-gray-600">{language === 'ar' ? 'استعرض تقارير الزيارات، نزّل النسخ المعتمدة، وتابع مؤشرات الأداء من حسابك.' : 'Review visit reports, download approved copies, and monitor performance from your account.'}</p><button onClick={onReports} className="btn-primary mt-5 px-4 py-2">{language === 'ar' ? 'فتح تقارير الزيارات' : 'Open visit reports'}</button></div></div>
}

function ClientPerformance({ reports, language }: { reports: Report[]; language: string }) {
  const observations = reports.flatMap((report) => report.observations)
  const count = (level: string) => observations.filter((item) => item.riskLevel === level).length
  const total = observations.length
  const closed = observations.filter((item) => ['CLOSED', 'RESOLVED'].includes(item.status)).length
  const closure = total ? Math.round((closed / total) * 100) : 0
  const compliance = Math.max(0, 100 - count('CRITICAL') * 25 - count('HIGH') * 12 - count('MEDIUM') * 5 - count('LOW') * 2)
  return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-3"><ProfileCard label={language === 'ar' ? 'معدل إغلاق الملاحظات' : 'Observation closure'} value={`${closure}%`} icon={<CheckCircle2 />} /><ProfileCard label={language === 'ar' ? 'درجة التوافق التقديرية' : 'Estimated compliance'} value={`${compliance}%`} icon={<TrendingUp />} /><ProfileCard label={language === 'ar' ? 'المخاطر العالية والحرجة' : 'High & critical risks'} value={count('HIGH') + count('CRITICAL')} icon={<AlertTriangle />} /></div><div className="card"><h2 className="mb-5 text-lg font-bold text-gray-900">{language === 'ar' ? 'توزيع مستويات المخاطر' : 'Risk distribution'}</h2><div className="space-y-4">{[['CRITICAL', 'حرجة', 'bg-red-500'], ['HIGH', 'عالية', 'bg-orange-500'], ['MEDIUM', 'متوسطة', 'bg-amber-400'], ['LOW', 'منخفضة', 'bg-emerald-500']].map(([level, ar, color]) => <div key={level}><div className="mb-1 flex justify-between text-sm"><span>{language === 'ar' ? ar : level}</span><span>{count(level)}</span></div><div className="h-3 rounded-full bg-gray-100"><div className={`h-3 rounded-full ${color}`} style={{ width: `${total ? (count(level) / total) * 100 : 0}%` }} /></div></div>)}</div></div></div>
}

function ProfileCard({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) { return <div className="card"><div className="flex items-center justify-between"><span className="text-sm text-gray-600">{label}</span><span className="text-primary-600">{icon}</span></div><p className="mt-3 text-3xl font-bold text-gray-900">{value}</p></div> }

function ReportDetail({
  report,
  onBack,
  onDownloadPDF,
  t,
  language,
  dir,
  formatDate,
  onObservationUpdated,
}: {
  report: Report
  onBack: () => void
  onDownloadPDF: (report: Report) => Promise<void>
  t: (key: string) => string
  language: string
  dir: string
  formatDate: (date: string) => string
  onObservationUpdated?: (obsId: string, newImg: Image) => void
}) {
  return (
    <div className="space-y-6 slide-up">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-primary-500 font-medium"
      >
        <ChevronRight className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        {t('common.back')}
      </button>

      {/* Report Header */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {language === 'ar' && report.siteNameAr ? report.siteNameAr : report.siteName}
            </h2>
            <div className="flex items-center gap-3">
              <span className={`badge ${getCategoryColor(report.category).bg} ${getCategoryColor(report.category).text}`}>
                {t(`categories.${report.category.toLowerCase().replace(/\s+/g, '')}`)}
              </span>
              <span className={`badge ${getStatusColor(report.status).bg} ${getStatusColor(report.status).text}`}>
                {t(`statuses.${report.status.toLowerCase().replace(/\s+/g, '')}`)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                exportSingleReportObservationsToCsv(report as any, language)
                toast.success(language === 'ar' ? 'تم تصدير ملاحظات التقرير إلى Excel بنجاح' : 'Observations exported to Excel')
              }}
              className="btn-secondary px-4 py-2 text-sm"
              title={language === 'ar' ? 'تصدير ملاحظات التقرير إلى ملف Excel' : 'Export report observations to Excel'}
            >
              <Download className="w-4 h-4 text-emerald-600" />
              {language === 'ar' ? 'تصدير الملاحظات (Excel)' : 'Export (Excel)'}
            </button>
            <button
              onClick={() => void onDownloadPDF(report)}
              className="btn-secondary px-4 py-2 text-sm"
            >
              <Download className="w-4 h-4" />
              {t('reports.downloadPDF')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">{t('reports.date')}</span>
            <p className="font-medium text-gray-900">{formatDate(report.date)}</p>
          </div>
          <div>
            <span className="text-gray-500">{t('reports.siteName')}</span>
            <p className="font-medium text-gray-900">
              {language === 'ar' && report.siteNameAr ? report.siteNameAr : report.siteName}
            </p>
          </div>
          <div>
            <span className="text-gray-500">{t('reports.consultant')}</span>
            <p className="font-medium text-gray-900">{report.consultant?.name || '-'}</p>
          </div>
        </div>

        {(report.notes || report.notesAr) && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">{t('reports.notes')}</h3>
            <p className="text-gray-600">
              {language === 'ar' && report.notesAr ? report.notesAr : report.notes}
            </p>
          </div>
        )}
      </div>

      {/* Observations */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {t('reports.observations')} ({report.observations.length})
        </h3>
        <div className="space-y-4">
          {report.observations.map((obs, index) => {
            const riskColor = getRiskLevelColor(obs.riskLevel)
            const statusColor = getStatusColor(obs.status)

            return (
              <div key={obs.id} className="card">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary-600">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900">
                        {language === 'ar' && obs.titleAr ? obs.titleAr : obs.title}
                      </h4>
                      <span className={`badge ${riskColor.bg} ${riskColor.text}`}>
                        {t(`riskLevels.${obs.riskLevel.toLowerCase()}`)}
                      </span>
                      <span className={`badge ${statusColor.bg} ${statusColor.text}`}>
                        {t(`statuses.${obs.status.toLowerCase()}`)}
                      </span>
                    </div>
                    {(obs.description || obs.descriptionAr) && (
                      <p className="text-gray-600 mb-3">
                        {language === 'ar' && obs.descriptionAr ? obs.descriptionAr : obs.description}
                      </p>
                    )}
                    <ObservationImages images={obs.images} t={t} />
                    <ClientActionForm
                      observation={obs}
                      language={language}
                      reportDate={report.date}
                      onImageUploaded={(newImg) => {
                        onObservationUpdated?.(obs.id, newImg)
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function getSlaDays(riskLevel: string) {
  switch (riskLevel?.toUpperCase()) {
    case 'CRITICAL':
      return 2
    case 'HIGH':
      return 7
    case 'MEDIUM':
      return 14
    case 'LOW':
    default:
      return 30
  }
}

function ClientActionForm({
  observation,
  language,
  reportDate,
  onImageUploaded,
}: {
  observation: Observation
  language: string
  reportDate?: string
  onImageUploaded?: (newImage: Image) => void
}) {
  const isArabic = language === 'ar'
  const [response, setResponse] = useState(observation.clientResponse || '')
  const [action, setAction] = useState(observation.correctiveAction || '')
  const [status, setStatus] = useState(observation.correctiveActionStatus || 'IN_PROGRESS')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [afterImages, setAfterImages] = useState<Image[]>(
    (observation.images || []).filter((img) => img.type === 'AFTER')
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const slaDays = getSlaDays(observation.riskLevel)
  const baseDate = reportDate ? new Date(reportDate) : new Date()
  const deadline = new Date(baseDate.getTime() + slaDays * 24 * 60 * 60 * 1000)
  const [now] = useState(() => Date.now())
  const isClosed = observation.status === 'CLOSED' || observation.correctiveActionStatus === 'APPROVED'
  const isOverdue = !isClosed && now > deadline.getTime()
  const daysDiff = Math.ceil((deadline.getTime() - now) / (1000 * 60 * 60 * 24))

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('observationId', observation.id)
    formData.append('type', 'AFTER')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to upload photo')
      }
      const newImg = await res.json()
      setAfterImages((prev) => [...prev, newImg])
      setStatus('PENDING_REVIEW')
      if (onImageUploaded) onImageUploaded(newImg)
      toast.success(isArabic ? 'تم رفع صورة إثبات المعالجة بنجاح' : 'Rectification photo uploaded')
    } catch (err: any) {
      toast.error(err.message || (isArabic ? 'تعذر رفع الصورة' : 'Failed to upload image'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const result = await fetch(`/api/observations/${observation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientResponse: response,
          correctiveAction: action,
          correctiveActionStatus: status,
        }),
      })
      if (!result.ok) throw new Error()
      toast.success(isArabic ? 'تم حفظ الرد والإجراء التصحيحي' : 'Response and corrective action saved')
    } catch {
      toast.error(isArabic ? 'تعذر الحفظ' : 'Unable to save')
    } finally {
      setSaving(false)
    }
  }

  const formattedDeadline = deadline.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      {/* SLA & Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600">
            {isArabic ? 'مهلة المعالجة النظامية (SLA):' : 'Corrective SLA Due Date:'}
          </span>
          <span className="text-xs font-bold text-slate-800">{formattedDeadline}</span>
        </div>

        <div>
          {isClosed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3 w-3" />
              {isArabic ? 'معتمد ومغلق' : 'Approved & Closed'}
            </span>
          ) : isOverdue ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-800">
              <ShieldAlert className="h-3 w-3" />
              {isArabic ? `متأخر عن المهلة (${Math.abs(daysDiff)} يوم)` : `Overdue by ${Math.abs(daysDiff)} days`}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              <Clock className="h-3 w-3" />
              {isArabic ? `متبقي ${daysDiff} يوم` : `${daysDiff} days remaining`}
            </span>
          )}
        </div>
      </div>

      {/* Review Status Banner */}
      {status === 'PENDING_REVIEW' && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{isArabic ? 'تم تقديم الإجراء وهو قيد مراجعة واعتماد الاستشاري' : 'Action submitted and pending consultant review.'}</span>
        </div>
      )}

      {status === 'APPROVED' && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{isArabic ? 'تم اعتماد هذا الإجراء التصحيحي رسمياً من الاستشاري' : 'This corrective action has been officially approved.'}</span>
        </div>
      )}

      {status === 'REVISION_REQUESTED' && (
        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-900 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{isArabic ? 'طلب الاستشاري إعادة النظر وتعديل الإجراء أو رفع إثبات إضافي' : 'Consultant requested revision on this action.'}</span>
        </div>
      )}

      {/* Text inputs */}
      <div className="mt-3 space-y-2.5">
        <div>
          <label className="text-xs font-bold text-slate-700">
            {isArabic ? 'رد المنشأة / العميل على الملاحظة:' : 'Client response to observation:'}
          </label>
          <textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            className="input-field mt-1 resize-none bg-white text-sm"
            rows={2}
            placeholder={isArabic ? 'أضف ردك أو توضيح المنشأة بشأن الملاحظة...' : 'Add your company explanation...'}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700">
            {isArabic ? 'الإجراء التصحيحي المتخذ لمعالجة الخطر (CAPA):' : 'Corrective action taken or planned:'}
          </label>
          <textarea
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="input-field mt-1 resize-none bg-white text-sm"
            rows={2}
            placeholder={isArabic ? 'اشرح الإجراء التصحيحي المنفذ لإزالة الخطر وتفادي تكراره...' : 'Describe corrective steps taken...'}
          />
        </div>
      </div>

      {/* Attached After Photos */}
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700">
            {isArabic ? 'صور إثبات المعالجة (بعد الإصلاح):' : 'Rectification Proof Photos (After):'}
          </span>

          <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-primary-300 bg-white px-3 py-1 text-xs font-bold text-primary-700 shadow-sm transition hover:bg-primary-50 active:scale-95">
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {isArabic ? 'جاري الرفع...' : 'Uploading...'}
              </>
            ) : (
              <>
                <Camera className="h-3.5 w-3.5" />
                {isArabic ? 'رفع صورة إثبات' : 'Upload Proof Photo'}
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              disabled={uploading}
              onChange={handleUploadPhoto}
            />
          </label>
        </div>

        {afterImages.length > 0 && (
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
            {afterImages.map((img) => (
              <a
                key={img.id || img.url}
                href={img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <NextImage
                  src={img.url}
                  alt="Proof"
                  fill
                  unoptimized
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <span className="absolute bottom-1 start-1 rounded bg-emerald-600 px-1 py-0.5 text-[9px] font-bold text-white shadow">
                  {isArabic ? 'بعد المعالجة' : 'After'}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/60 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{isArabic ? 'حالة الإجراء:' : 'Status:'}</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field w-auto bg-white py-1 text-xs"
          >
            <option value="IN_PROGRESS">{isArabic ? 'قيد التنفيذ' : 'In Progress'}</option>
            <option value="PENDING_REVIEW">{isArabic ? 'تم الإنجاز (بانتظار الاعتماد)' : 'Submitted for Review'}</option>
            <option value="COMPLETED">{isArabic ? 'مكتمل' : 'Completed'}</option>
          </select>
        </div>

        <button
          onClick={() => void save()}
          disabled={saving}
          className="btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold"
        >
          {saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {isArabic ? 'جاري الحفظ...' : 'Saving...'}
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              {isArabic ? 'حفظ وإرسال للمراجعة' : 'Save & Submit'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
