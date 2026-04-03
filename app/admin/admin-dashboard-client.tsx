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
  Users,
  FileBarChart,
  Activity,
  BarChart3,
  Shield,
} from 'lucide-react'
import Header from '@/components/Header'
import AdminReports from './admin-reports'
import AdminClients from './admin-clients'
import AdminActivityLog from './admin-activity-log'

type DashboardStats = {
  totalReports: number
  openObservations: number
  closedReports: number
  highRiskItems: number
  riskBreakdown: { riskLevel: string; _count: { riskLevel: number } }[]
  statusBreakdown: { status: string; _count: { status: number } }[]
  recentReports: any[]
}

export default function AdminDashboardClient() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'clients' | 'activity'>('overview')

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const tabs = [
    { id: 'overview' as const, label: t('dashboard.title'), icon: BarChart3 },
    { id: 'reports' as const, label: t('admin.reports'), icon: FileText },
    { id: 'clients' as const, label: t('admin.clients'), icon: Users },
    { id: 'activity' as const, label: t('admin.activityLog'), icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="pt-20 pb-12">
        <div className="container-custom">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('admin.title')}</h1>
            <p className="text-gray-600 mt-1">
              {t('dashboard.welcome')}, {session?.user?.name}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-8 bg-white rounded-xl p-1 border border-gray-200 w-fit overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <OverviewTab stats={stats} loading={loading} t={t} />
          )}
          {activeTab === 'reports' && <AdminReports />}
          {activeTab === 'clients' && <AdminClients />}
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
}: {
  stats: DashboardStats | null
  loading: boolean
  t: (key: string) => string
}) {
  const summaryCards = [
    {
      label: t('dashboard.totalReports'),
      value: stats?.totalReports || 0,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: t('dashboard.openObservations'),
      value: stats?.openObservations || 0,
      icon: AlertTriangle,
      color: 'from-amber-500 to-amber-600',
    },
    {
      label: t('dashboard.closedReports'),
      value: stats?.closedReports || 0,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-emerald-600',
    },
    {
      label: t('dashboard.highRiskItems'),
      value: stats?.highRiskItems || 0,
      icon: TrendingUp,
      color: 'from-red-500 to-red-600',
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, i) => (
          <div key={i} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-600">{card.label}</span>
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Overview */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-6">{t('dashboard.riskOverview')}</h3>
          <div className="space-y-4">
            {stats?.riskBreakdown?.map((item) => {
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
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {t(`riskLevels.${item.riskLevel.toLowerCase()}`)}
                    </span>
                    <span className="text-sm text-gray-500">{item._count.riskLevel}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${colors[item.riskLevel] || 'bg-gray-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-6">{t('dashboard.statusDistribution')}</h3>
          <div className="space-y-4">
            {stats?.statusBreakdown?.map((item) => {
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
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {t(`statuses.${item.status.toLowerCase()}`)}
                    </span>
                    <span className="text-sm text-gray-500">{item._count.status}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${colors[item.status] || 'bg-gray-500'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">{t('dashboard.recentReports')}</h3>
          <Link href="/admin" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
            {t('dashboard.viewAll')}
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('reports.siteName')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('reports.date')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('reports.category')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('reports.status')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('reports.observations')}</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentReports?.map((report: any) => (
                <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{report.siteName}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(report.date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`badge ${report.category.toLowerCase().includes('safety') ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {report.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`badge ${report.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{report._count?.observations || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
