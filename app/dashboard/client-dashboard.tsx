'use client'

import { useLanguage } from '@/context'
import { useSession } from 'next-auth/react'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  MapPin,
  Shield,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  Image as ImageIcon,
  LayoutDashboard,
  BarChart3,
} from 'lucide-react'
import { getRiskLevelColor, getStatusColor, getCategoryColor } from '@/lib/colors'
import Header from '@/components/Header'
import { downloadClientReportPdf } from '@/lib/report-pdf'
import toast from 'react-hot-toast'
import DashboardSignOutButton from '@/components/DashboardSignOutButton'

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
              <img
                key={img.id}
                src={img.url}
                alt={group.label}
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
  const { data: session } = useSession()
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'performance'>('dashboard')

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
            <div className="flex items-center gap-3">
              <DashboardSignOutButton />
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary px-4 py-2"
              >
                <Filter className="w-4 h-4" />
                {t('common.filter')}
              </button>
            </div>
          </div>

          <div className="mb-6 flex w-fit items-center gap-1 rounded-xl border border-gray-200 bg-white p-1">
            {[
              ['dashboard', language === 'ar' ? 'لوحة التحكم' : 'Dashboard', LayoutDashboard],
              ['reports', language === 'ar' ? 'تقارير الزيارات' : 'Visit reports', FileText],
              ['performance', language === 'ar' ? 'مؤشرات الأداء' : 'Performance', BarChart3],
            ].map(([id, label, Icon]) => <button key={id as string} onClick={() => { setActiveTab(id as 'dashboard' | 'reports' | 'performance'); setSelectedReport(null) }} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${activeTab === id ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}><Icon className="h-4 w-4" />{label as string}</button>)}
          </div>

          {activeTab === 'dashboard' ? <ClientOverview reports={reports} language={language} onReports={() => setActiveTab('reports')} /> : activeTab === 'performance' ? <ClientPerformance reports={reports} language={language} /> : <>

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
            />
          ) : (
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
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
}: {
  report: Report
  onBack: () => void
  onDownloadPDF: (report: Report) => Promise<void>
  t: (key: string) => string
  language: string
  dir: string
  formatDate: (date: string) => string
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
          <div className="flex items-center gap-3">
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
                    <ClientActionForm observation={obs} language={language} />
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

function ClientActionForm({ observation, language }: { observation: Observation; language: string }) {
  const [response, setResponse] = useState(observation.clientResponse || '')
  const [action, setAction] = useState(observation.correctiveAction || '')
  const [status, setStatus] = useState(observation.correctiveActionStatus || 'IN_PROGRESS')
  const [saving, setSaving] = useState(false)
  const save = async () => { setSaving(true); try { const result = await fetch(`/api/observations/${observation.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientResponse: response, correctiveAction: action, correctiveActionStatus: status }) }); if (!result.ok) throw new Error(); toast.success(language === 'ar' ? 'تم حفظ الرد والإجراء التصحيحي' : 'Response and corrective action saved') } catch { toast.error(language === 'ar' ? 'تعذر الحفظ' : 'Unable to save') } finally { setSaving(false) } }
  return <div className="mt-4 rounded-xl border border-primary-100 bg-primary-50/60 p-4"><h5 className="font-bold text-primary-900">{language === 'ar' ? 'رد العميل والإجراء التصحيحي' : 'Client response and corrective action'}</h5><textarea value={response} onChange={(event) => setResponse(event.target.value)} className="input-field mt-3 resize-none bg-white" rows={2} placeholder={language === 'ar' ? 'أضف ردك على ملاحظة الاستشاري' : 'Add your response to the consultant observation'} /><textarea value={action} onChange={(event) => setAction(event.target.value)} className="input-field mt-3 resize-none bg-white" rows={2} placeholder={language === 'ar' ? 'الإجراء التصحيحي المتخذ أو المخطط' : 'Corrective action taken or planned'} /><div className="mt-3 flex flex-wrap items-center gap-3"><select value={status} onChange={(event) => setStatus(event.target.value)} className="input-field w-auto bg-white"><option value="IN_PROGRESS">{language === 'ar' ? 'قيد التنفيذ' : 'In progress'}</option><option value="COMPLETED">{language === 'ar' ? 'مكتمل' : 'Completed'}</option><option value="PENDING">{language === 'ar' ? 'بانتظار الإجراء' : 'Pending'}</option></select><button onClick={() => void save()} disabled={saving} className="btn-primary px-4 py-2">{saving ? '...' : language === 'ar' ? 'حفظ الإجراء' : 'Save action'}</button></div></div>
}
