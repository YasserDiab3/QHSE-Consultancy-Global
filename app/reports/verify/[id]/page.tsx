'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import BrandLogo from '@/components/BrandLogo'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useLanguage } from '@/context'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  ImageIcon,
  Loader2,
  MapPin,
  Printer,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  downloadClientReportPdf,
  generateClientReportPdfBlob,
  type ReportPdfData,
} from '@/lib/report-pdf'

const riskBadgeColors: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-amber-100 text-amber-800 border-amber-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-blue-100 text-blue-800 border-blue-200',
}

const riskLabels: Record<string, { ar: string; en: string }> = {
  CRITICAL: { ar: 'حرج', en: 'Critical' },
  HIGH: { ar: 'عالي', en: 'High' },
  MEDIUM: { ar: 'متوسط', en: 'Medium' },
  LOW: { ar: 'منخفض', en: 'Low' },
}

export default function ReportVerifyPage() {
  const params = useParams<{ id: string }>()
  const { language } = useLanguage()
  const isArabic = language === 'ar'
  const [report, setReport] = useState<ReportPdfData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [isDownloading, startDownloading] = useTransition()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!params?.id) return
    let active = true

    fetch(`/api/reports/${params.id}/public`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Report not found')
        return res.json()
      })
      .then((data) => {
        if (active) {
          setReport(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (active) {
          setError(isArabic ? 'التقرير غير موجود أو تم إلغاؤه.' : 'Report not found or has been revoked.')
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [params?.id, isArabic])

  // Automatically render the PDF preview blob when report data is loaded
  useEffect(() => {
    if (!report) return
    let active = true
    let urlToRevoke: string | null = null

    setGeneratingPdf(true)
    generateClientReportPdfBlob(report, language as 'ar' | 'en')
      .then((blob) => {
        if (active) {
          const url = URL.createObjectURL(blob)
          urlToRevoke = url
          setPdfBlobUrl(url)
          setGeneratingPdf(false)
        }
      })
      .catch((err) => {
        console.error('Failed to prepare PDF blob preview:', err)
        if (active) setGeneratingPdf(false)
      })

    return () => {
      active = false
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke)
      }
    }
  }, [report, language])

  const handleDownloadPdf = () => {
    if (!report) return
    startDownloading(async () => {
      try {
        await downloadClientReportPdf(report, language)
        toast.success(isArabic ? 'تم تنزيل ملف التقرير بنجاح' : 'Report PDF downloaded successfully')
      } catch (err) {
        console.error('PDF generation error:', err)
        toast.error(isArabic ? 'تعذر إنشاء ملف الـ PDF' : 'Failed to generate PDF')
      }
    })
  }

  const handlePrintPdf = () => {
    if (!pdfBlobUrl) return
    const printWindow = window.open(pdfBlobUrl)
    if (printWindow) {
      printWindow.focus()
      printWindow.print()
    }
  }

  const shortCode = report?.shortCode || (report?.id ? `QHSSE-${report.id.substring(0, 8).toUpperCase()}` : '')

  const handleCopyCode = () => {
    if (!shortCode) return
    navigator.clipboard.writeText(shortCode)
    setCopied(true)
    toast.success(isArabic ? 'تم نسخ كود التوثيق بنجاح' : 'Verification code copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const isFoodSafety = report?.category === 'FOOD_SAFETY'
  const formCode = isFoodSafety ? 'QHSSE-FS-VISIT-01' : 'QHSSE-VISIT-01'

  const formattedDate = report?.date
    ? new Date(report.date).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''

  const companyName = isArabic
    ? report?.client?.companyNameAr || report?.client?.companyName || '—'
    : report?.client?.companyName || report?.client?.companyNameAr || '—'

  const siteName = isArabic
    ? report?.siteNameAr || report?.siteName || '—'
    : report?.siteName || report?.siteNameAr || '—'

  const observations = report?.observations || []
  const risks = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  observations.forEach((obs) => {
    if (obs.riskLevel in risks) risks[obs.riskLevel as keyof typeof risks] += 1
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Header />

      <main className="pb-16 pt-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
              <p className="text-sm font-semibold text-slate-600">
                {isArabic ? 'جاري التحقق من صحة التقرير وكود التوثيق...' : 'Verifying report and security code...'}
              </p>
            </div>
          ) : error || !report ? (
            <div className="overflow-hidden rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                {isArabic ? 'تعذر التحقق من التقرير' : 'Report Verification Failed'}
              </h1>
              <p className="mt-2 text-slate-600">
                {error || (isArabic ? 'رقم التقرير أو كود التوثيق المدخل غير صحيح أو غير مسجل بالنظام.' : 'The requested report ID or verification code is invalid.')}
              </p>

              {/* Retry Search Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const target = (e.currentTarget.elements.namedItem('retryCode') as HTMLInputElement)?.value?.trim()
                  if (target) {
                    window.location.href = `/reports/verify/${encodeURIComponent(target)}`
                  }
                }}
                className="mx-auto mt-6 flex max-w-md items-center gap-2"
              >
                <input
                  type="text"
                  name="retryCode"
                  placeholder={isArabic ? 'أدخل كود التحقق (مثل: QHSSE-74ADB4AA)' : 'Enter Code (e.g. QHSSE-74ADB4AA)'}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-primary-500 focus:bg-white focus:outline-none"
                />
                <button type="submit" className="btn-primary shrink-0 px-4 py-2.5 text-sm">
                  {isArabic ? 'إعادة التحقق' : 'Verify'}
                </button>
              </form>

              <div className="mt-6">
                <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:underline">
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                  {isArabic ? 'العودة للصفحة الرئيسية' : 'Return to Home'}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Banner Card */}
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-primary-800/10 bg-gradient-to-r from-primary-900 via-primary-800 to-primary-950 px-6 py-8 text-white sm:px-10">
                  <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <BrandLogo variant="header" className="h-14 w-14 shrink-0 rounded-2xl bg-white p-1 shadow-md" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {isArabic ? 'تقرير رسمي موثق ومعتمد' : 'Official Verified Report'}
                          </span>
                          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-mono font-medium text-white/80">
                            {formCode}
                          </span>
                          {shortCode && (
                            <button
                              onClick={handleCopyCode}
                              title={isArabic ? 'انقر لنسخ كود التوثيق' : 'Click to copy code'}
                              className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-mono font-bold text-amber-300 ring-1 ring-amber-400/40 transition hover:bg-amber-400/30 active:scale-95"
                            >
                              <span>{isArabic ? 'كود التوثيق:' : 'Code:'} {shortCode}</span>
                              {copied ? <Check className="h-3 w-3 text-emerald-300" /> : <Copy className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                          {isArabic
                            ? isFoodSafety
                              ? 'تقرير زيارة سلامة الغذاء (PDF)'
                              : 'تقرير زيارة استشارية ميدانية (PDF)'
                            : isFoodSafety
                              ? 'Food Safety Visit Report (PDF)'
                              : 'Consultancy Field Visit Report (PDF)'}
                        </h1>
                        <p className="mt-1 font-mono text-xs text-white/70">
                          REF: {report.id}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={handleDownloadPdf}
                        disabled={isDownloading}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-95 disabled:opacity-70"
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {isArabic ? 'جاري التحميل...' : 'Downloading...'}
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            {isArabic ? 'تنزيل ملف الـ PDF' : 'Download PDF'}
                          </>
                        )}
                      </button>

                      {pdfBlobUrl && (
                        <a
                          href={pdfBlobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-95"
                        >
                          <ExternalLink className="h-4 w-4" />
                          {isArabic ? 'ملء الشاشة' : 'Full Screen'}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Security Reassurance Banner */}
                <div className="border-b border-emerald-100 bg-emerald-50/70 px-6 py-3.5 sm:px-8">
                  <div className="flex items-center gap-3 text-xs text-emerald-900">
                    <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                    <span className="font-medium">
                      {isArabic
                        ? 'هذه الصفحة مخصصة لعرض وتحميل وثيقة هذا التقرير الرسمية فقط، ولا تتيح الوصول إلى حساب العميل أو بياناته الخاصة.'
                        : 'This page is dedicated exclusively to verifying and viewing this official report PDF and grants no access to the client account or private records.'}
                    </span>
                  </div>
                </div>

                {/* Quick Details Bar */}
                <div className="bg-slate-50/80 p-6 sm:p-8">
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-primary-100 p-2.5 text-primary-700">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">{isArabic ? 'المنشأة / العميل' : 'Company / Client'}</p>
                        <p className="mt-0.5 font-bold text-slate-900">{companyName}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-primary-100 p-2.5 text-primary-700">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">{isArabic ? 'موقع الزيارة' : 'Site / Location'}</p>
                        <p className="mt-0.5 font-bold text-slate-900">{siteName}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-primary-100 p-2.5 text-primary-700">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">{isArabic ? 'تاريخ الزيارة' : 'Visit Date'}</p>
                        <p className="mt-0.5 font-bold text-slate-900">{formattedDate}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-primary-100 p-2.5 text-primary-700">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">{isArabic ? 'استشاري الجودة والسلامة' : 'Lead Consultant'}</p>
                        <p className="mt-0.5 font-bold text-slate-900">{report.consultant?.name || 'QHSSE Consultant Team'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PDF Document Embedded Viewer */}
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/90 px-6 py-4">
                  <div className="flex items-center gap-2 text-slate-800">
                    <FileText className="h-5 w-5 text-primary-700" />
                    <h2 className="text-base font-bold">
                      {isArabic ? 'وثيقة التقرير المعتمدة ومرفقات الصور (PDF)' : 'Official Certified Report & Photo Appendix (PDF)'}
                    </h2>
                  </div>
                  {pdfBlobUrl && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrintPdf}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        {isArabic ? 'طباعة' : 'Print'}
                      </button>
                      <a
                        href={pdfBlobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {isArabic ? 'نافذة منفصلة' : 'New Window'}
                      </a>
                    </div>
                  )}
                </div>

                <div className="relative min-h-[600px] w-full bg-slate-900">
                  {generatingPdf ? (
                    <div className="flex min-h-[600px] flex-col items-center justify-center gap-3 bg-slate-50 text-slate-600">
                      <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
                      <p className="text-sm font-bold">
                        {isArabic ? 'جاري تجهيز وثيقة الـ PDF الأصلية والمرفقات...' : 'Preparing official PDF report and photos...'}
                      </p>
                    </div>
                  ) : pdfBlobUrl ? (
                    <iframe
                      src={pdfBlobUrl}
                      title="Certified Report PDF"
                      className="h-[750px] w-full border-0 bg-slate-100 sm:h-[950px]"
                    />
                  ) : (
                    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
                      <FileCheck className="h-12 w-12 text-primary-600" />
                      <div>
                        <p className="font-bold text-slate-800">
                          {isArabic ? 'وثيقة الـ PDF جاهزة للتحميل' : 'PDF Document Ready'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {isArabic ? 'اضغط على زر التنزيل للحصول على نسخة التقرير' : 'Click the download button to save the official report'}
                        </p>
                      </div>
                      <button
                        onClick={handleDownloadPdf}
                        className="btn-primary inline-flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        {isArabic ? 'تنزيل ملف PDF' : 'Download PDF'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Risk Summary and Observations (Accessible reference) */}
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
                <h2 className="text-lg font-bold text-slate-900">
                  {isArabic ? 'ملخص مستويات الخطورة والملاحظات الميدانية' : 'Risk Summary & Observations'}
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 text-center">
                    <p className="text-2xl font-black text-red-700">{risks.CRITICAL}</p>
                    <p className="mt-1 text-xs font-bold text-red-800">{isArabic ? 'حرجة (Critical)' : 'Critical'}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-center">
                    <p className="text-2xl font-black text-amber-700">{risks.HIGH}</p>
                    <p className="mt-1 text-xs font-bold text-amber-800">{isArabic ? 'عالية (High)' : 'High'}</p>
                  </div>
                  <div className="rounded-2xl border border-yellow-200 bg-yellow-50/50 p-4 text-center">
                    <p className="text-2xl font-black text-yellow-700">{risks.MEDIUM}</p>
                    <p className="mt-1 text-xs font-bold text-yellow-800">{isArabic ? 'متوسطة (Medium)' : 'Medium'}</p>
                  </div>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-center">
                    <p className="text-2xl font-black text-blue-700">{risks.LOW}</p>
                    <p className="mt-1 text-xs font-bold text-blue-800">{isArabic ? 'منخفضة (Low)' : 'Low'}</p>
                  </div>
                </div>

                {observations.length > 0 && (
                  <div className="mt-8 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {observations.map((obs, idx) => {
                      const riskKey = obs.riskLevel?.toUpperCase() || 'LOW'
                      const badgeStyle = riskBadgeColors[riskKey] || riskBadgeColors.LOW
                      const riskLabel = riskLabels[riskKey]?.[isArabic ? 'ar' : 'en'] || riskKey
                      const title = isArabic ? obs.titleAr || obs.title : obs.title || obs.titleAr

                      return (
                        <div key={obs.id || idx} className="p-5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-700">
                                {idx + 1}
                              </span>
                              <h3 className="font-bold text-slate-900">{title}</h3>
                            </div>
                            <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold ${badgeStyle}`}>
                              {riskLabel}
                            </span>
                          </div>

                          {(obs.description || obs.descriptionAr) && (
                            <p className="mt-2 text-sm text-slate-600 ps-10">
                              {isArabic ? obs.descriptionAr || obs.description : obs.description || obs.descriptionAr}
                            </p>
                          )}

                          {obs.correctiveAction && (
                            <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 ps-10 text-xs text-emerald-900">
                              <span className="font-bold">{isArabic ? 'الإجراء التصحيحي المطلوب: ' : 'Corrective Action: '}</span>
                              <span>{obs.correctiveAction}</span>
                            </div>
                          )}

                          {/* Observation Images in Web View */}
                          {obs.images && obs.images.length > 0 && (
                            <div className="mt-4 ps-10">
                              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                                <span>{isArabic ? 'الصور الميدانية المرفقة:' : 'Attached Photos:'}</span>
                              </div>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                                {obs.images.map((img: any) => (
                                  <div
                                    key={img.id || img.url}
                                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm"
                                  >
                                    <a href={img.url} target="_blank" rel="noopener noreferrer" className="block">
                                      <img
                                        src={img.url}
                                        alt={img.originalName || 'Evidence'}
                                        className="h-40 w-full object-cover transition duration-200 group-hover:scale-105"
                                        loading="lazy"
                                      />
                                      <span
                                        className={`absolute bottom-2 start-2 rounded-md px-2 py-0.5 text-xs font-bold shadow ${
                                          img.type === 'BEFORE'
                                            ? 'bg-red-600 text-white'
                                            : img.type === 'AFTER'
                                              ? 'bg-emerald-600 text-white'
                                              : 'bg-slate-800 text-white'
                                        }`}
                                      >
                                        {img.type === 'BEFORE'
                                          ? (isArabic ? 'قبل المعالجة' : 'Before')
                                          : img.type === 'AFTER'
                                            ? (isArabic ? 'بعد المعالجة' : 'After')
                                            : (isArabic ? 'صورة الدليل' : 'Evidence')}
                                      </span>
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Quick Lookup for Other Reports */}
              <div className="rounded-3xl border border-slate-200 bg-slate-100/70 p-6 text-center sm:p-8">
                <h3 className="text-base font-bold text-slate-900">
                  {isArabic ? 'هل تريد التحقق من تقرير فحص آخر؟' : 'Need to verify another inspection report?'}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {isArabic ? 'يمكنك إدخال رقم التقرير (UUID) أو كود التوثيق المختصر المطبوع على الوثيقة' : 'Enter the full Report ID or the short security code printed on the document'}
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const target = (e.currentTarget.elements.namedItem('searchCode') as HTMLInputElement)?.value?.trim()
                    if (target) {
                      window.location.href = `/reports/verify/${encodeURIComponent(target)}`
                    }
                  }}
                  className="mx-auto mt-4 flex max-w-md items-center gap-2"
                >
                  <input
                    type="text"
                    name="searchCode"
                    placeholder={isArabic ? 'أدخل كود التوثيق (مثال: QHSSE-74ADB4AA)' : 'Enter Code (e.g. QHSSE-74ADB4AA)'}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
                  />
                  <button type="submit" className="btn-primary inline-flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-sm">
                    <Search className="h-4 w-4" />
                    {isArabic ? 'تحقق' : 'Verify'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
