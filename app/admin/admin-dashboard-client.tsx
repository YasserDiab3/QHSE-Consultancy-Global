'use client'

import { useLanguage } from '@/context'
import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileText,
  MessageSquare,
  TrendingUp,
  Users,
} from 'lucide-react'
import Header from '@/components/Header'
import AdminReports from './admin-reports'
import AdminClients from './admin-clients'
import AdminActivityLog from './admin-activity-log'
import AdminContactRequests from './admin-contact-requests'

type DashboardStats = {
  totalReports: number
  openObservations: number
  closedReports: number
  highRiskItems: number
  totalClients: number
  totalRequests: number
  riskBreakdown: { riskLevel: string; _count: { riskLevel: number } }[]
  statusBreakdown: { status: string; _count: { status: number } }[]
  requestStatusBreakdown: { status: string; _count: { status: number } }[]
  recentReports: Array<{
    id: string
    siteName: string
    date: string
    category: string
    status: string
    _count?: { observations?: number }
  }>
}

type ReportFilterPreset = {
  status?: string
  riskLevel?: string
} | null

type RequestStatusPreset = 'ALL' | 'NEW' | 'CONTACTED' | 'CLOSED'
type AdminTab = 'overview' | 'reports' | 'clients' | 'requests' | 'activity'

export default function AdminDashboardClient() {
  const { t, language, dir } = useLanguage()
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const [reportFilterPreset, setReportFilterPreset] = useState<ReportFilterPreset>(null)
  const [requestFilterPreset, setRequestFilterPreset] = useState<RequestStatusPreset>('ALL')
  const contentAnchorRef = useRef<HTMLDivElement | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }

      setStats(await res.json())
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  useEffect(() => {
    if (activeTab === 'overview') {
      void fetchStats()
    }
  }, [activeTab, fetchStats])

  const activateTab = useCallback((tab: AdminTab) => {
    setActiveTab(tab)

    requestAnimationFrame(() => {
      contentAnchorRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [])

  const tabs = useMemo(
    () => [
      { id: 'overview' as const, label: t('dashboard.title'), icon: BarChart3 },
      { id: 'reports' as const, label: t('admin.reports'), icon: FileText },
      { id: 'clients' as const, label: t('admin.clients'), icon: Users },
      { id: 'requests' as const, label: language === 'ar' ? 'طلبات التواصل' : 'Contact Requests', icon: MessageSquare },
      { id: 'activity' as const, label: t('admin.activityLog'), icon: Activity },
    ],
    [language, t]
  )

  const openReports = useCallback((preset?: ReportFilterPreset) => {
    setReportFilterPreset(preset ?? null)
    activateTab('reports')
  }, [activateTab])

  const openClients = useCallback(() => {
    activateTab('clients')
  }, [activateTab])

  const openRequests = useCallback((status: RequestStatusPreset = 'ALL') => {
    setRequestFilterPreset(status)
    activateTab('requests')
  }, [activateTab])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pb-12 pt-20">
        <div className="container-custom">
          <div ref={contentAnchorRef} />
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{t('admin.title')}</h1>
            <p className="mt-1 text-gray-600">
              {t('dashboard.welcome')}, {session?.user?.name}
            </p>
          </div>

          <div className="mb-8 flex w-fit items-center gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => activateTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <OverviewTab
              stats={stats}
              loading={loading}
              t={t}
              dir={dir}
              language={language}
              onOpenReports={openReports}
              onOpenClients={openClients}
              onOpenRequests={openRequests}
            />
          )}
          {activeTab === 'reports' && (
            <AdminReports onDataChanged={fetchStats} filterPreset={reportFilterPreset} />
          )}
          {activeTab === 'clients' && <AdminClients onDataChanged={fetchStats} />}
          {activeTab === 'requests' && (
            <AdminContactRequests
              statusFilter={requestFilterPreset}
              onDataChanged={fetchStats}
            />
          )}
          {activeTab === 'activity' && <AdminActivityLog />}
        </div>
      </main>
    </div>
  )
}

function OverviewTab({
  stats,
  loading,
  t,
  dir,
  language,
  onOpenReports,
  onOpenClients,
  onOpenRequests,
}: {
  stats: DashboardStats | null
  loading: boolean
  t: (key: string) => string
  dir: 'ltr' | 'rtl'
  language: string
  onOpenReports: (preset?: ReportFilterPreset) => void
  onOpenClients: () => void
  onOpenRequests: (status?: RequestStatusPreset) => void
}) {
  const textAlign = dir === 'rtl' ? 'text-right' : 'text-left'

  const summaryCards = [
    {
      label: t('dashboard.totalReports'),
      value: stats?.totalReports || 0,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      onClick: () => onOpenReports(),
    },
    {
      label: t('dashboard.openObservations'),
      value: stats?.openObservations || 0,
      icon: AlertTriangle,
      color: 'from-amber-500 to-amber-600',
      onClick: () => onOpenReports({ status: 'OPEN' }),
    },
    {
      label: t('dashboard.closedReports'),
      value: stats?.closedReports || 0,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-emerald-600',
      onClick: () => onOpenReports({ status: 'CLOSED' }),
    },
    {
      label: t('dashboard.highRiskItems'),
      value: stats?.highRiskItems || 0,
      icon: TrendingUp,
      color: 'from-red-500 to-red-600',
      onClick: () => onOpenReports({ riskLevel: 'HIGH,CRITICAL' }),
    },
    {
      label: language === 'ar' ? 'إجمالي العملاء' : 'Total Clients',
      value: stats?.totalClients || 0,
      icon: Users,
      color: 'from-violet-500 to-violet-600',
      onClick: () => onOpenClients(),
    },
    {
      label: language === 'ar' ? 'إجمالي الطلبات' : 'Total Requests',
      value: stats?.totalRequests || 0,
      icon: MessageSquare,
      color: 'from-cyan-500 to-cyan-600',
      onClick: () => onOpenRequests('ALL'),
    },
  ]

  const requestStatusCount = (status: 'NEW' | 'CONTACTED' | 'CLOSED') =>
    stats?.requestStatusBreakdown?.find((item) => item.status === status)?._count.status || 0

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card, i) => (
          <div key={i} className="card animate-pulse">
            <div className="mb-4 h-4 w-24 rounded bg-gray-200" />
            <div className="h-8 w-16 rounded bg-gray-200" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card, i) => (
          <button
            key={i}
            type="button"
            onClick={card.onClick}
            className="card text-start transition-shadow hover:shadow-md hover:ring-2 hover:ring-primary-200"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">{card.label}</span>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.color}`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{card.value}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">
              {language === 'ar' ? 'حالات طلبات التواصل' : 'Request Statuses'}
            </h3>
            <button
              type="button"
              onClick={() => onOpenRequests('ALL')}
              className="text-sm font-medium text-primary-500 hover:text-primary-600"
            >
              {language === 'ar' ? 'عرض الطلبات' : 'Open requests'}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onOpenRequests('NEW')}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-start transition hover:border-primary-200 hover:bg-primary-50"
            >
              <p className="text-sm font-medium text-slate-600">{language === 'ar' ? 'جديد' : 'New'}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{requestStatusCount('NEW')}</p>
            </button>
            <button
              type="button"
              onClick={() => onOpenRequests('CONTACTED')}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-start transition hover:border-primary-200 hover:bg-primary-50"
            >
              <p className="text-sm font-medium text-slate-600">{language === 'ar' ? 'تم التواصل' : 'Contacted'}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{requestStatusCount('CONTACTED')}</p>
            </button>
            <button
              type="button"
              onClick={() => onOpenRequests('CLOSED')}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-start transition hover:border-primary-200 hover:bg-primary-50"
            >
              <p className="text-sm font-medium text-slate-600">{language === 'ar' ? 'مغلق' : 'Closed'}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{requestStatusCount('CLOSED')}</p>
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="mb-6 text-lg font-bold text-gray-900">{t('dashboard.riskOverview')}</h3>
          <div className="space-y-4">
            {stats?.riskBreakdown?.length ? (
              stats.riskBreakdown.map((item) => {
                const colors: Record<string, string> = {
                  LOW: 'bg-green-500',
                  MEDIUM: 'bg-yellow-500',
                  HIGH: 'bg-orange-500',
                  CRITICAL: 'bg-red-500',
                }
                const total = stats.riskBreakdown.reduce((sum, i) => sum + i._count.riskLevel, 0)
                const percentage = total > 0 ? (item._count.riskLevel / total) * 100 : 0

                return (
                  <div key={item.riskLevel}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {t(`riskLevels.${item.riskLevel.toLowerCase()}`)}
                      </span>
                      <span className="text-sm text-gray-500">{item._count.riskLevel}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <button
                        type="button"
                        onClick={() => onOpenReports({ riskLevel: item.riskLevel })}
                        className={`block h-2 rounded-full ${colors[item.riskLevel] || 'bg-gray-500'}`}
                        style={{ width: `${percentage}%` }}
                        aria-label={`Open ${item.riskLevel} risk reports`}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-gray-500">
                {language === 'ar' ? 'لا توجد بيانات مخاطر حتى الآن' : 'No risk data yet'}
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="mb-6 text-lg font-bold text-gray-900">{t('dashboard.statusDistribution')}</h3>
          <div className="space-y-4">
            {stats?.statusBreakdown?.length ? (
              stats.statusBreakdown.map((item) => {
                const colors: Record<string, string> = {
                  OPEN: 'bg-blue-500',
                  CLOSED: 'bg-gray-500',
                  IN_PROGRESS: 'bg-purple-500',
                  RESOLVED: 'bg-emerald-500',
                }
                const total = stats.statusBreakdown.reduce((sum, i) => sum + i._count.status, 0)
                const percentage = total > 0 ? (item._count.status / total) * 100 : 0

                return (
                  <div key={item.status}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {t(`statuses.${item.status.toLowerCase()}`)}
                      </span>
                      <span className="text-sm text-gray-500">{item._count.status}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <button
                        type="button"
                        onClick={() => onOpenReports({ status: item.status })}
                        className={`block h-2 rounded-full ${colors[item.status] || 'bg-gray-500'}`}
                        style={{ width: `${percentage}%` }}
                        aria-label={`Open ${item.status} reports`}
                      />
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-gray-500">
                {language === 'ar' ? 'لا توجد حالات تقارير بعد' : 'No report status data yet'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{t('dashboard.recentReports')}</h3>
          <button
            type="button"
            onClick={() => onOpenReports()}
            className="text-sm font-medium text-primary-500 hover:text-primary-600"
          >
            {t('dashboard.viewAll')}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className={`${textAlign} px-4 py-3 text-sm font-medium text-gray-500`}>{t('reports.siteName')}</th>
                <th className={`${textAlign} px-4 py-3 text-sm font-medium text-gray-500`}>{t('reports.date')}</th>
                <th className={`${textAlign} px-4 py-3 text-sm font-medium text-gray-500`}>{t('reports.category')}</th>
                <th className={`${textAlign} px-4 py-3 text-sm font-medium text-gray-500`}>{t('reports.status')}</th>
                <th className={`${textAlign} px-4 py-3 text-sm font-medium text-gray-500`}>{t('reports.observations')}</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentReports?.length ? (
                stats.recentReports.map((report) => (
                  <tr
                    key={report.id}
                    className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                    onClick={() => onOpenReports()}
                  >
                    <td className={`${textAlign} px-4 py-3 text-sm font-medium text-gray-900`}>{report.siteName}</td>
                    <td className={`${textAlign} px-4 py-3 text-sm text-gray-600`}>
                      {new Date(report.date).toLocaleDateString()}
                    </td>
                    <td className={`${textAlign} px-4 py-3 text-sm`}>
                      <span className="badge bg-gray-100 text-gray-800">{report.category}</span>
                    </td>
                    <td className={`${textAlign} px-4 py-3 text-sm`}>
                      <span
                        className={`badge ${
                          report.status === 'CLOSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {t(`statuses.${String(report.status).toLowerCase()}`)}
                      </span>
                    </td>
                    <td className={`${textAlign} px-4 py-3 text-sm text-gray-600`}>
                      {report._count?.observations || 0}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                    {language === 'ar' ? 'لا توجد تقارير حديثة حتى الآن' : 'No recent reports yet'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
