'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Receipt,
  Printer,
  Clock,
  Loader2,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react'
import {
  FinancialRecordView,
  parseFinancialRecord,
  formatFinancialAmount,
  STATUS_CONFIG,
  SERVICE_TYPES,
} from '@/lib/financial-records'
import ProfessionalInvoiceModal from '@/components/ProfessionalInvoiceModal'
import ClientStatementModal from '@/components/ClientStatementModal'

interface ClientFinancesTabProps {
  language: string
}

export default function ClientFinancesTab({ language }: ClientFinancesTabProps) {
  const ar = language === 'ar'
  const [records, setRecords] = useState<FinancialRecordView[]>([])
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, count: 0 })
  const [clientInfo, setClientInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<FinancialRecordView | null>(null)
  const [showStatement, setShowStatement] = useState(false)

  const fetchFinances = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [finRes, profileRes] = await Promise.all([
        fetch('/api/client-finances'),
        fetch('/api/client-profile'),
      ])

      if (!finRes.ok) throw new Error('تعذر تحميل البيانات المالية')
      const finData = await finRes.json()
      const profileData = profileRes.ok ? await profileRes.json() : null

      const parsed: FinancialRecordView[] = (finData.financialRecords || []).map((r: any) =>
        parseFinancialRecord(r)
      )

      setRecords(parsed)
      setSummary(finData.summary || { total: 0, paid: 0, pending: 0, count: 0 })
      if (profileData?.client) {
        setClientInfo(profileData.client)
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تحميل الفواتير')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchFinances()
  }, [fetchFinances])

  if (loading) {
    return (
      <div className="card py-16 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-500" />
        <p className="mt-3 text-sm text-gray-500 font-medium">
          {ar ? 'جاري تحميل السجل المالي والفواتير...' : 'Loading financial records...'}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card py-10 text-center text-red-600">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
        <p className="font-bold">{error}</p>
        <button onClick={fetchFinances} className="btn-secondary mt-4 px-4 py-2 text-xs">
          {ar ? 'إعادة المحاولة' : 'Retry'}
        </button>
      </div>
    )
  }

  const mainCurrency = records[0]?.currency || 'EGP'

  return (
    <div className="space-y-6">
      {/* Top Header & Statement Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary-600" />
            {ar ? 'الفواتير والمستحقات المالية' : 'Invoices & Billing'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {ar
              ? 'متابعة الفواتير الصادرة والمبالغ المسددة وطباعة الفواتير الضريبية المعتمدة'
              : 'Track invoices, payments, and print certified tax invoices'}
          </p>
        </div>

        {records.length > 0 && (
          <button
            onClick={() => setShowStatement(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition"
          >
            <FileSpreadsheet className="h-4 w-4 text-primary-600" />
            {ar ? 'طباعة كشف حساب معتمد' : 'Print Statement of Account'}
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card border-primary-100 bg-primary-50/50 p-5">
          <span className="text-xs font-bold text-primary-800">
            {ar ? 'إجمالي المطالبات والفواتير' : 'Total Invoiced'}
          </span>
          <p className="mt-2 text-2xl font-black text-gray-900 font-mono">
            {formatFinancialAmount(summary.total, mainCurrency)}
          </p>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {ar ? `${records.length} فاتورة مسجلة` : `${records.length} Invoices`}
          </span>
        </div>

        <div className="card border-emerald-100 bg-emerald-50/50 p-5">
          <span className="text-xs font-bold text-emerald-800">
            {ar ? 'إجمالي المبالغ المسددة' : 'Total Paid'}
          </span>
          <p className="mt-2 text-2xl font-black text-emerald-700 font-mono">
            {formatFinancialAmount(summary.paid, mainCurrency)}
          </p>
          <span className="text-[11px] text-emerald-600 mt-1 block">
            {ar ? 'تم التحصيل والاعتماد' : 'Cleared & Verified'}
          </span>
        </div>

        <div
          className={`card p-5 ${
            summary.pending > 0 ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200 bg-white'
          }`}
        >
          <span className="text-xs font-bold text-amber-800">
            {ar ? 'الرصيد المستحق المتبقي' : 'Outstanding Balance'}
          </span>
          <p className="mt-2 text-2xl font-black text-amber-900 font-mono">
            {formatFinancialAmount(summary.pending, mainCurrency)}
          </p>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {summary.pending > 0
              ? (ar ? 'يرجى مراجعة مواعيد الاستحقاق' : 'Payment due')
              : (ar ? 'لا توجد مستحقات معلقة' : 'All clear')}
          </span>
        </div>
      </div>

      {/* Invoices List */}
      {records.length === 0 ? (
        <div className="card py-12 text-center">
          <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-base font-semibold text-gray-800">
            {ar ? 'لا توجد فواتير مسجلة حالياً' : 'No invoices issued yet'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {ar
              ? 'سيتم إدراج أي مطالبات مالية أو فواتير استشارية جديدة هنا فور صدورها.'
              : 'Consultation invoices and billing statements will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((inv) => {
            const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.PENDING
            const serviceCfg = SERVICE_TYPES[inv.details.serviceType] || SERVICE_TYPES.CONSULTATION

            return (
              <div
                key={inv.id}
                className="card p-5 hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="rounded-lg bg-primary-50 px-2.5 py-0.5 font-mono text-xs font-bold text-primary-900 border border-primary-200">
                      {inv.details.invoiceNumber}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      {ar ? cfg.labelAr : cfg.labelEn}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                      {ar ? serviceCfg.labelAr : serviceCfg.labelEn}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-gray-900">{inv.title}</h4>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      {ar ? 'تاريخ الإصدار:' : 'Issued:'}{' '}
                      {inv.details.invoiceDate || inv.createdAt.slice(0, 10)}
                    </span>
                    {inv.dueDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {ar ? 'الاستحقاق:' : 'Due:'} {inv.dueDate.slice(0, 10)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-5 sm:border-s sm:border-gray-100 sm:ps-6">
                  <div className="text-left sm:text-end">
                    <span className="block text-[11px] text-gray-400">
                      {ar ? 'القيمة الإجمالية' : 'Total Amount'}
                    </span>
                    <span className="font-mono text-lg font-black text-gray-900">
                      {formatFinancialAmount(inv.details.totalAmount, inv.currency)}
                    </span>
                    {inv.details.remainingAmount > 0 && (
                      <div className="text-[11px] text-amber-700 font-bold">
                        {ar ? 'المتبقي:' : 'Due:'}{' '}
                        {formatFinancialAmount(inv.details.remainingAmount, inv.currency)}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedInvoice(inv)}
                    className="btn-primary px-3.5 py-2 text-xs"
                    title={ar ? 'معاينة وطباعة الفاتورة الرسمية' : 'View & Print Invoice'}
                  >
                    <Printer className="h-4 w-4" />
                    {ar ? 'طباعة فاتورة' : 'Print Invoice'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Invoice Print Modal */}
      {selectedInvoice && clientInfo && (
        <ProfessionalInvoiceModal
          invoice={selectedInvoice}
          client={{
            id: clientInfo.id || 'client-id',
            companyName: clientInfo.companyName,
            companyNameAr: clientInfo.companyNameAr,
            phone: clientInfo.phone,
            address: clientInfo.address,
            user: clientInfo.user || { name: clientInfo.companyName, email: '' },
          }}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Statement Modal */}
      {showStatement && clientInfo && (
        <ClientStatementModal
          client={{
            id: clientInfo.id || 'client-id',
            companyName: clientInfo.companyName,
            companyNameAr: clientInfo.companyNameAr,
            phone: clientInfo.phone,
            address: clientInfo.address,
            user: clientInfo.user || { name: clientInfo.companyName, email: '' },
          }}
          invoices={records}
          onClose={() => setShowStatement(false)}
        />
      )}
    </div>
  )
}
