'use client'

import { useRef, useState } from 'react'
import {
  Printer,
  X,
  Building2,
  FileSpreadsheet,
} from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import {
  FinancialRecordView,
  formatFinancialAmount,
  tafqitArabic,
  STATUS_CONFIG,
} from '@/lib/financial-records'
import { DEFAULT_COMPANY_CONFIG } from '@/lib/company-config'
import { printElement } from '@/lib/print-document'
import toast from 'react-hot-toast'

interface ClientStatementModalProps {
  client: {
    id: string
    companyName: string
    companyNameAr?: string | null
    phone?: string | null
    address?: string | null
    user: {
      name: string
      email: string
      phone?: string | null
    }
  }
  invoices: FinancialRecordView[]
  onClose: () => void
}

export default function ClientStatementModal({
  client,
  invoices,
  onClose,
}: ClientStatementModalProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [printing, setPrinting] = useState(false)

  const clientName = client.companyNameAr || client.companyName
  const today = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    numberingSystem: 'arab',
  })

  // Aggregate totals
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.details.totalAmount, 0)
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.details.paidAmount, 0)
  const totalRemaining = Math.max(0, totalInvoiced - totalPaid)
  const currency = invoices[0]?.currency || 'EGP'

  const handlePrint = async () => {
    if (!printRef.current) return
    setPrinting(true)
    try {
      await printElement({
        element: printRef.current,
        title: `كشف-حساب-${client.companyName}`,
        lang: 'ar',
        dir: 'rtl',
      })
    } catch (err) {
      console.error('Print error:', err)
      toast.error('تعذر إتمام عملية الطباعة')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 sm:p-6 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl rounded-3xl bg-white shadow-2xl flex flex-col max-h-[95vh] border border-slate-100 overflow-hidden">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 no-print">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                كشف حساب ومستحقات العميل — {clientName}
              </h2>
              <p className="text-xs text-slate-500">
                بيان تفصيلي معتمد بحركة الفواتير والمستحقات والمسددات
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={printing}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition"
            >
              <Printer className="h-4 w-4" />
              {printing ? 'جاري التجهيز...' : 'طباعة كشف الحساب'}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document */}
        <div className="overflow-y-auto p-6 sm:p-10 bg-slate-100/60">
          <div
            ref={printRef}
            id="client-statement-print"
            data-printable="true"
            className="printable-document mx-auto w-full max-w-4xl rounded-2xl bg-white p-8 sm:p-10 shadow-lg border border-slate-200 text-slate-900"
            dir="rtl"
          >
            {/* Header */}
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
                {/* Right: Client identity pill */}
                <div className="flex items-center gap-2 order-2 sm:order-1">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-1.5 shadow-xs">
                    <span className="block text-[10px] font-bold text-slate-500">كشف حساب موحد:</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate block max-w-[200px]">{clientName}</span>
                  </div>
                </div>

                {/* Center: Official Title Badge */}
                <div className="order-1 sm:order-2 text-center">
                  <span className="inline-block text-xs sm:text-sm font-bold text-slate-700 bg-slate-100/90 px-4 py-1.5 rounded-full border border-slate-200/90 whitespace-nowrap shadow-xs">
                    إدارة الشؤون المالية والحسابات ▪ بيان كشف حساب موحد للعميل
                  </span>
                </div>

                {/* Left: Issue Date Box */}
                <div className="order-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-1.5 text-center min-w-[135px] shadow-xs">
                    <span className="block text-[10px] font-bold text-slate-500 mb-0.5">تاريخ إصدار الكشف</span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 tracking-wide">{today}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Card & Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-1 text-xs">
                <p className="font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-primary-600" />
                  بيانات العميل:
                </p>
                <h3 className="font-bold text-slate-900 text-sm">{clientName}</h3>
                <p className="text-slate-600 mt-1">المسؤول: {client.user.name}</p>
                <p className="text-slate-600">الهاتف: {client.phone || client.user.phone || '-'}</p>
                <p className="text-slate-600">العنوان: {client.address || '-'}</p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs flex flex-col justify-between">
                <div>
                  <span className="font-bold text-emerald-800">إجمالي المبالغ المسددة:</span>
                  <p className="text-xl font-extrabold text-emerald-700 font-mono mt-1">
                    {formatFinancialAmount(totalPaid, currency)}
                  </p>
                </div>
                <p className="text-[11px] text-emerald-600 mt-2">
                  نسبة التحصيل: {totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 100) : 0}%
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs flex flex-col justify-between">
                <div>
                  <span className="font-bold text-amber-800">صافي المستحقات المتبقية:</span>
                  <p className="text-xl font-extrabold text-amber-800 font-mono mt-1">
                    {formatFinancialAmount(totalRemaining, currency)}
                  </p>
                </div>
                <p className="text-[11px] text-amber-700 mt-2">
                  {totalRemaining > 0 ? 'رصيد مطلوب سداده' : 'الحساب خالص بالكامل'}
                </p>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="mb-6 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">رقم الفاتورة</th>
                    <th className="py-2.5 px-3">البيان والخدمات</th>
                    <th className="py-2.5 px-3 text-left">قيمة الفاتورة</th>
                    <th className="py-2.5 px-3 text-left">المسدد</th>
                    <th className="py-2.5 px-3 text-left">المتبقي</th>
                    <th className="py-2.5 px-3 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.length ? (
                    invoices.map((inv) => {
                      const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.PENDING
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {inv.details.invoiceDate || inv.createdAt.slice(0, 10)}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-primary-700">
                            {inv.details.invoiceNumber}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{inv.title}</td>
                          <td className="py-2.5 px-3 text-left font-mono font-semibold">
                            {formatFinancialAmount(inv.details.totalAmount, inv.currency)}
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono text-emerald-700 font-semibold">
                            {formatFinancialAmount(inv.details.paidAmount, inv.currency)}
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono text-amber-800 font-bold">
                            {formatFinancialAmount(inv.details.remainingAmount, inv.currency)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}
                            >
                              {cfg.labelAr}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        لا توجد فواتير أو مستحقات مسجلة لهذا العميل.
                      </td>
                    </tr>
                  )}
                </tbody>
                {invoices.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 text-left text-slate-700">
                        الإجمالي النهائي:
                      </td>
                      <td className="py-3 px-3 text-left font-mono text-slate-900 font-extrabold">
                        {formatFinancialAmount(totalInvoiced, currency)}
                      </td>
                      <td className="py-3 px-3 text-left font-mono text-emerald-700 font-extrabold">
                        {formatFinancialAmount(totalPaid, currency)}
                      </td>
                      <td className="py-3 px-3 text-left font-mono text-amber-800 font-extrabold">
                        {formatFinancialAmount(totalRemaining, currency)}
                      </td>
                      <td className="py-3 px-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Tafqit */}
            <div className="mb-6 rounded-xl border border-primary-100 bg-primary-50/50 p-3 text-xs text-primary-950">
              <span className="font-bold">صافي المستحق المطلوب سداده كتابةً: </span>
              <span className="font-extrabold">{tafqitArabic(totalRemaining, currency)}</span>
            </div>

            {/* Signatures */}
            <div className="border-t-2 border-slate-200 pt-6">
              <div className="grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-700 mb-8">إعداد الحسابات والمراجعة المالية</p>
                  <p className="border-t border-dashed border-slate-300 pt-2 text-slate-500">
                    التوقيع: ............................................
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-700 mb-8">اعتماد الإدارة العامة واستشاري السلامة</p>
                  <p className="border-t border-dashed border-slate-300 pt-2 text-slate-500">
                    الختم والتوقيع: ............................................
                  </p>
                </div>
              </div>
            </div>

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
                <span>كشف حساب مالي إلكتروني رسمي وموثق</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
