'use client'

import { useLanguage } from '@/context'
import { useEffect, useState, useCallback } from 'react'
import {
  Radio,
  MapPin,
  ExternalLink,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Search,
  RefreshCw,
  Download,
  Copy,
  Check,
  Building2,
  Calendar,
  Shield,
  Loader2,
  Info,
  X,
} from 'lucide-react'
import { exportUserSessionsToCsv } from '@/lib/export-excel'
import toast from 'react-hot-toast'
import type { UserSessionRecord, UserSessionSummaryStats } from '@/lib/user-session-records'

function formatRelativeTime(isoString?: string | null, isAr = false) {
  if (!isoString) return '-'
  const ms = Math.max(0, Date.now() - new Date(isoString).getTime())
  const minutes = Math.floor(ms / (1000 * 60))
  if (minutes < 1) return isAr ? 'الآن' : 'Just now'
  if (minutes === 1) return isAr ? 'منذ دقيقة' : '1 min ago'
  if (minutes < 60) return isAr ? `منذ ${minutes} دقيقة` : `${minutes} mins ago`
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return isAr ? 'منذ ساعة' : '1 hour ago'
  if (hours < 24) return isAr ? `منذ ${hours} ساعة` : `${hours} hours ago`
  const days = Math.floor(hours / 24)
  return isAr ? `منذ ${days} يوم` : `${days} days ago`
}

function formatDateTime(isoString?: string | null, isAr = false) {
  if (!isoString) return '-'
  return new Date(isoString).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function AdminUserSessions() {
  const { language } = useLanguage()
  const isAr = language === 'ar'

  const [sessions, setSessions] = useState<UserSessionRecord[]>([])
  const [stats, setStats] = useState<UserSessionSummaryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [copiedIp, setCopiedIp] = useState<string | null>(null)

  // Selected session for detailed modal
  const [selectedSession, setSelectedSession] = useState<UserSessionRecord | null>(null)

  const fetchSessions = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true)
      else setLoading(true)

      try {
        const params = new URLSearchParams()
        if (roleFilter !== 'ALL') params.set('role', roleFilter)
        if (statusFilter !== 'ALL') params.set('status', statusFilter)
        if (searchQuery.trim()) params.set('search', searchQuery.trim())
        params.set('language', language)

        const res = await fetch(`/api/admin/user-sessions?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to fetch user sessions')

        const data = await res.json()
        setSessions(data.sessions || [])
        setStats(data.stats || null)
      } catch (error) {
        console.error('Error loading user sessions:', error)
        toast.error(
          isAr
            ? 'تعذر تحميل بيانات جلسات المستخدمين'
            : 'Failed to load user sessions data'
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [isAr, language, roleFilter, searchQuery, statusFilter]
  )

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Periodic background refresh every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      fetchSessions(true)
    }, 30000)
    return () => clearInterval(timer)
  }, [fetchSessions])

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip)
    setCopiedIp(ip)
    toast.success(isAr ? `تم نسخ IP: ${ip}` : `IP copied: ${ip}`)
    setTimeout(() => setCopiedIp(null), 2500)
  }

  const handleExport = () => {
    if (sessions.length === 0) {
      toast.error(isAr ? 'لا توجد بيانات جلسات لتصديرها' : 'No session data to export')
      return
    }
    exportUserSessionsToCsv(sessions, language)
    toast.success(isAr ? 'تم تصدير سجل الجلسات إلى ملف Excel' : 'Sessions exported to Excel')
  }

  const getDeviceIcon = (device?: string | null) => {
    const d = (device || '').toLowerCase()
    if (d === 'mobile') return <Smartphone className="h-4 w-4 text-purple-600" />
    if (d === 'tablet') return <Tablet className="h-4 w-4 text-indigo-600" />
    return <Laptop className="h-4 w-4 text-blue-600" />
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            {isAr ? 'متصل الآن' : 'Online'}
          </span>
        )
      case 'IDLE':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <span className="h-2 w-2 rounded-full bg-amber-400"></span>
            {isAr ? 'خامل مؤخراً' : 'Idle'}
          </span>
        )
      case 'LOGGED_OUT':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/10">
            <span className="h-2 w-2 rounded-full bg-slate-400"></span>
            {isAr ? 'تسجيل خروج' : 'Logged out'}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
            <span className="h-2 w-2 rounded-full bg-gray-400"></span>
            {isAr ? 'غير متصل' : 'Offline'}
          </span>
        )
    }
  }

  const getRoleBadge = (role: string) => {
    const r = role.toUpperCase()
    if (r === 'CLIENT') {
      return (
        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
          {isAr ? 'عميل' : 'Client'}
        </span>
      )
    }
    if (r === 'ADMIN') {
      return (
        <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-700/10">
          {isAr ? 'مدير النظام' : 'Admin'}
        </span>
      )
    }
    if (r === 'CONSULTANT') {
      return (
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-700/10">
          {isAr ? 'استشاري' : 'Consultant'}
        </span>
      )
    }
    return (
      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-700/10">
        {isAr ? 'متدرب' : 'Trainee'}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 md:text-2xl">
              {isAr ? 'حالة دخول وتواجد المستخدمين والعملاء' : 'User & Client Login Status & Live Presence'}
            </h2>
            <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
              {isAr ? 'مباشر وتتبعي' : 'Live & Telemetry'}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {isAr
              ? 'متابعة شاملة لجلسات الدخول، الموقع الجغرافي، الإحداثيات، عناوين IP، وحالة التواجد الحية للعملاء ومستخدمي النظام'
              : 'Complete audit of login sessions, geographic locations, GPS coordinates, IP addresses, and real-time user presence'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            title={isAr ? 'تصدير سجل الجلسات إلى ملف Excel' : 'Export sessions to Excel'}
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>{isAr ? 'تصدير السجل (Excel)' : 'Export (Excel)'}</span>
          </button>

          <button
            onClick={() => fetchSessions(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-75"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{isAr ? 'تحديث' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Now */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-900">
              {isAr ? 'المتصلون الآن (Online)' : 'Online Now'}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 md:text-3xl">
              {stats?.totalActiveNow ?? 0}
            </span>
            <span className="text-xs text-emerald-700 font-medium">
              {isAr ? 'مستخدم نشط حالياً' : 'active users'}
            </span>
          </div>
        </div>

        {/* Active Clients */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {isAr ? 'عملاء متصلون' : 'Active Clients'}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 md:text-3xl">
              {stats?.clientsActiveNow ?? 0}
            </span>
            <span className="text-xs text-blue-700 font-medium">
              {isAr ? 'حسابات شركات نشطة' : 'client companies'}
            </span>
          </div>
        </div>

        {/* Total Logins Today */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              {isAr ? 'تسجيلات الدخول اليوم' : 'Logins Today'}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 md:text-3xl">
              {stats?.totalLoginsToday ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {isAr ? 'جلسة مسجلة' : 'recorded sessions'}
            </span>
          </div>
        </div>

        {/* Locations */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              {isAr ? 'المواقع والدول' : 'Active Locations'}
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Globe className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 md:text-3xl">
              {stats?.uniqueCities ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {isAr
                ? `مدينة في ${stats?.uniqueCountries ?? 0} دول`
                : `cities in ${stats?.uniqueCountries ?? 0} countries`}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isAr
                  ? 'بحث بالاسم، البريد الإلكتروني، الشركة، عنوان IP، أو المدينة...'
                  : 'Search by name, email, company, IP address, or city...'
              }
              className="w-full rounded-xl border border-slate-200 py-2 pe-4 ps-9 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label={isAr ? 'تصفية حسب نوع المستخدم' : 'Filter by user role'}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="ALL">{isAr ? 'جميع المستخدمين' : 'All Roles'}</option>
              <option value="CLIENT">{isAr ? 'العملاء فقط' : 'Clients Only'}</option>
              <option value="ADMIN">{isAr ? 'المدراء' : 'Admins'}</option>
              <option value="TRAINEE">{isAr ? 'المتدربون' : 'Trainees'}</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label={isAr ? 'تصفية حسب حالة الاتصال' : 'Filter by connection status'}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="ALL">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
              <option value="ONLINE">{isAr ? 'متصل الآن (Online)' : 'Online Now'}</option>
              <option value="OFFLINE">{isAr ? 'غير متصل (Offline)' : 'Offline'}</option>
              <option value="LOGGED_OUT">{isAr ? 'تسجيل خروج' : 'Logged Out'}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-9 w-9 animate-spin text-primary-600" />
          <p className="mt-3 text-sm text-gray-500">
            {isAr ? 'جاري تحميل سجلات الدخول وتواجد المستخدمين...' : 'Loading session & telemetry data...'}
          </p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <Radio className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-3 text-base font-semibold text-gray-900">
            {isAr ? 'لا توجد جلسات مسجلة تطابق التصفية' : 'No recorded sessions match filters'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {isAr
              ? 'جرّب تغيير عبارة البحث أو اختيار كل الحالات لعرض كامل الجلسات'
              : 'Try adjusting your search criteria or resetting filters'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm w-full max-w-full">
          <div className="w-full max-w-full overflow-x-auto">
            <table className="w-full min-w-[950px] border-collapse text-start">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-4 py-3.5 text-start">{isAr ? 'المستخدم / العميل' : 'User / Client'}</th>
                  <th className="px-4 py-3.5 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="px-4 py-3.5 text-start">{isAr ? 'الموقع والمكان' : 'Location & City'}</th>
                  <th className="px-4 py-3.5 text-start">{isAr ? 'الإحداثيات الجغرافية' : 'Coordinates (GPS)'}</th>
                  <th className="px-4 py-3.5 text-start">{isAr ? 'عنوان IP' : 'IP Address'}</th>
                  <th className="px-4 py-3.5 text-start">{isAr ? 'الجهاز والمتصفح' : 'Device & Browser'}</th>
                  <th className="px-4 py-3.5 text-start">{isAr ? 'تاريخ ووقت الدخول' : 'Login Time'}</th>
                  <th className="px-4 py-3.5 text-center">{isAr ? 'تفاصيل' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((sess) => {
                  const companyName = sess.user.client
                    ? isAr
                      ? sess.user.client.companyNameAr || sess.user.client.companyName
                      : sess.user.client.companyName
                    : null

                  const hasCoords = sess.latitude !== null && sess.longitude !== null

                  return (
                    <tr
                      key={sess.id}
                      className="group transition-colors hover:bg-slate-50/70"
                    >
                      {/* User identity & Client company */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700">
                            {sess.user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-gray-900">{sess.user.name}</p>
                              {getRoleBadge(sess.user.role)}
                            </div>
                            <p className="text-xs text-gray-500">{sess.user.email}</p>
                            {companyName && (
                              <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-primary-700">
                                <Building2 className="h-3 w-3 shrink-0" />
                                <span>{companyName}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Connection status */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          {getStatusBadge(sess.status)}
                          <p className="text-[11px] text-gray-500">
                            {sess.status === 'ACTIVE'
                              ? isAr
                                ? `نشط ${formatRelativeTime(sess.lastActiveAt, true)}`
                                : `Active ${formatRelativeTime(sess.lastActiveAt, false)}`
                              : isAr
                              ? `آخر نشاط ${formatRelativeTime(sess.lastActiveAt, true)}`
                              : `Last seen ${formatRelativeTime(sess.lastActiveAt, false)}`}
                          </p>
                        </div>
                      </td>

                      {/* Location & City */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-medium text-gray-800 text-sm">
                            <span className="text-base" role="img" aria-label="Country Flag">
                              {sess.flagEmoji}
                            </span>
                            <span>{sess.countryName || sess.countryCode || (isAr ? 'غير محدد' : 'Unknown')}</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {[sess.city, sess.region].filter(Boolean).join('، ') ||
                              (isAr ? 'المحافظة/المدينة غير محددة' : 'City not specified')}
                          </p>
                        </div>
                      </td>

                      {/* Coordinates */}
                      <td className="px-4 py-3.5">
                        {hasCoords ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs font-mono font-medium text-slate-700">
                              <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                              <span>
                                {sess.latitude?.toFixed(4)}, {sess.longitude?.toFixed(4)}
                              </span>
                            </div>
                            {sess.googleMapsUrl && (
                              <a
                                href={sess.googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-600 hover:text-primary-800 hover:underline"
                              >
                                <span>{isAr ? 'عرض في خرائط Google' : 'Open in Maps'}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {isAr ? 'تقريبي (غير متوفر GPS)' : 'Approx (No GPS)'}
                          </span>
                        )}
                      </td>

                      {/* IP Address */}
                      <td className="px-4 py-3.5">
                        {sess.ipAddress ? (
                          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-mono font-medium text-slate-800">
                            <span>{sess.ipAddress}</span>
                            <button
                              onClick={() => handleCopyIp(sess.ipAddress!)}
                              className="text-slate-400 transition hover:text-slate-600"
                              title={isAr ? 'نسخ عنوان IP' : 'Copy IP'}
                            >
                              {copiedIp === sess.ipAddress ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>

                      {/* Device & Browser */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800">
                            {getDeviceIcon(sess.device)}
                            <span>{sess.browser || 'Browser'}</span>
                          </div>
                          <p className="text-[11px] text-gray-500">
                            {sess.os || 'OS'} • {sess.device || 'Desktop'}
                          </p>
                        </div>
                      </td>

                      {/* Login Timestamp */}
                      <td className="px-4 py-3.5 text-xs text-gray-600">
                        <div className="space-y-0.5">
                          <p className="font-medium text-gray-800">{formatDateTime(sess.loginAt, isAr)}</p>
                          <p className="text-[11px] text-gray-500">
                            {isAr ? 'بدء الدخول' : 'Session start'}
                          </p>
                        </div>
                      </td>

                      {/* Details button */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => setSelectedSession(sess)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 shadow-sm transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                          title={isAr ? 'عرض تفاصيل الجلسة' : 'View session details'}
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {isAr ? 'تفاصيل جلسة المستخدم الكاملة' : 'User Session & Telemetry Details'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedSession.user.name} ({selectedSession.user.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-sm">
              {/* Row 1: Status & Role */}
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5">
                <div>
                  <span className="text-xs text-gray-500">{isAr ? 'حالة الجلسة' : 'Session Status'}</span>
                  <div className="mt-1">{getStatusBadge(selectedSession.status)}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">{isAr ? 'الدور والصلاحية' : 'Role'}</span>
                  <div className="mt-1">{getRoleBadge(selectedSession.user.role)}</div>
                </div>
              </div>

              {/* Row 2: Client info */}
              {selectedSession.user.client && (
                <div className="rounded-xl border border-slate-200 p-3.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    {isAr ? 'بيانات شركة العميل' : 'Client Organization'}
                  </span>
                  <p className="mt-1 font-bold text-gray-900">
                    {isAr
                      ? selectedSession.user.client.companyNameAr || selectedSession.user.client.companyName
                      : selectedSession.user.client.companyName}
                  </p>
                  {selectedSession.user.client.address && (
                    <p className="mt-0.5 text-xs text-gray-600">{selectedSession.user.client.address}</p>
                  )}
                  {selectedSession.user.client.phone && (
                    <p className="mt-0.5 text-xs text-gray-600">
                      {isAr ? 'هاتف العميل: ' : 'Phone: '}
                      {selectedSession.user.client.phone}
                    </p>
                  )}
                </div>
              )}

              {/* Row 3: Location & Coordinates */}
              <div className="rounded-xl border border-slate-200 p-3.5 space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  {isAr ? 'الموقع الجغرافي والإحداثيات' : 'Geographic Telemetry & Coordinates'}
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">{isAr ? 'الدولة:' : 'Country:'}</span>
                    <p className="font-semibold text-gray-900">
                      {selectedSession.flagEmoji} {selectedSession.countryName} ({selectedSession.countryCode || 'N/A'})
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">{isAr ? 'المدينة / المنطقة:' : 'City / Region:'}</span>
                    <p className="font-semibold text-gray-900">
                      {[selectedSession.city, selectedSession.region].filter(Boolean).join(' - ') || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">{isAr ? 'خط العرض (Latitude):' : 'Latitude:'}</span>
                    <p className="font-mono font-medium text-slate-800">
                      {selectedSession.latitude != null ? selectedSession.latitude : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">{isAr ? 'خط الطول (Longitude):' : 'Longitude:'}</span>
                    <p className="font-mono font-medium text-slate-800">
                      {selectedSession.longitude != null ? selectedSession.longitude : '-'}
                    </p>
                  </div>
                </div>

                {selectedSession.googleMapsUrl && (
                  <div className="pt-2">
                    <a
                      href={selectedSession.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-50 px-4 py-2 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                    >
                      <MapPin className="h-4 w-4 text-rose-500" />
                      <span>{isAr ? 'فتح الموقع المباشر على خرائط Google' : 'Open Location on Google Maps'}</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Row 4: Network & Device */}
              <div className="rounded-xl bg-slate-50 p-3.5 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">{isAr ? 'عنوان IP:' : 'IP Address:'}</span>
                    <p className="font-mono font-semibold text-slate-900">{selectedSession.ipAddress || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">{isAr ? 'الجهاز والمتصفح:' : 'Device & Browser:'}</span>
                    <p className="font-semibold text-slate-900">
                      {selectedSession.device} • {selectedSession.browser} ({selectedSession.os})
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">{isAr ? 'وقت الدخول:' : 'Login Time:'}</span>
                    <p className="text-slate-800">{formatDateTime(selectedSession.loginAt, isAr)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">{isAr ? 'آخر نشاط:' : 'Last Active:'}</span>
                    <p className="text-slate-800">{formatDateTime(selectedSession.lastActiveAt, isAr)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedSession(null)}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
