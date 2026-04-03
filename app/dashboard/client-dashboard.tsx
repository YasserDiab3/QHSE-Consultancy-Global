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
} from 'lucide-react'
import { getRiskLevelColor, getStatusColor, getCategoryColor } from '@/lib/colors'
import Header from '@/components/Header'
import { generateReportPDF } from '@/lib/pdf'
import toast from 'react-hot-toast'

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
}

type Image = {
  id: string
  type: string
  url: string
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

  const handleDownloadPDF = (report: Report) => {
    try {
      generateReportPDF(report, t, language)
      toast.success('PDF downloaded')
    } catch (error) {
      toast.error('Failed to generate PDF')
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

      <main className="pt-20 pb-12">
        <div className="container-custom">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {t('reports.title')}
              </h1>
              <p className="text-gray-600 mt-1">{t('reports.subtitle')}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary px-4 py-2"
              >
                <Filter className="w-4 h-4" />
                {t('common.filter')}
              </button>
            </div>
          </div>

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
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDownloadPDF(report)
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
        </div>
      </main>
    </div>
  )
}

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
  onDownloadPDF: (report: Report) => void
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
              onClick={() => onDownloadPDF(report)}
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
                    {obs.images.length > 0 && (
                      <div className="flex items-center gap-3 mt-3">
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">{obs.images.length} {t('reports.photos')}</span>
                        <div className="flex gap-2 overflow-x-auto">
                          {obs.images.map((img) => (
                            <img
                              key={img.id}
                              src={img.url}
                              alt={img.type}
                              className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                            />
                          ))}
                        </div>
                      </div>
                    )}
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
