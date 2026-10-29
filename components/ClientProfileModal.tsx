'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Printer,
  X,
  Loader2,
  Building2,
  Lock,
  Unlock,
  FileText,
  FileSpreadsheet,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Calendar,
  Receipt,
  Download,
  MapPin,
  Mail,
  Phone,
} from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import { parsePortalSettings, isProfileLocked } from '@/lib/client-profile'
import {
  FinancialRecordView,
  parseFinancialRecord,
  formatFinancialAmount,
  STATUS_CONFIG,
  SERVICE_TYPES,
} from '@/lib/financial-records'
import { DEFAULT_COMPANY_CONFIG } from '@/lib/company-config'
import ProfessionalInvoiceModal from '@/components/ProfessionalInvoiceModal'
import ClientStatementModal from '@/components/ClientStatementModal'
import FinancialRecordFormModal from '@/components/FinancialRecordFormModal'
import RegisterVisitModal from '@/components/RegisterVisitModal'
import EditClientInfoModal from '@/components/EditClientInfoModal'
import { downloadClientReportPdf } from '@/lib/report-pdf'
import { getCategoryColor, getStatusColor } from '@/lib/colors'
import { printElement } from '@/lib/print-document'
import toast from 'react-hot-toast'

interface ClientProfileModalProps {
  client: {
    id: string
    companyName: string
    companyNameAr?: string
    phone?: string
    address?: string
    contactInfo?: string
    user: {
      id: string
      name: string
      email: string
      role: string
      phone?: string
    }
  }
  onClose: () => void
  onLockChanged?: () => void | Promise<void>
  onClientUpdated?: () => void | Promise<void>
}

const CATEGORY_LABELS_AR: Record<string, string> = {
  SAFETY: 'سلامة وصحة مهنية',
  FOOD_SAFETY: 'سلامة الغذاء',
  QHSE: 'الجودة والبيئة والسلامة',
  RISK_ASSESSMENT: 'تقييم مخاطر',
  AUDIT: 'تدقيق وامتثال',
  TRAINING: 'تدريب ميداني',
}

const STATUS_LABELS_AR: Record<string, string> = {
  OPEN: 'مفتوحة / جارية',
  SCHEDULED: 'مجدولة',
  IN_PROGRESS: 'قيد المتابعة',
  CLOSED: 'مكتملة ومغلقة',
}

export default function ClientProfileModal({
  client,
  onClose,
  onLockChanged,
  onClientUpdated,
}: ClientProfileModalProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [activeTab, setActiveTab] = useState<'financial' | 'info' | 'reports' | 'documents'>('financial')

  // Financial modals state
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<FinancialRecordView | null>(null)
  const [showStatementModal, setShowStatementModal] = useState(false)
  const [showInvoiceForm, setShowInvoiceForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FinancialRecordView | null>(null)

  // Visit & Edit Facility Modals state
  const [showRegisterVisitModal, setShowRegisterVisitModal] = useState(false)
  const [editingVisit, setEditingVisit] = useState<any>(null)
  const [showEditInfoModal, setShowEditInfoModal] = useState(false)
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null)

  // Status Filter & Search
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'PARTIAL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Profile Lock State
  const [lockedState, setLockedState] = useState(() =>
    isProfileLocked(parsePortalSettings(client.contactInfo))
  )
  const [togglingLock, setTogglingLock] = useState(false)

  // Printable profile ref
  const fullProfilePrintRef = useRef<HTMLDivElement>(null)
  const [printingFullProfile, setPrintingFullProfile] = useState(false)

  // Load profile data
  const load = useCallback(async () => {
    setLoading(true)
    setProfileError('')
    try {
      const response = await fetch(`/api/clients/${client.id}/profile`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'تعذر تحميل ملف العميل')
      setData(payload)
      if (payload?.client?.contactInfo !== undefined) {
        setLockedState(isProfileLocked(parsePortalSettings(payload.client.contactInfo)))
      }
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'تعذر تحميل ملف العميل')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [client.id])

  useEffect(() => {
    void load()
  }, [load])

  // Toggle Lock
  const toggleLockInsideModal = async () => {
    setTogglingLock(true)
    const target = !lockedState
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileLocked: target }),
      })
      if (res.ok) {
        setLockedState(target)
        toast.success(target ? 'تم قفل تعديل الملف للعميل' : 'تم فتح تعديل الملف للعميل')
        await onLockChanged?.()
      } else {
        const d = await res.json().catch(() => null)
        toast.error(d?.error || 'تعذر تحديث حالة القفل')
      }
    } catch {
      toast.error('تعذر تحديث حالة القفل')
    } finally {
      setTogglingLock(false)
    }
  }

  // Quick mark invoice as PAID
  const handleQuickMarkPaid = async (record: FinancialRecordView) => {
    if (record.status === 'PAID') return
    try {
      const res = await fetch(`/api/clients/${client.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record.id,
          status: 'PAID',
        }),
      })
      if (!res.ok) throw new Error('تعذر تحديث حالة السداد')
      toast.success(`تم تسجيل سداد الفاتورة (${record.details.invoiceNumber}) بالكامل بنجاح`)
      await load()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ')
    }
  }

  // Delete invoice
  const handleDeleteFinancial = async (recordId: string, invoiceNumber: string) => {
    if (!confirm(`هل أنت متأكد من حذف الفاتورة رقم ${invoiceNumber}؟`)) return
    try {
      const res = await fetch(`/api/clients/${client.id}/profile?financialId=${recordId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('تعذر حذف السجل المالي')
      toast.success('تم حذف الفاتورة بنجاح')
      await load()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الحذف')
    }
  }

  // Delete visit / report
  const handleDeleteVisit = async (reportId: string, siteName: string) => {
    if (!confirm(`هل أنت متأكد من حذف تقرير الزيارة (${siteName})؟`)) return
    try {
      const res = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        throw new Error(d?.error || 'تعذر حذف تقرير الزيارة')
      }
      toast.success('تم حذف تقرير الزيارة بنجاح')
      await load()
    } catch (error: any) {
      toast.error(error.message || 'تعذر حذف تقرير الزيارة')
    }
  }

  // Download visit report PDF
  const handleDownloadReportPdf = async (report: any) => {
    setDownloadingPdfId(report.id)
    try {
      await downloadClientReportPdf(
        {
          ...report,
          client: report.client || {
            companyName: data?.client?.companyName || client.companyName,
            companyNameAr: data?.client?.companyNameAr || client.companyNameAr,
          },
        },
        'ar'
      )
      toast.success('تم تصدير تقرير الزيارة الميدانية بنجاح')
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء تحميل التقرير')
    } finally {
      setDownloadingPdfId(null)
    }
  }

  // Print full client file
  const handlePrintFullProfile = async () => {
    if (!fullProfilePrintRef.current) return
    setPrintingFullProfile(true)
    try {
      await printElement({
        element: fullProfilePrintRef.current,
        title: `ملف-العميل-${client.companyName}`,
        lang: 'ar',
        dir: 'rtl',
      })
    } catch (err) {
      console.error('Print error:', err)
      toast.error('تعذر إتمام عملية الطباعة')
    } finally {
      setPrintingFullProfile(false)
    }
  }

  // Parse financial records
  const financialRecords: FinancialRecordView[] = (data?.client?.financialRecords || []).map(
    (rec: any) => parseFinancialRecord(rec)
  )

  // Filtered financial records
  const filteredInvoices = financialRecords.filter((inv) => {
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter
    const matchesSearch =
      !searchQuery.trim() ||
      inv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.details.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  // Summary Metrics
  const totalInvoiced = financialRecords.reduce((sum, inv) => sum + inv.details.totalAmount, 0)
  const totalPaid = financialRecords.reduce((sum, inv) => sum + inv.details.paidAmount, 0)
  const totalRemaining = Math.max(0, totalInvoiced - totalPaid)
  const mainCurrency = financialRecords[0]?.currency || 'EGP'
  const collectionRate = totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0

  const clientName = data?.client?.companyNameAr || data?.client?.companyName || client.companyName

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-6 backdrop-blur-sm" dir="rtl">
      <div className="relative w-full max-w-6xl rounded-3xl bg-white shadow-2xl flex flex-col max-h-[95vh] border border-slate-100 overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 bg-white px-6 py-5 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">{clientName}</h2>
                {lockedState ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                    <Lock className="h-3 w-3" />
                    الملف مقفل
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <Unlock className="h-3 w-3" />
                    مفتوح للتعديل
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                الملف الشامل لإدارة الحسابات والمستحقات والتقارير الميدانية • كود: {client.id.slice(0, 8)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setEditingVisit(null)
                setShowRegisterVisitModal(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm hover:bg-emerald-100 transition"
              title="تسجيل زيارة تفتيشية ميدانية جديدة للمنشأة"
            >
              <Calendar className="h-4 w-4 text-emerald-600" />
              تسجيل زيارة ميدانية
            </button>

            <button
              onClick={() => setShowStatementModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              title="طباعة كشف حساب معتمد للعميل"
            >
              <FileSpreadsheet className="h-4 w-4 text-primary-600" />
              كشف حساب عميل
            </button>

            <button
              onClick={handlePrintFullProfile}
              disabled={printingFullProfile}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              title="طباعة كامل ملف العميل"
            >
              <Printer className="h-4 w-4 text-slate-600" />
              {printingFullProfile ? 'جاري الطباعة...' : 'طباعة الملف'}
            </button>

            <button
              onClick={() => {
                setEditingRecord(null)
                setShowInvoiceForm(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary-700 transition"
            >
              <Plus className="h-4 w-4" />
              تسجيل فاتورة / مستحق
            </button>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition mr-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <p className="mt-3 text-sm text-slate-500 font-medium">جاري تحميل بيانات الملف المالي والتقارير...</p>
          </div>
        ) : profileError ? (
          <div className="m-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
            <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-2" />
            <p className="font-bold">تعذر تحميل بيانات العميل</p>
            <p className="mt-1 text-xs text-red-600">{profileError}</p>
            <button onClick={() => void load()} className="btn-secondary mt-4 px-4 py-2 text-xs">
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/60">
            {/* Top KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Invoiced */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold">إجمالي المطالبات والفواتير</span>
                  <div className="h-8 w-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                    <Receipt className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-black text-slate-900 font-mono">
                  {formatFinancialAmount(totalInvoiced, mainCurrency)}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>عدد الفواتير: {financialRecords.length}</span>
                  <span className="text-primary-700 font-bold">معتمدة</span>
                </div>
              </div>

              {/* Total Paid */}
              <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-emerald-800">
                  <span className="text-xs font-bold">إجمالي المبالغ المسددة</span>
                  <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-black text-emerald-700 font-mono">
                  {formatFinancialAmount(totalPaid, mainCurrency)}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>نسبة التحصيل:</span>
                  <span className="font-bold text-emerald-700 font-mono">{collectionRate}%</span>
                </div>
              </div>

              {/* Outstanding Dues */}
              <div
                className={`rounded-2xl border p-5 shadow-sm ${
                  totalRemaining > 0
                    ? 'border-amber-200 bg-amber-50/40 text-amber-900'
                    : 'border-slate-200 bg-white text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800">الرصيد المستحق المتبقي</span>
                  <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-black font-mono text-amber-900">
                  {formatFinancialAmount(totalRemaining, mainCurrency)}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>الحالة:</span>
                  <span
                    className={`font-bold ${
                      totalRemaining > 0 ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {totalRemaining > 0 ? 'مستحق الدفع' : 'تم التحصيل بالكامل'}
                  </span>
                </div>
              </div>

              {/* Field Activity */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-bold">النشاط الميداني والتقارير</span>
                  <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileText className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-black text-slate-900 font-mono">
                  {data?.summary?.reports || data?.client?.reports?.length || 0} زيارة
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>الملاحظات: {data?.summary?.observations || 0}</span>
                  <span>الملفات: {data?.client?.documents?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setActiveTab('financial')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  activeTab === 'financial'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Receipt className="h-4 w-4" />
                السجل المالي والفواتير والمستحقات
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    activeTab === 'financial' ? 'bg-primary-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {financialRecords.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('info')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  activeTab === 'info'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Building2 className="h-4 w-4" />
                بيانات المنشأة والاتصال
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  activeTab === 'reports'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Calendar className="h-4 w-4" />
                سجل الزيارات والتقارير الميدانية ({data?.summary?.reports || data?.client?.reports?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('documents')}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  activeTab === 'documents'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                الملفات والوثائق ({data?.client?.documents?.length || 0})
              </button>
            </div>

            {/* TAB 1: Financial Records & Invoices */}
            {activeTab === 'financial' && (
              <div className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                  {/* Status Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                    {(
                      [
                        { id: 'ALL', label: 'الكل' },
                        { id: 'PENDING', label: 'مستحقة' },
                        { id: 'PARTIAL', label: 'مسددة جزئياً' },
                        { id: 'PAID', label: 'مدفوعة' },
                      ] as const
                    ).map((pill) => (
                      <button
                        key={pill.id}
                        onClick={() => setStatusFilter(pill.id)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          statusFilter === pill.id
                            ? 'bg-primary-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      className="input-field py-1.5 pe-9 text-xs"
                      placeholder="بحث برقم الفاتورة أو البيان..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                {/* Invoices List */}
                {filteredInvoices.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-slate-700">لا توجد فواتير مطابقة</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      يمكنك تسجيل مطالبة مالية أو فاتورة جديدة بالضغط على زر الإضافة أعلاه.
                    </p>
                    <button
                      onClick={() => {
                        setEditingRecord(null)
                        setShowInvoiceForm(true)
                      }}
                      className="btn-primary mt-4 px-4 py-2 text-xs"
                    >
                      <Plus className="h-4 w-4 ml-1.5" />
                      تسجيل فاتورة جديدة الآن
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredInvoices.map((inv) => {
                      const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.PENDING
                      const serviceCfg = SERVICE_TYPES[inv.details.serviceType] || SERVICE_TYPES.CONSULTATION
                      const percentPaid =
                        inv.details.totalAmount > 0
                          ? Math.min(
                              100,
                              Math.round((inv.details.paidAmount / inv.details.totalAmount) * 100)
                            )
                          : 0

                      return (
                        <div
                          key={inv.id}
                          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Invoice info */}
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="rounded-lg bg-primary-50 px-2.5 py-1 font-mono text-xs font-bold text-primary-900 border border-primary-200">
                                  {inv.details.invoiceNumber}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                                  {cfg.labelAr}
                                </span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                  {serviceCfg.labelAr}
                                </span>
                              </div>

                              <h4 className="text-base font-bold text-slate-900">{inv.title}</h4>

                              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  تاريخ الإصدار: {inv.details.invoiceDate || inv.createdAt.slice(0, 10)}
                                </span>
                                {inv.dueDate && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    تاريخ الاستحقاق: {inv.dueDate.slice(0, 10)}
                                  </span>
                                )}
                                {inv.details.items.length > 1 && (
                                  <span className="text-slate-400">
                                    • {inv.details.items.length} بنود مدرجة
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Financial breakdown */}
                            <div className="flex items-center gap-6 lg:border-s lg:border-slate-100 lg:ps-6">
                              <div className="text-left sm:text-end">
                                <span className="block text-[11px] text-slate-400">القيمة الإجمالية</span>
                                <span className="font-mono text-lg font-black text-slate-900">
                                  {formatFinancialAmount(inv.details.totalAmount, inv.currency)}
                                </span>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  مسدد: {formatFinancialAmount(inv.details.paidAmount, inv.currency)}
                                  {inv.details.remainingAmount > 0 && (
                                    <span className="text-amber-700 font-bold ms-2">
                                      متبقي: {formatFinancialAmount(inv.details.remainingAmount, inv.currency)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                              <button
                                onClick={() => setSelectedInvoiceForPrint(inv)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-50 px-3 py-2 text-xs font-bold text-primary-700 hover:bg-primary-100 transition shadow-sm"
                                title="معاينة وطباعة الفاتورة الضريبية"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                طباعة فاتورة
                              </button>

                              {inv.status !== 'PAID' && (
                                <button
                                  onClick={() => void handleQuickMarkPaid(inv)}
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                                  title="تسجيل سداد الفاتورة بالكامل"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  سداد كامل
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setEditingRecord(inv)
                                  setShowInvoiceForm(true)
                                }}
                                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 transition"
                                title="تعديل الفاتورة"
                              >
                                <Edit className="h-4 w-4" />
                              </button>

                              <button
                                onClick={() => void handleDeleteFinancial(inv.id, inv.details.invoiceNumber)}
                                className="rounded-xl p-2 text-red-500 hover:bg-red-50 transition"
                                title="حذف الفاتورة"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-4 pt-3 border-t border-slate-100">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                              <span>حالة التحصيل</span>
                              <span className="font-mono font-bold text-slate-700">{percentPaid}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  percentPaid === 100
                                    ? 'bg-emerald-500'
                                    : percentPaid > 0
                                    ? 'bg-blue-500'
                                    : 'bg-amber-400'
                                }`}
                                style={{ width: `${percentPaid}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Company & Contact Information */}
            {activeTab === 'info' && (
              <div className="space-y-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary-600" />
                        بيانات المنشأة والاتصال
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        البيانات الأساسية المسجلة للمنشأة ومسؤول التواصل المعتمد في بوابة الاستشارات
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowEditInfoModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary-50 px-3.5 py-2 text-xs font-bold text-primary-700 border border-primary-200 hover:bg-primary-100 transition shadow-sm"
                        title="تعديل بيانات المنشأة ومسؤول التواصل"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        تعديل بيانات المنشأة والاتصال
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingVisit(null)
                          setShowRegisterVisitModal(true)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition shadow-sm"
                        title="تسجيل زيارة تفتيشية جديدة لهذه المنشأة"
                      >
                        <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                        تسجيل زيارة لهذه المنشأة
                      </button>

                      {lockedState ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          <Lock className="h-3.5 w-3.5" />
                          الملف مقفل (الإدارة فقط)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                          <Unlock className="h-3.5 w-3.5" />
                          مفتوح لتعديل العميل
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => void toggleLockInsideModal()}
                        disabled={togglingLock}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        {lockedState ? 'إلغاء قفل التعديل' : 'قفل التعديل على العميل'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <span className="block text-xs font-bold text-slate-400">اسم المنشأة الرسمي بالعربية</span>
                      <span className="font-bold text-slate-900 mt-1 block text-base">
                        {data?.client?.companyNameAr || data?.client?.companyName}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <span className="block text-xs font-bold text-slate-400">الاسم التجاري بالإنجليزية</span>
                      <span className="font-semibold text-slate-800 mt-1 block">
                        {data?.client?.companyName || '-'}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <span className="block text-xs font-bold text-slate-400">مسؤول التواصل والاتصال</span>
                      <span className="font-bold text-slate-900 mt-1 block">
                        {data?.client?.user?.name || '-'}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <span className="block text-xs font-bold text-slate-400">البريد الإلكتروني المعتمد</span>
                      {data?.client?.user?.email ? (
                        <a
                          href={`mailto:${data.client.user.email}`}
                          className="font-semibold text-primary-600 hover:underline mt-1 inline-flex items-center gap-1.5 font-mono"
                        >
                          <Mail className="h-3.5 w-3.5 text-primary-500" />
                          {data.client.user.email}
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <span className="block text-xs font-bold text-slate-400">رقم هاتف المنشأة / الجوال</span>
                      {data?.client?.phone || data?.client?.user?.phone ? (
                        <a
                          href={`tel:${data?.client?.phone || data?.client?.user?.phone}`}
                          className="font-semibold text-primary-600 hover:underline mt-1 inline-flex items-center gap-1.5 font-mono"
                        >
                          <Phone className="h-3.5 w-3.5 text-primary-500" />
                          {data?.client?.phone || data?.client?.user?.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
                      <span className="block text-xs font-bold text-slate-400">العنوان والموقع الجغرافي للمنشأة</span>
                      <span className="font-semibold text-slate-800 mt-1 flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        {data?.client?.address || 'غير محدد'}
                      </span>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB 3: Site Visits & QHSSE Reports */}
            {activeTab === 'reports' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary-600" />
                      سجل الزيارات والتقارير الميدانية
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      توثيق كافة الزيارات التفقدية وفحوصات السلامة الميدانية للمنشأة
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      إجمالي الزيارات: {data?.client?.reports?.length || 0}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingVisit(null)
                        setShowRegisterVisitModal(true)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                    >
                      <Plus className="h-4 w-4" />
                      تسجيل زيارة ميدانية جديدة
                    </button>
                  </div>
                </div>

                {/* Empty State when visits count is 0 */}
                {(!data?.client?.reports || data.client.reports.length === 0) ? (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-12 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-100 shadow-sm">
                      <Calendar className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">
                      سجل الزيارات والتقارير الميدانية فارغ (0)
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                      لم يتم تسجيل أي زيارات تفقدية أو فنية لموقع هذه المنشأة حتى الآن. يمكنك الآن جدولة وتسجيل أول زيارة ميدانية لتوثيق الفحوصات وملاحظات السلامة وتوليد التقارير المعتمدة.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingVisit(null)
                        setShowRegisterVisitModal(true)
                      }}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition mt-4"
                    >
                      <Plus className="h-4 w-4" />
                      تسجيل أول زيارة ميدانية الآن
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">موقع الزيارة / المنشأة</th>
                          <th className="py-3 px-4">تاريخ الزيارة</th>
                          <th className="py-3 px-4">التصنيف</th>
                          <th className="py-3 px-4">الحالة</th>
                          <th className="py-3 px-4 text-center">الملاحظات</th>
                          <th className="py-3 px-4 text-left">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.client.reports.map((r: any) => {
                          const catColor = getCategoryColor(r.category)
                          const stColor = getStatusColor(r.status)
                          const catLabel = CATEGORY_LABELS_AR[r.category] || r.category
                          const stLabel = STATUS_LABELS_AR[r.status] || r.status
                          const isDownloading = downloadingPdfId === r.id

                          return (
                            <tr key={r.id} className="hover:bg-slate-50/50 transition">
                              <td className="py-3 px-4 font-bold text-slate-900">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{r.siteNameAr || r.siteName}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">
                                {new Date(r.date).toLocaleDateString('ar-EG')}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex rounded-lg px-2.5 py-0.5 text-[11px] font-bold ${catColor.bg} ${catColor.text}`}>
                                  {catLabel}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${stColor.bg} ${stColor.text} border ${stColor.border}`}>
                                  {stLabel}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                                <span className="rounded-full bg-slate-100 px-2 py-0.5">
                                  {r.observations?.length || 0}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-left">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => void handleDownloadReportPdf(r)}
                                    disabled={isDownloading}
                                    className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700 hover:bg-primary-100 transition"
                                    title="تصدير وتحميل تقرير الزيارة PDF"
                                  >
                                    {isDownloading ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Download className="h-3 w-3" />
                                    )}
                                    تقرير PDF
                                  </button>

                                  <button
                                    onClick={() => {
                                      setEditingVisit(r)
                                      setShowRegisterVisitModal(true)
                                    }}
                                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 transition"
                                    title="تعديل بيانات الزيارة"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    onClick={() => void handleDeleteVisit(r.id, r.siteNameAr || r.siteName)}
                                    className="rounded-lg p-1 text-red-500 hover:bg-red-50 transition"
                                    title="حذف الزيارة"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {/* TAB 4: Documents & Files */}
            {activeTab === 'documents' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 text-base">الملفات والوثائق المرفقة</h3>
                  <span className="text-xs text-slate-500">
                    {data?.client?.documents?.length || 0} ملف
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data?.client?.documents?.length ? (
                    data.client.documents.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between hover:bg-slate-100/60 transition"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="rounded bg-primary-100 text-primary-800 text-[10px] font-bold px-2 py-0.5">
                              {doc.category || 'مستند'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(doc.createdAt).toLocaleDateString('ar-EG')}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 text-xs line-clamp-2">{doc.title}</h4>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-200 flex justify-end">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:text-primary-800"
                          >
                            <Download className="h-3.5 w-3.5" />
                            تحميل الملف
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-8 text-center text-slate-400">
                      لا توجد ملفات أو مستندات مرفقة.
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Hidden Printable Container for Full Profile */}
        <div className="hidden">
          <div
            ref={fullProfilePrintRef}
            id="client-profile-print"
            data-printable="true"
            className="printable-document p-8 bg-white text-slate-900 w-full max-w-4xl print:max-w-full print:w-full mx-auto"
            dir="rtl"
          >
            <div className="border-b-[3.5px] border-[#1d4289] pb-4 mb-6">
              {/* Row 1: Right = Arabic & English Company Name, Left = Brand Logo */}
              <div className="flex items-center justify-between gap-4">
                <div className="text-right">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#0a5439] tracking-tight leading-tight">
                    {DEFAULT_COMPANY_CONFIG.nameAr}
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-[#0a5439] mt-1 tracking-wide">
                    {DEFAULT_COMPANY_CONFIG.nameEn}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1">
                    مكتب استشاري معتمد لدى الدفاع المدني والجهات الرسمية • رخصة استشارات هندسية وبيئية
                  </p>
                </div>
                <div className="h-24 w-28 sm:h-28 sm:w-36 flex-shrink-0 flex items-center justify-end">
                  <BrandLogo variant="header" className="h-full w-full" priority />
                </div>
              </div>

              {/* Row 2: Perfect Symmetrical Sub-Header Bar */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 py-1.5 shadow-xs whitespace-nowrap">
                    <span className="block text-[10px] font-bold text-slate-500">ملف العميل الموحد:</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate block max-w-[220px]">{clientName}</span>
                  </div>
                </div>

                <div className="text-center px-2 flex-1">
                  <span className="inline-block text-xs sm:text-sm font-bold text-slate-700 bg-slate-100/90 px-4 py-1.5 rounded-full border border-slate-200/90 whitespace-nowrap shadow-xs">
                    إدارة الشؤون الإدارية والميدانية ▪ ملف العميل الموحد والتقرير الشامل
                  </span>
                </div>

                <div className="flex-shrink-0">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-1.5 text-center min-w-[140px] shadow-xs whitespace-nowrap">
                    <span className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      تاريخ إصدار التقرير
                    </span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 tracking-wide block">
                      {new Date().toLocaleDateString('ar-EG', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        numberingSystem: 'arab',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="block text-slate-500">إجمالي الفواتير</span>
                <span className="text-base font-bold text-slate-900 font-mono">
                  {formatFinancialAmount(totalInvoiced, mainCurrency)}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="block text-emerald-800">إجمالي المسدد</span>
                <span className="text-base font-bold text-emerald-700 font-mono">
                  {formatFinancialAmount(totalPaid, mainCurrency)}
                </span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="block text-amber-800">المستحق المتبقي</span>
                <span className="text-base font-bold text-amber-800 font-mono">
                  {formatFinancialAmount(totalRemaining, mainCurrency)}
                </span>
              </div>
            </div>

            {/* Invoices List */}
            <h3 className="font-bold text-sm mb-2">الفواتير والمستحقات المالية:</h3>
            <table className="w-full text-right text-xs border border-slate-200 mb-6">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border">رقم الفاتورة</th>
                  <th className="p-2 border">التاريخ</th>
                  <th className="p-2 border">البيان</th>
                  <th className="p-2 border">الإجمالي</th>
                  <th className="p-2 border">المسدد</th>
                  <th className="p-2 border">المتبقي</th>
                  <th className="p-2 border">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {financialRecords.map((r) => (
                  <tr key={r.id}>
                    <td className="p-2 border font-mono">{r.details.invoiceNumber}</td>
                    <td className="p-2 border font-mono">{r.details.invoiceDate}</td>
                    <td className="p-2 border">{r.title}</td>
                    <td className="p-2 border font-mono">{formatFinancialAmount(r.details.totalAmount, r.currency)}</td>
                    <td className="p-2 border font-mono">{formatFinancialAmount(r.details.paidAmount, r.currency)}</td>
                    <td className="p-2 border font-mono">{formatFinancialAmount(r.details.remainingAmount, r.currency)}</td>
                    <td className="p-2 border">{STATUS_CONFIG[r.status]?.labelAr || r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Official Structured Credentials Footer */}
            <div className="mt-8 pt-4 border-t-2 border-primary-900/80">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-[10px] text-slate-700 font-medium">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="block text-slate-400 font-bold mb-0.5">السجل التجاري (س.ت)</span>
                  <span className="font-mono font-black text-slate-900 block">{DEFAULT_COMPANY_CONFIG.commercialReg}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="block text-slate-400 font-bold mb-0.5">البطاقة الضريبية (ب.ض)</span>
                  <span className="font-mono font-black text-slate-900 block">{DEFAULT_COMPANY_CONFIG.taxId}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="block text-slate-400 font-bold mb-0.5">اعتماد الدفاع المدني</span>
                  <span className="font-bold text-slate-900 block">رقم {DEFAULT_COMPANY_CONFIG.civilDefenseReg}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="block text-slate-400 font-bold mb-0.5">البريد الإلكتروني</span>
                  <span className="font-mono font-bold text-slate-900 block truncate">{DEFAULT_COMPANY_CONFIG.email}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="block text-slate-400 font-bold mb-0.5">رقم الهاتف</span>
                  <span className="font-mono font-bold text-slate-900 block">{DEFAULT_COMPANY_CONFIG.phone}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="block text-slate-400 font-bold mb-0.5">العنوان والمقر</span>
                  <span className="font-bold text-slate-900 block truncate">{DEFAULT_COMPANY_CONFIG.addressAr}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <span>{DEFAULT_COMPANY_CONFIG.nameAr} • {DEFAULT_COMPANY_CONFIG.website}</span>
                <span>ملف إلكتروني رسمي معتمد وموثق</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-modals */}
        {selectedInvoiceForPrint && (
          <ProfessionalInvoiceModal
            invoice={selectedInvoiceForPrint}
            client={{
              id: client.id,
              companyName: client.companyName,
              companyNameAr: client.companyNameAr,
              phone: client.phone,
              address: client.address,
              user: client.user,
            }}
            onClose={() => setSelectedInvoiceForPrint(null)}
          />
        )}

        {showStatementModal && (
          <ClientStatementModal
            client={{
              id: client.id,
              companyName: client.companyName,
              companyNameAr: client.companyNameAr,
              phone: client.phone,
              address: client.address,
              user: client.user,
            }}
            invoices={financialRecords}
            onClose={() => setShowStatementModal(false)}
          />
        )}

        {showInvoiceForm && (
          <FinancialRecordFormModal
            clientId={client.id}
            existingRecord={editingRecord}
            onClose={() => {
              setShowInvoiceForm(false)
              setEditingRecord(null)
            }}
            onSuccess={async () => {
              await load()
            }}
          />
        )}

        {showRegisterVisitModal && (
          <RegisterVisitModal
            client={{
              id: client.id,
              companyName: data?.client?.companyName || client.companyName,
              companyNameAr: data?.client?.companyNameAr || client.companyNameAr,
              phone: data?.client?.phone || client.phone,
              address: data?.client?.address || client.address,
              user: data?.client?.user || client.user,
            }}
            existingVisit={editingVisit}
            onClose={() => {
              setShowRegisterVisitModal(false)
              setEditingVisit(null)
            }}
            onSuccess={async () => {
              await load()
            }}
          />
        )}

        {showEditInfoModal && (
          <EditClientInfoModal
            client={{
              id: client.id,
              companyName: data?.client?.companyName || client.companyName,
              companyNameAr: data?.client?.companyNameAr || client.companyNameAr,
              phone: data?.client?.phone || client.phone,
              address: data?.client?.address || client.address,
              user: data?.client?.user || client.user,
            }}
            onClose={() => setShowEditInfoModal(false)}
            onSuccess={async () => {
              await load()
              await onClientUpdated?.()
            }}
          />
        )}
      </div>
    </div>
  )
}
