'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText,
  Printer,
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Building,
  Loader2,
  Calendar,
} from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import { useLanguage } from '@/context'

type ExecutiveSummaryData = {
  client: {
    id: string
    name: string
    nameAr: string
    email: string
    phone?: string | null
  }
  period: {
    year: string
    month: string
  }
  metrics: {
    safetyIndex: number
    totalReports: number
    totalObservations: number
    closedObservations: number
    openObservations: number
    underReviewObservations: number
    overdueObservations: number
    closureRate: number
  }
  riskBreakdown: {
    critical: number
    high: number
    medium: number
    low: number
  }
  siteBreakdown: Array<{
    siteName: string
    total: number
    open: number
    closed: number
    complianceRate: number
  }>
  categoryBreakdown: Array<{
    category: string
    count: number
  }>
  commentary: {
    ar: string
    en: string
  }
  generatedAt: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  clientId?: string
}

export default function ExecutiveSafetyReportModal({ isOpen, onClose, clientId }: Props) {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const printRef = useRef<HTMLDivElement>(null)

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ExecutiveSummaryData | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())

  const fetchSummary = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (clientId) params.set('clientId', clientId)
      if (selectedYear) params.set('year', selectedYear)
      if (selectedMonth) params.set('month', selectedMonth)

      const res = await fetch(`/api/reports/executive-summary?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Failed to load executive summary:', err)
    } finally {
      setLoading(false)
    }
  }, [isOpen, clientId, selectedYear, selectedMonth])

  useEffect(() => {
    if (isOpen) {
      fetchSummary()
    }
  }, [isOpen, fetchSummary])

  if (!isOpen) return null

  const handlePrint = () => {
    window.print()
  }

  const months = [
    { value: '', labelAr: 'كامل العام', labelEn: 'All Year' },
    { value: '1', labelAr: 'يناير', labelEn: 'January' },
    { value: '2', labelAr: 'فبراير', labelEn: 'February' },
    { value: '3', labelAr: 'مارس', labelEn: 'March' },
    { value: '4', labelAr: 'أبريل', labelEn: 'April' },
    { value: '5', labelAr: 'مايو', labelEn: 'May' },
    { value: '6', labelAr: 'يونيو', labelEn: 'June' },
    { value: '7', labelAr: 'يوليو', labelEn: 'July' },
    { value: '8', labelAr: 'أغسطس', labelEn: 'August' },
    { value: '9', labelAr: 'سبتمبر', labelEn: 'September' },
    { value: '10', labelAr: 'أكتوبر', labelEn: 'October' },
    { value: '11', labelAr: 'نوفمبر', labelEn: 'November' },
    { value: '12', labelAr: 'ديسمبر', labelEn: 'December' },
  ]

  const clientDisplayName = data ? (isAr ? data.client.nameAr : data.client.name) : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm print:p-0 print:bg-white">
      <div className="relative my-8 w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl print:my-0 print:max-w-none print:rounded-none print:shadow-none">
        {/* Modal Top Control Bar (Screen Only) */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4 print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isAr ? 'التقرير التنفيذي الشامل للسلامة' : 'Executive Safety Summary Report'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAr ? 'مؤشرات الأداء ومصفوفة الامتثال المؤسسي' : 'Key safety KPIs and compliance performance'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter by Month */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="input-field py-1 text-xs"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {isAr ? m.labelAr : m.labelEn}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-700 active:scale-95"
            >
              <Printer className="h-4 w-4" />
              <span>{isAr ? 'طباعة / حفظ PDF' : 'Print / Save as PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Report Printable Content Container */}
        <div ref={printRef} className="p-6 sm:p-10 print:p-8">
          {loading || !data ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400">
              <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
              <p className="mt-3 text-sm font-medium">
                {isAr ? 'جاري تجميع المؤشرات والبيانات التنفيذية...' : 'Compiling executive indicators...'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Report Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-slate-900/80 pb-6 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="rounded bg-brand-gold/15 px-2.5 py-0.5 text-xs font-extrabold uppercase text-brand-gold">
                      QHSE CONSULTANCY &bull; EXECUTIVE INTELLIGENCE
                    </span>
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">
                    {isAr ? 'التقرير التنفيذي لسلامة وصحة العمل' : 'Executive QHSSE Performance Report'}
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    {isAr ? 'المنشأة المستهدفة:' : 'Facility:'}{' '}
                    <strong className="text-slate-900">{clientDisplayName}</strong>
                    {' '}&bull;{' '}
                    <span>
                      {isAr ? 'تاريخ الإصدار:' : 'Issued on:'}{' '}
                      {new Date(data.generatedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </p>
                </div>

                <div className="flex shrink-0">
                  <BrandLogo variant="header" className="h-16 w-auto" priority />
                </div>
              </div>

              {/* Top Score Banner */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-primary-200 bg-primary-50/70 p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-primary-800">
                    {isAr ? 'مؤشر السلامة العام' : 'Overall Safety Score'}
                  </p>
                  <p className="mt-2 font-mono text-4xl font-extrabold text-primary-950">
                    {data.metrics.safetyIndex}%
                  </p>
                  <span className="mt-1 inline-block text-[11px] font-semibold text-primary-700">
                    {data.metrics.safetyIndex >= 85
                      ? (isAr ? 'امتثال متميز' : 'High Compliance')
                      : (isAr ? 'بحاجة لمتابعة' : 'Attention Required')}
                  </span>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    {isAr ? 'نسبة إغلاق الملاحظات' : 'Closure Rate'}
                  </p>
                  <p className="mt-2 font-mono text-4xl font-extrabold text-emerald-950">
                    {data.metrics.closureRate}%
                  </p>
                  <span className="mt-1 inline-block text-[11px] font-semibold text-emerald-700">
                    {data.metrics.closedObservations} {isAr ? 'معتمد ومغلق' : 'Closed'}
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {isAr ? 'إجمالي الملاحظات' : 'Total Findings'}
                  </p>
                  <p className="mt-2 font-mono text-4xl font-extrabold text-slate-900">
                    {data.metrics.totalObservations}
                  </p>
                  <span className="mt-1 inline-block text-[11px] font-semibold text-slate-500">
                    {data.metrics.totalReports} {isAr ? 'تقارير وزيارات' : 'Reports'}
                  </span>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-800">
                    {isAr ? 'المخاطر الحرجة النشطة' : 'Active Critical Risks'}
                  </p>
                  <p className="mt-2 font-mono text-4xl font-extrabold text-rose-950">
                    {data.riskBreakdown.critical}
                  </p>
                  <span className="mt-1 inline-block text-[11px] font-semibold text-rose-700">
                    {data.metrics.overdueObservations > 0
                      ? (isAr ? `${data.metrics.overdueObservations} متأخر عن SLA` : `${data.metrics.overdueObservations} overdue`)
                      : (isAr ? 'صفر تأخير' : 'Zero overdue')}
                  </span>
                </div>
              </div>

              {/* Risk Distribution Matrix */}
              <div className="rounded-2xl border border-slate-200 p-5 bg-white">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-brand-gold" />
                  <span>{isAr ? 'مصفوفة توزيع مستويات الخطورة الميدانية' : 'Field Risk Severity Distribution'}</span>
                </h3>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-start">
                    <span className="text-[11px] font-bold text-rose-800 uppercase">
                      {isAr ? 'حرجة (CRITICAL)' : 'Critical'}
                    </span>
                    <p className="mt-1 font-mono text-2xl font-black text-rose-950">
                      {data.riskBreakdown.critical}
                    </p>
                    <p className="text-[10px] text-rose-700 mt-0.5">
                      {isAr ? 'مهلة المعالجة: 24 ساعة' : 'SLA: 24 Hours'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-start">
                    <span className="text-[11px] font-bold text-orange-800 uppercase">
                      {isAr ? 'عالية (HIGH)' : 'High Risk'}
                    </span>
                    <p className="mt-1 font-mono text-2xl font-black text-orange-950">
                      {data.riskBreakdown.high}
                    </p>
                    <p className="text-[10px] text-orange-700 mt-0.5">
                      {isAr ? 'مهلة المعالجة: 3 أيام' : 'SLA: 3 Days'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-start">
                    <span className="text-[11px] font-bold text-amber-800 uppercase">
                      {isAr ? 'متوسطة (MEDIUM)' : 'Medium'}
                    </span>
                    <p className="mt-1 font-mono text-2xl font-black text-amber-950">
                      {data.riskBreakdown.medium}
                    </p>
                    <p className="text-[10px] text-amber-700 mt-0.5">
                      {isAr ? 'مهلة المعالجة: 7 أيام' : 'SLA: 7 Days'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-start">
                    <span className="text-[11px] font-bold text-blue-800 uppercase">
                      {isAr ? 'منخفضة (LOW)' : 'Low Risk'}
                    </span>
                    <p className="mt-1 font-mono text-2xl font-black text-blue-950">
                      {data.riskBreakdown.low}
                    </p>
                    <p className="text-[10px] text-blue-700 mt-0.5">
                      {isAr ? 'مهلة المعالجة: 14 يوماً' : 'SLA: 14 Days'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sites Breakdown Table */}
              {data.siteBreakdown.length > 0 && (
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Building className="h-4 w-4 text-slate-500" />
                      <span>{isAr ? 'مؤشرات السلامة بحسب المواقع والمنشآت' : 'Site Compliance Breakdown'}</span>
                    </h3>
                  </div>

                  <table className="w-full text-start text-xs">
                    <thead className="bg-slate-100/60 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4 text-start">{isAr ? 'الموقع / المنشأة' : 'Site / Facility'}</th>
                        <th className="py-2.5 px-4 text-center">{isAr ? 'إجمالي الملاحظات' : 'Total'}</th>
                        <th className="py-2.5 px-4 text-center">{isAr ? 'المغلقة' : 'Closed'}</th>
                        <th className="py-2.5 px-4 text-center">{isAr ? 'المتبقية' : 'Open'}</th>
                        <th className="py-2.5 px-4 text-end">{isAr ? 'نسبة الامتثال' : 'Compliance'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.siteBreakdown.map((site, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{site.siteName}</td>
                          <td className="py-2.5 px-4 text-center font-mono">{site.total}</td>
                          <td className="py-2.5 px-4 text-center font-mono text-emerald-700">{site.closed}</td>
                          <td className="py-2.5 px-4 text-center font-mono text-amber-700">{site.open}</td>
                          <td className="py-2.5 px-4 text-end font-bold text-slate-900">
                            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5">
                              {site.complianceRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Consultant Executive Guidance Box */}
              <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>{isAr ? 'التقييم الاستشاري والتوجيهات التنفيذية' : 'Consultant Executive Evaluation'}</span>
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {isAr ? data.commentary.ar : data.commentary.en}
                </p>
              </div>

              {/* Sign-Off & Official Stamp Block (Print / Formal) */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-900">{isAr ? 'اعتماد استشاري السلامة والصحة المهنية' : 'QHSSE Lead Consultant'}</p>
                  <p className="text-[11px] text-slate-500 mt-1">QHSSE Consultant Global Accreditation</p>
                  <div className="mt-8 border-b border-dashed border-slate-300 w-48 mx-auto" />
                  <p className="text-[10px] text-slate-400 mt-1">{isAr ? 'التوقيع والختم المعتمد' : 'Signature & Official Stamp'}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900">{isAr ? 'استلام إدارة المنشأة / العميل' : 'Facility Management Acknowledgment'}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{clientDisplayName}</p>
                  <div className="mt-8 border-b border-dashed border-slate-300 w-48 mx-auto" />
                  <p className="text-[10px] text-slate-400 mt-1">{isAr ? 'الاسم والصفة الوظيفية والتاريخ' : 'Name, Title & Date'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
