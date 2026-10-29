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
            className="mx-auto w-full max-w-3xl rounded-2xl bg-white p-8 sm:p-10 shadow-lg border border-slate-200 text-slate-900"
            dir="rtl"
          >
            {/* 1. Header & Agency Branding */}
            <div className="border-b-2 border-primary-600 pb-6 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 flex-shrink-0">
                    <BrandLogo variant="header" className="h-20 w-20" />
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold text-primary-900">
                      مكتب استشارات السلامة والصحة المهنية والبيئة
                    </h1>
                    <p className="text-xs font-semibold text-primary-700">
                      QHSSE Consulting & Engineering Services
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      س.ت: 104820 • ب.ض: 549-812-701 • اعتماد الدفاع المدني رقم 412
                    </p>
                    <p className="text-[11px] text-slate-500">
                      القاهرة - جمهورية مصر العربية • هاتف: 01000000000 • بريد: finance@qhsse.com
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-end w-full sm:w-auto">
                  <div className="inline-block rounded-xl bg-primary-50 px-4 py-2 border border-primary-200 text-right">
                    <span className="block text-xs font-bold uppercase tracking-wider text-primary-700">
                      فاتورة ضريبية معتمدة
                    </span>
                    <span className="text-sm font-mono font-black text-primary-950">
                      {details.invoiceNumber}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-start sm:justify-end gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${statusCfg.dot}`} />
                      {statusCfg.labelAr}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Invoice Meta & Parties Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 text-sm">
              {/* Billed To (Client) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary-600" />
                  بيانات العميل (المفوتر إليه):
                </p>
                <h3 className="font-bold text-slate-900 text-base mb-1">{clientName}</h3>
                <div className="space-y-1 text-xs text-slate-600">
                  <p>
                    <span className="text-slate-400">مسؤول التواصل:</span> {client.user.name}
                  </p>
                  <p>
                    <span className="text-slate-400">البريد الإلكتروني:</span> {client.user.email}
                  </p>
                  <p>
                    <span className="text-slate-400">الهاتف:</span>{' '}
                    {client.phone || client.user.phone || 'غير مسجل'}
                  </p>
                  <p>
                    <span className="text-slate-400">العنوان / الموقع:</span>{' '}
                    {client.address || 'جمهورية مصر العربية'}
                  </p>
                  {details.clientTaxNumber && (
                    <p>
                      <span className="text-slate-400">الرقم الضريبي للعميل:</span>{' '}
                      {details.clientTaxNumber}
                    </p>
                  )}
                </div>
              </div>

              {/* Invoice Dates & Terms */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary-600" />
                  تفاصيل المطالبة والمواعيد:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500">تاريخ الإصدار:</span>
                    <span className="font-semibold text-slate-800 font-mono">{invoiceDate}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500">تاريخ الاستحقاق:</span>
                    <span className="font-semibold text-slate-800 font-mono">{dueDate}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-slate-500">نوع الخدمة / التصنيف:</span>
                    <span className="font-semibold text-primary-700">{serviceCfg.labelAr}</span>
                  </div>
                  {details.paymentReference && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">مرجع السداد:</span>
                      <span className="font-mono text-slate-800 font-semibold">
                        {details.paymentReference}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Invoice Items Table */}
            <div className="mb-6 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-right text-xs sm:text-sm">
                <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">بيان الخدمة والاستشارات</th>
                    <th className="py-3 px-4 w-20 text-center">الكمية</th>
                    <th className="py-3 px-4 w-28 text-left">سعر الوحدة</th>
                    <th className="py-3 px-4 w-32 text-left">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {details.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{item.description}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-left font-mono text-slate-600">
                        {formatFinancialAmount(item.unitPrice, invoice.currency)}
                      </td>
                      <td className="py-3 px-4 text-left font-mono font-bold text-slate-900">
                        {formatFinancialAmount(item.total, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 4. Totals & Tafqit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {/* Tafqit Box */}
              <div className="rounded-xl border border-primary-100 bg-primary-50/60 p-4 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-primary-800 mb-1">
                    المبلغ الإجمالي كتابةً (تفقيط رسمي):
                  </p>
                  <p className="text-sm font-bold text-primary-950 leading-relaxed">
                    {tafqitArabic(details.totalAmount, invoice.currency)}
                  </p>
                </div>
                {details.terms && (
                  <div className="mt-3 pt-3 border-t border-primary-200/60 text-xs text-primary-800">
                    <p className="font-semibold mb-0.5">الشروط وملاحظات السداد:</p>
                    <p className="text-[11px] text-slate-600 leading-normal">{details.terms}</p>
                  </div>
                )}
              </div>

              {/* Financial Summary Calculation */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>المجموع الفرعي (Subtotal):</span>
                  <span className="font-mono font-semibold">
                    {formatFinancialAmount(details.subtotal, invoice.currency)}
                  </span>
                </div>
                {details.taxRate > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>ضريبة القيمة المضافة ({details.taxRate}%):</span>
                    <span className="font-mono font-semibold">
                      +{formatFinancialAmount(details.taxAmount, invoice.currency)}
                    </span>
                  </div>
                )}
                {details.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>الخصم الممنوح:</span>
                    <span className="font-mono font-semibold">
                      -{formatFinancialAmount(details.discount, invoice.currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900">
                  <span>الإجمالي الكلي للفاتورة:</span>
                  <span className="font-mono text-primary-700">
                    {formatFinancialAmount(details.totalAmount, invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 border-t border-slate-200/60 pt-1.5">
                  <span>المبلغ المسدد:</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {formatFinancialAmount(details.paidAmount, invoice.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-amber-900 bg-amber-50 rounded-lg p-2 border border-amber-200">
                  <span>الرصيد المستحق المتبقي:</span>
                  <span className="font-mono">
                    {formatFinancialAmount(details.remainingAmount, invoice.currency)}
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
                  <span className="font-bold text-slate-900">البنك التجاري الدولي (CIB)</span>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                  <span className="block text-[11px] text-slate-400">اسم الحساب:</span>
                  <span className="font-bold text-slate-900">مكتب QHSSE للاستشارات</span>
                </div>
                <div className="rounded-lg bg-white p-2.5 border border-slate-200 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">رقم الآيبان (IBAN):</span>
                    <button
                      type="button"
                      onClick={() => copyBankIban('EG380004000100045892147001')}
                      className="text-primary-600 hover:text-primary-800"
                      title="نسخ الآيبان"
                    >
                      {copiedIban ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <span className="font-mono font-bold text-slate-900 text-[11px] block mt-0.5">
                    EG380004000100045892147001
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
                    الختم المعتمد<br />QHSSE<br />OFFICIAL
                  </div>
                  <p className="mt-2 text-[10px] text-slate-400">ختم الاعتماد الرسمي</p>
                </div>
                <div>
                  <p className="font-bold text-slate-700 mb-8">اعتماد المدير العام / الاستشاري</p>
                  <p className="border-t border-dashed border-slate-300 pt-2 text-slate-500 font-medium">
                    د/ استشاري السلامة المعتمد
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-6 border-t border-slate-100 pt-3 text-center text-[11px] text-slate-400">
              وثيقة محاسبية إلكترونية صادرة عن نظام إدارة استشارات السلامة والصحة المهنية والبيئة • QHSSE Consultant Portal
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
