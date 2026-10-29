'use client'

import { useRef, useState } from 'react'
import {
  Printer,
  X,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Copy,
  Check,
} from 'lucide-react'
import BrandLogo from '@/components/BrandLogo'
import {
  FinancialRecordView,
  STATUS_CONFIG,
  formatFinancialAmount,
  tafqitArabic,
  SERVICE_TYPES,
} from '@/lib/financial-records'
import { DEFAULT_COMPANY_CONFIG } from '@/lib/company-config'
import { printElement } from '@/lib/print-document'
import toast from 'react-hot-toast'

interface ProfessionalInvoiceModalProps {
  invoice: FinancialRecordView
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
  onClose: () => void
}

export default function ProfessionalInvoiceModal({
  invoice,
  client,
  onClose,
}: ProfessionalInvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [printing, setPrinting] = useState(false)
  const [copiedIban, setCopiedIban] = useState(false)

  const details = invoice.details
  const statusCfg = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.PENDING
  const serviceCfg = SERVICE_TYPES[details.serviceType] || SERVICE_TYPES.CONSULTATION

  const handlePrint = async () => {
    if (!printRef.current) return
    setPrinting(true)
    try {
      await printElement({
        element: printRef.current,
        title: `فاتورة-${details.invoiceNumber}-${client.companyName}`,
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

  const copyBankIban = (iban: string) => {
    navigator.clipboard.writeText(iban)
    setCopiedIban(true)
    toast.success('تم نسخ رقم الآيبان (IBAN) بنجاح')
    setTimeout(() => setCopiedIban(false), 2500)
  }

  const clientName = client.companyNameAr || client.companyName
  const invoiceDate = details.invoiceDate || invoice.createdAt.slice(0, 10)
  const dueDate = invoice.dueDate ? invoice.dueDate.slice(0, 10) : 'عند الاستلام'
  const bank = details.bankDetails || DEFAULT_COMPANY_CONFIG.bank
  const formattedInvoiceDate = (() => {
    try {
      const d = new Date(invoiceDate)
      return isNaN(d.getTime())
        ? invoiceDate
        : d.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            numberingSystem: 'arab',
          })
    } catch {
      return invoiceDate
    }
  })()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 sm:p-6 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl flex flex-col max-h-[95vh] border border-slate-100 overflow-hidden">
        {/* Modal Top Control Bar (Screen only) */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 no-print">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                معاينة وطباعة الفاتورة — {details.invoiceNumber}
              </h2>
              <p className="text-xs text-slate-500">
                مطالبة مالية وفاتورة رسمية معتمدة من استشاري السلامة والصحة المهنية
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
              {printing ? 'جاري التجهيز...' : 'طباعة الفاتورة'}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="overflow-y-auto p-6 sm:p-10 bg-slate-100/60">
          <div
            ref={printRef}
            id="invoice-print"
            data-printable="true"
            className="printable-document mx-auto w-full max-w-4xl print:max-w-full print:w-full rounded-2xl bg-white p-8 sm:p-10 shadow-lg border border-slate-200 text-slate-900"
            dir="rtl"
          >
            {/* 1. Corporate Header matching official identity */}
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
                {/* Right: Invoice Identity Pill */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 py-1.5 shadow-xs whitespace-nowrap">
                    <span className="text-[10px] font-bold text-slate-500 block">رقم الفاتورة:</span>
                    <span className="font-mono text-xs sm:text-sm font-black text-slate-900 tracking-wider whitespace-nowrap block">
                      {details.invoiceNumber}
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border} shadow-xs whitespace-nowrap`}>
                    <span className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.labelAr}
                  </span>
                </div>

                {/* Center: Official Title Badge */}
                <div className="text-center px-2 flex-1">
                  <span className="inline-block text-xs sm:text-sm font-bold text-slate-700 bg-slate-100/90 px-4 py-1.5 rounded-full border border-slate-200/90 whitespace-nowrap shadow-xs">
                    إدارة الشؤون المالية والحسابات ▪ فاتورة ضريبية رسمية معتمدة
                  </span>
                </div>

                {/* Left: Issue Date Box */}
                <div className="flex-shrink-0">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-1.5 text-center min-w-[140px] shadow-xs whitespace-nowrap">
                    <span className="block text-[10px] font-bold text-slate-500 mb-0.5">تاريخ إصدار الفاتورة</span>
                    <span className="text-xs sm:text-sm font-black text-slate-900 tracking-wide block">{formattedInvoiceDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Invoice Meta & Parties Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
              {/* Billed To (Client) */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-primary-600" />
                    بيانات العميل (المفوتر إليه):
                  </p>
                  <h3 className="font-black text-slate-900 text-base mb-2">{clientName}</h3>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-400 font-medium">مسؤول التواصل:</span>
                      <span className="font-bold text-slate-800">{client.user.name}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-400 font-medium">البريد الإلكتروني:</span>
                      <span className="font-mono text-slate-800 font-semibold">{client.user.email}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-400 font-medium">الهاتف:</span>
                      <span className="font-mono text-slate-800 font-semibold">{client.phone || client.user.phone || 'غير مسجل'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">العنوان / الموقع:</span>
                      <span className="text-slate-800 font-semibold text-right">{client.address || 'جمهورية مصر العربية'}</span>
                    </div>
                    {details.clientTaxNumber && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-400 font-medium">الرقم الضريبي للعميل:</span>
                        <span className="font-mono font-bold text-slate-900">{details.clientTaxNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Dates & Terms */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary-600" />
                    تفاصيل المطالبة والمواعيد:
                  </p>
                  <h3 className="font-black text-slate-900 text-base mb-2 font-mono">{details.invoiceNumber}</h3>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-400 font-medium">تاريخ الإصدار:</span>
                      <span className="font-bold text-slate-800">{formattedInvoiceDate}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-400 font-medium">تاريخ الاستحقاق:</span>
                      <span className="font-bold text-slate-800">{dueDate}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1">
                      <span className="text-slate-400 font-medium">نوع الخدمة / التصنيف:</span>
                      <span className="font-bold text-primary-800">{serviceCfg.labelAr}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">حالة السداد:</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.labelAr}
                      </span>
                    </div>
                    {details.paymentReference && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-400 font-medium">مرجع السداد:</span>
                        <span className="font-mono text-slate-800 font-bold">{details.paymentReference}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Invoice Items Table */}
            <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 shadow-xs">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b-2 border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center text-slate-500 font-bold">#</th>
                    <th className="py-3 px-4 text-slate-800 font-bold">بيان الخدمة والاستشارات</th>
                    <th className="py-3 px-4 w-20 text-center text-slate-800 font-bold">الكمية</th>
                    <th className="py-3 px-4 w-32 text-left text-slate-800 font-bold">سعر الوحدة</th>
                    <th className="py-3 px-4 w-36 text-left text-slate-800 font-bold">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {details.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">{item.description}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                        {item.quantity}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono font-semibold text-slate-700">
                        {formatFinancialAmount(item.unitPrice, invoice.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-left font-mono font-black text-slate-900">
                        {formatFinancialAmount(item.total, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. Totals & Tafqit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Tafqit Box */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-800 mb-1">
                    المبلغ الإجمالي كتابةً (تفقيط رسمي):
                  </p>
                  <p className="text-sm font-extrabold text-[#0a5439] leading-relaxed">
                    {tafqitArabic(details.totalAmount, invoice.currency)}
                  </p>
                </div>
                {details.terms && (
                  <div className="mt-3 pt-3 border-t border-emerald-200/60 text-xs text-emerald-900">
                    <p className="font-bold mb-0.5">الشروط وملاحظات السداد:</p>
                    <p className="text-[11px] text-slate-600 leading-normal">{details.terms}</p>
                  </div>
                )}
              </div>

              {/* Financial Summary Calculation */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span className="font-medium">المجموع الفرعي (Subtotal):</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatFinancialAmount(details.subtotal, invoice.currency)}
                  </span>
                </div>
                {details.taxRate > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span className="font-medium">ضريبة القيمة المضافة ({details.taxRate}%):</span>
                    <span className="font-mono font-bold text-slate-800">
                      +{formatFinancialAmount(details.taxAmount, invoice.currency)}
                    </span>
                  </div>
                )}
                {details.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span className="font-medium">الخصم الممنوح:</span>
                    <span className="font-mono font-bold">
                      -{formatFinancialAmount(details.discount, invoice.currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black text-slate-900">
                  <span>الإجمالي الكلي للفاتورة:</span>
                  <span className="font-mono text-primary-800">
                    {formatFinancialAmount(details.totalAmount, invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 border-t border-slate-200/60 pt-1.5">
                  <span className="font-medium">المبلغ المسدد:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatFinancialAmount(details.paidAmount, invoice.currency)}
                  </span>
                </div>
                <div
                  className={`flex justify-between text-sm font-black rounded-xl p-2.5 border ${
                    details.remainingAmount === 0
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}
                >
                  <span>الرصيد المستحق المتبقي:</span>
                  <span className="font-mono">
                    {formatFinancialAmount(details.remainingAmount, invoice.currency)}
                    {details.remainingAmount === 0 && (
                      <span className="text-[11px] font-bold text-emerald-700 ms-1.5">(مسدد بالكامل)</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Bank Account & Payment Instructions */}
            <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs">
              <div className="flex items-center justify-between mb-2">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="h-4 w-4 text-primary-600" />
                  بيانات السداد والتحويل البنكي المعتمد:
                </p>
                <span className="text-[11px] text-slate-500">
                  يرجى ذكر رقم الفاتورة ({details.invoiceNumber}) في مرجع التحويل
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700">
                <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                  <span className="block text-[11px] text-slate-400">اسم البنك:</span>
                  <span className="font-bold text-slate-900">{bank.bankName}</span>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                  <span className="block text-[11px] text-slate-400">اسم الحساب:</span>
                  <span className="font-bold text-slate-900">{bank.accountName}</span>
                  {bank.accountNumber && (
                    <span className="block font-mono text-[10px] text-slate-500 mt-0.5">
                      رقم الحساب: {bank.accountNumber}
                    </span>
                  )}
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-slate-200 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">رقم الآيبان (IBAN):</span>
                    <button
                      type="button"
                      onClick={() => copyBankIban(bank.iban)}
                      className="text-primary-600 hover:text-primary-800"
                      title="نسخ الآيبان"
                    >
                      {copiedIban ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <span className="font-mono font-bold text-slate-900 text-[11px] block mt-0.5 truncate">
                    {bank.iban}
                  </span>
                </div>
              </div>
            </div>

            {/* 6. Signatures & Stamp */}
            <div className="border-t-2 border-slate-200 pt-6">
              <div className="grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-700 mb-8">إعداد الحسابات / المراجع المالي</p>
                  <p className="border-t border-dashed border-slate-300 pt-2 text-slate-500 font-medium">
                    أ/ أحمد عبد الله
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-primary-500 text-primary-700 font-bold text-[10px] p-2 leading-tight">
                    الختم المعتمد<br />GLOBAL<br />OFFICIAL
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400">ختم الاعتماد الرسمي</p>
                </div>
                <div className="flex flex-col items-center">
                  <p className="font-bold text-slate-700 mb-6">اعتماد المدير العام / الاستشاري</p>
                  <p className="w-full border-t border-dashed border-slate-300 pt-2 text-slate-600 font-bold">
                    د/ استشاري السلامة المعتمد
                  </p>
                </div>
              </div>
            </div>

            {/* 7. Official Structured Credentials Footer */}
            <div className="mt-8 pt-4 border-t-2 border-[#1d4289]">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-[10px] text-slate-700 font-medium">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                  <span className="block text-slate-500 font-bold mb-0.5">السجل التجاري (س.ت)</span>
                  <span className="font-mono font-black text-slate-900 text-xs block">{DEFAULT_COMPANY_CONFIG.commercialReg}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                  <span className="block text-slate-500 font-bold mb-0.5">البطاقة الضريبية (ب.ض)</span>
                  <span className="font-mono font-black text-slate-900 text-xs block">{DEFAULT_COMPANY_CONFIG.taxId}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                  <span className="block text-slate-500 font-bold mb-0.5">اعتماد الدفاع المدني</span>
                  <span className="font-bold text-slate-900 text-xs block">ترخيص رقم {DEFAULT_COMPANY_CONFIG.civilDefenseReg}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                  <span className="block text-slate-500 font-bold mb-0.5">البريد الإلكتروني</span>
                  <span className="font-mono font-bold text-slate-900 text-[11px] block truncate">{DEFAULT_COMPANY_CONFIG.email}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                  <span className="block text-slate-500 font-bold mb-0.5">الهاتف المعتمد</span>
                  <span className="font-mono font-bold text-slate-900 text-xs block" dir="ltr">{DEFAULT_COMPANY_CONFIG.phone}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                  <span className="block text-slate-500 font-bold mb-0.5">المقر الرئيسي</span>
                  <span className="font-bold text-slate-900 text-[10px] block truncate">{DEFAULT_COMPANY_CONFIG.addressAr}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-600">{DEFAULT_COMPANY_CONFIG.nameAr} • {DEFAULT_COMPANY_CONFIG.website}</span>
                <span className="font-medium text-slate-500">وثيقة محاسبية إلكترونية رسمية معتمدة ومسجلة نظاماً</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
