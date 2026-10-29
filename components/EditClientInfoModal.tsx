'use client'

import { useState } from 'react'
import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface EditClientInfoModalProps {
  client: {
    id: string
    companyName: string
    companyNameAr?: string
    phone?: string
    address?: string
    user: {
      id?: string
      name: string
      email: string
      phone?: string
    }
  }
  onClose: () => void
  onSuccess: () => void | Promise<void>
}

export default function EditClientInfoModal({
  client,
  onClose,
  onSuccess,
}: EditClientInfoModalProps) {
  const [companyNameAr, setCompanyNameAr] = useState(client.companyNameAr || client.companyName || '')
  const [companyName, setCompanyName] = useState(client.companyName || '')
  const [name, setName] = useState(client.user?.name || '')
  const [email, setEmail] = useState(client.user?.email || '')
  const [phone, setPhone] = useState(client.phone || client.user?.phone || '')
  const [address, setAddress] = useState(client.address || '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!companyName.trim()) {
      toast.error('يرجى كتابة اسم المنشأة أو الشركة')
      return
    }

    if (!name.trim()) {
      toast.error('يرجى تحديد اسم مسؤول التواصل')
      return
    }

    if (!email.trim()) {
      toast.error('يرجى تحديد البريد الإلكتروني')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          companyNameAr: companyNameAr.trim() || companyName.trim(),
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'تعذر تحديث بيانات المنشأة')
      }

      toast.success('تم تحديث بيانات المنشأة والاتصال بنجاح')
      await onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء تحديث البيانات')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-l from-slate-900 via-primary-950 to-primary-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-primary-300 shadow-inner">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">تعديل بيانات المنشأة والاتصال</h2>
              <p className="text-xs text-primary-200/90 mt-0.5">
                تحديث بيانات الشركة ومسؤول التواصل المسجل في النظام
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Arabic Company Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                اسم المنشأة الرسمي بالعربية <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={companyNameAr}
                  onChange={(e) => setCompanyNameAr(e.target.value)}
                  placeholder="مثال: شركة النيل للصناعات الهندسية"
                  className="input-field py-2 pe-9 text-xs"
                />
              </div>
            </div>

            {/* English / Trade Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الاسم التجاري أو بالإنجليزية <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="مثال: Nile Engineering Industries"
                  className="input-field py-2 pe-9 text-xs font-sans"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Contact Person Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                مسؤول التواصل والاتصال <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسم الشخص المسؤول"
                  className="input-field py-2 pe-9 text-xs"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                البريد الإلكتروني المعتمد <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="input-field py-2 pe-9 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رقم الهاتف / الجوال
              </label>
              <div className="relative">
                <Phone className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+20 100 000 0000"
                  className="input-field py-2 pe-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                العنوان والموقع الجغرافي للمنشأة
              </label>
              <div className="relative">
                <MapPin className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المدينة، المنطقة الصناعية، المبنى"
                  className="input-field py-2 pe-9 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 flex items-center gap-3 text-xs text-slate-600">
            <ShieldCheck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <span>
              تحديث البيانات هنا يُحدث حساب العميل المباشر في النظام، ويظهر في كافة التقارير والفواتير الصادرة للمنشأة.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary-700 transition disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري حفظ التعديلات...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  حفظ بيانات المنشأة
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
