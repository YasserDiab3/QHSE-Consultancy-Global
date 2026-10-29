'use client'

import { useState } from 'react'
import {
  X,
  Plus,
  Trash2,
  Save,
  Loader2,
  CreditCard,
  Receipt,
} from 'lucide-react'
import {
  FinancialRecordView,
  FinancialItem,
  SERVICE_TYPES,
  PaymentMethod,
  PAYMENT_METHODS,
  serializeFinancialDetails,
} from '@/lib/financial-records'
import toast from 'react-hot-toast'

interface FinancialRecordFormModalProps {
  clientId: string
  existingRecord?: FinancialRecordView | null
  onClose: () => void
  onSuccess: () => Promise<void> | void
}

export default function FinancialRecordFormModal({
  clientId,
  existingRecord,
  onClose,
  onSuccess,
}: FinancialRecordFormModalProps) {
  const isEditing = Boolean(existingRecord)

  const [title, setTitle] = useState(existingRecord?.title || '')
  const [serviceType, setServiceType] = useState(existingRecord?.details.serviceType || 'CONSULTATION')
  const [invoiceNumber, setInvoiceNumber] = useState(
    () =>
      existingRecord?.details.invoiceNumber ||
      `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
  )
  const [invoiceDate, setInvoiceDate] = useState(
    () => existingRecord?.details.invoiceDate || new Date().toISOString().slice(0, 10)
  )
  const [dueDate, setDueDate] = useState(
    existingRecord?.dueDate ? existingRecord.dueDate.slice(0, 10) : ''
  )
  const [currency, setCurrency] = useState(existingRecord?.currency || 'EGP')
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED'>(
    existingRecord?.status || 'PENDING'
  )

  // Items
  const [items, setItems] = useState<FinancialItem[]>(
    existingRecord?.details.items && existingRecord.details.items.length > 0
      ? existingRecord.details.items
      : [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }]
  )

  // Tax & Discount
  const [taxRate, setTaxRate] = useState<number>(existingRecord?.details.taxRate ?? 0)
  const [discount, setDiscount] = useState<number>(existingRecord?.details.discount ?? 0)

  // Payment Details
  const [paidAmount, setPaidAmount] = useState<number>(existingRecord?.details.paidAmount ?? 0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    existingRecord?.details.paymentMethod || 'BANK_TRANSFER'
  )
  const [paymentReference, setPaymentReference] = useState(
    existingRecord?.details.paymentReference || ''
  )
  const [paymentDate, setPaymentDate] = useState(
    existingRecord?.details.paidAt ? existingRecord.details.paidAt.slice(0, 10) : ''
  )

  // Extra Details
  const [terms, setTerms] = useState(
    existingRecord?.details.terms ||
      'يتم السداد خلال 15 يوماً من تاريخ استحقاق الفاتورة عبر التحويل البنكي المعتمد.'
  )
  const [clientTaxNumber, setClientTaxNumber] = useState(
    existingRecord?.details.clientTaxNumber || ''
  )
  const [notesText, setNotesText] = useState(existingRecord?.details.notesText || '')

  const [submitting, setSubmitting] = useState(false)

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
  const taxAmount = (subtotal * (Number(taxRate) || 0)) / 100
  const totalAmount = Math.max(0, subtotal + taxAmount - (Number(discount) || 0))
  const remainingAmount = Math.max(0, totalAmount - (Number(paidAmount) || 0))

  const handleItemChange = (index: number, field: keyof FinancialItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev]
      const curr = { ...updated[index], [field]: value }
      if (field === 'quantity' || field === 'unitPrice') {
        const q = Math.max(1, Number(field === 'quantity' ? value : curr.quantity) || 1)
        const p = Math.max(0, Number(field === 'unitPrice' ? value : curr.unitPrice) || 0)
        curr.total = q * p
      }
      updated[index] = curr
      return updated
    })
  }

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Quick Status change adjustments
  const handleStatusChange = (newStatus: 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED') => {
    setStatus(newStatus)
    if (newStatus === 'PAID') {
      setPaidAmount(totalAmount)
      if (!paymentDate) setPaymentDate(new Date().toISOString().slice(0, 10))
    } else if (newStatus === 'PENDING') {
      setPaidAmount(0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanTitle = title.trim() || items[0]?.description.trim() || 'فاتورة خدمات استشارية'
    if (items.some((it) => !it.description.trim())) {
      toast.error('يرجى كتابة وصف لجميع بنود الفاتورة')
      return
    }

    if (totalAmount <= 0) {
      toast.error('يجب أن تكون قيمة الفاتورة أكبر من صفر')
      return
    }

    setSubmitting(true)
    try {
      const richDetails = {
        invoiceNumber: invoiceNumber.trim() || `INV-${new Date().getFullYear()}-0001`,
        invoiceDate,
        serviceType,
        items,
        subtotal,
        taxRate,
        taxAmount,
        discount,
        totalAmount,
        paidAmount: status === 'PAID' ? totalAmount : (status === 'PENDING' ? 0 : paidAmount),
        remainingAmount: status === 'PAID' ? 0 : (status === 'PENDING' ? totalAmount : remainingAmount),
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        paidAt: status === 'PAID' || (status === 'PARTIAL' && paidAmount > 0) ? (paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString()) : null,
        terms: terms.trim() || undefined,
        clientTaxNumber: clientTaxNumber.trim() || undefined,
        notesText: notesText.trim() || undefined,
      }

      const notesPayload = serializeFinancialDetails(richDetails)

      if (isEditing && existingRecord) {
        // PATCH update
        const res = await fetch(`/api/clients/${clientId}/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recordId: existingRecord.id,
            title: cleanTitle,
            amount: totalAmount,
            currency,
            status,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            notes: notesPayload,
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error(err?.error || 'تعذر تحديث الفاتورة')
        }
        toast.success('تم تحديث الفاتورة والمستحقات بنجاح')
      } else {
        // POST create
        const res = await fetch(`/api/clients/${clientId}/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'financial',
            title: cleanTitle,
            amount: totalAmount,
            currency,
            status,
            dueDate: dueDate ? new Date(dueDate).toISOString() : null,
            notes: notesPayload,
          }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error(err?.error || 'تعذر تسجيل الفاتورة')
        }
        toast.success('تم تسجيل الفاتورة والمستحقات بنجاح')
      }

      await onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء حفظ الفاتورة')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 sm:p-6 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl flex flex-col max-h-[92vh] border border-slate-100 overflow-hidden" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditing ? 'تعديل الفاتورة / المستحق المالي' : 'تسجيل فاتورة ومستحق مالي جديد'}
              </h2>
              <p className="text-xs text-slate-500">
                إدخال بنود المطالبة والضرائب وشروط السداد بشكل محاسبي احترافي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6">
          {/* Top Row: Title, Service Type, Invoice # */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="label-field">عنوان الفاتورة / بيان المطالبة *</label>
              <input
                type="text"
                className="input-field"
                placeholder="مثال: فاتورة استشارات السلامة والصحة المهنية - الربع الأول"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label-field">رقم الفاتورة (Invoice #) *</label>
              <input
                type="text"
                className="input-field font-mono font-bold"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Row 2: Service Type, Dates, Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label-field">تصنيف الخدمة</label>
              <select
                className="input-field"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
              >
                {Object.entries(SERVICE_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.labelAr}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-field">تاريخ الإصدار</label>
              <input
                type="date"
                className="input-field"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label-field">تاريخ الاستحقاق</label>
              <input
                type="date"
                className="input-field"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="label-field">العملة</label>
              <select
                className="input-field font-semibold"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="EGP">EGP (جنيه مصري)</option>
                <option value="SAR">SAR (ريال سعودي)</option>
                <option value="USD">USD (دولار أمريكي)</option>
                <option value="EUR">EUR (يورو)</option>
              </select>
            </div>
          </div>

          {/* Items Section */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">بنود الفاتورة والخدمات المقدمة</h3>
                <p className="text-xs text-slate-500">أدخل تفاصيل الخدمات والكميات والأسعار</p>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                إضافة بند آخر
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200"
                >
                  <div className="col-span-12 sm:col-span-6">
                    <input
                      type="text"
                      className="input-field py-1.5 text-xs"
                      placeholder="وصف البند / الخدمة المقدمة..."
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      className="input-field py-1.5 text-xs text-center font-mono"
                      placeholder="الكمية"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="input-field py-1.5 text-xs text-left font-mono"
                      placeholder="سعر الوحدة"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-1 text-left font-mono font-bold text-xs text-slate-800">
                    {item.total}
                  </div>
                  <div className="col-span-1 sm:col-span-1 text-center">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-400 hover:text-red-600 p-1"
                        title="حذف البند"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Row */}
            <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="text-slate-600 block mb-1">ضريبة القيمة المضافة (%)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTaxRate(0)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      taxRate === 0 ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    0% معفية
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxRate(14)}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      taxRate === 14 ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    14% ض.ق.م
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1">الخصم الممنوح ({currency})</label>
                <input
                  type="number"
                  min="0"
                  className="input-field py-1 text-xs font-mono"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                />
              </div>

              <div className="bg-primary-50 p-2.5 rounded-xl border border-primary-200 text-right space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>المجموع الفرعي:</span>
                  <span className="font-mono font-bold">{subtotal} {currency}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>الضريبة ({taxRate}%):</span>
                    <span className="font-mono font-bold">+{taxAmount} {currency}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1 border-t border-primary-200">
                  <span>الإجمالي الكلي:</span>
                  <span className="font-mono text-primary-700">{totalAmount} {currency}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status & Details Section */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary-600" />
              حالة السداد والتحصيل
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange('PENDING')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                  status === 'PENDING'
                    ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                مستحقة الدفع (غير مسددة)
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('PAID')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                  status === 'PAID'
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                مسددة بالكامل
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('PARTIAL')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                  status === 'PARTIAL'
                    ? 'bg-blue-100 border-blue-300 text-blue-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                مسددة جزئياً (دفعة)
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange('CANCELLED')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition ${
                  status === 'CANCELLED'
                    ? 'bg-slate-300 border-slate-400 text-slate-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                ملغاة
              </button>
            </div>

            {(status === 'PAID' || status === 'PARTIAL') && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <label className="text-slate-600 block mb-1">المبلغ المسدد ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    className="input-field py-1 text-xs font-mono font-bold text-emerald-700"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">طريقة السداد</label>
                  <select
                    className="input-field py-1 text-xs"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    {Object.entries(PAYMENT_METHODS).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.labelAr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">رقم مرجع السداد / الشيك</label>
                  <input
                    type="text"
                    className="input-field py-1 text-xs font-mono"
                    placeholder="مثال: TRX-98213"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">تاريخ السداد</label>
                  <input
                    type="date"
                    className="input-field py-1 text-xs"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Terms, Tax Number & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label-field">الرقم الضريبي للعميل (اختياري)</label>
              <input
                type="text"
                className="input-field text-xs font-mono"
                placeholder="مثال: 549-812-701"
                value={clientTaxNumber}
                onChange={(e) => setClientTaxNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="label-field">شروط وملاحظات السداد (بالفاتورة)</label>
              <textarea
                rows={2}
                className="input-field text-xs"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </div>
            <div>
              <label className="label-field">ملاحظات إدارية داخلية (سرية)</label>
              <textarea
                rows={2}
                className="input-field text-xs"
                placeholder="ملاحظات سرية لفريق الحسابات..."
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
              />
            </div>
          </div>

          {/* Footer Submit Bar */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              الصافي المستحق:{' '}
              <span className="font-mono font-bold text-amber-800 text-sm">
                {remainingAmount} {currency}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary px-4 py-2 text-sm"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary px-6 py-2 text-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    {isEditing ? 'حفظ التعديلات' : 'تسجيل الفاتورة'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
