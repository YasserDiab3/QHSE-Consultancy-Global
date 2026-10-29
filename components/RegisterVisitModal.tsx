'use client'

import { useState } from 'react'
import {
  X,
  Calendar,
  MapPin,
  Building2,
  Loader2,
  CheckCircle2,
  ClipboardList,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface RegisterVisitModalProps {
  client: {
    id: string
    companyName: string
    companyNameAr?: string
    address?: string
    phone?: string
    user?: {
      name: string
      email: string
    }
  }
  existingVisit?: any
  onClose: () => void
  onSuccess: () => void | Promise<void>
}

const VISIT_CATEGORIES = [
  { value: 'SAFETY', label: 'تفتيش سلامة وصحة مهنية (Occupational Safety)', desc: 'فحص بيئة العمل، المخاطر الميكانيكية والكهربائية ومهمات الوقاية' },
  { value: 'FOOD_SAFETY', label: 'سلامة الغذاء وتوافق هيئة سلامة الغذاء (NFSA Food Safety)', desc: 'برامج الاشتراطات الأساسية PRPs، نظام الهاسب HACCP، والتتبع' },
  { value: 'QHSE', label: 'جودة وبيئة وسلامة متكاملة (Integrated QHSE)', desc: 'مراجعة معايير ISO المتكاملة (9001, 14001, 45001)' },
  { value: 'RISK_ASSESSMENT', label: 'تقييم مخاطر ميداني (Risk Assessment)', desc: 'حصر المخاطر وتقييم مصفوفة احتمالية وشدة الأثر' },
  { value: 'AUDIT', label: 'تدقيق ومراجعة امتثال (Audit & Compliance)', desc: 'فحص وثائق وممارسات الامتثال للوائح والمعايير المعتمدة' },
  { value: 'TRAINING', label: 'تدريب وتوعية ميدانية (Field Training & Toolbox)', desc: 'جلسات تدريبية وتوعية العاملين بالمنشأة' },
]

const VISIT_STATUSES = [
  { value: 'OPEN', label: 'مفتوحة / جارية', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'SCHEDULED', label: 'مجدولة مسبقاً', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'IN_PROGRESS', label: 'قيد المتابعة والتدقيق', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'CLOSED', label: 'مكتملة ومغلقة', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
]

const SAFETY_TEMPLATES = [
  'فحص الممرات ومسارات الإخلاء والنظافة العامة للموقع (Housekeeping)',
  'التحقق من التزام العاملين بارتداء مهمات الوقاية الشخصية (PPE Compliance)',
  'فحص جاهزية طفايات الحريق وصناديق الإسعافات الأولية ومخارج الطوارئ',
  'التحقق من سلامة اللوحات التحذيرية والإرشادية للمخاطر الميدانية',
  'فحص التوصيلات الكهربائية ولوحات التوزيع والتأريض الوقائي',
]

const FOOD_SAFETY_TEMPLATES = [
  'التحقق من تطبيق برامج المتطلبات الأساسية للنظافة والتطهير (PRPs)',
  'مراجعة نقاط التحكم الحرجة وسجلات الرصد لنظام الهاسب (HACCP Monitoring)',
  'فحص سجلات درجات حرارة الاستلام والتخزين وثلاجات الحفظ',
  'التحقق من إجراءات مكافحة الآفات وفحص مصائد الحشرات والتقارير الدورية',
  'مراجعة سجلات تتبع المنتجات الغذائية وإجراءات السحب والاسترجاع',
]

export default function RegisterVisitModal({
  client,
  existingVisit,
  onClose,
  onSuccess,
}: RegisterVisitModalProps) {
  const isEditing = Boolean(existingVisit)
  const todayStr = new Date().toISOString().slice(0, 10)

  const [siteName, setSiteName] = useState(
    existingVisit?.siteName || client.companyName || client.companyNameAr || 'المقر الرئيسي للمنشأة'
  )
  const [siteNameAr, setSiteNameAr] = useState(
    existingVisit?.siteNameAr || client.companyNameAr || client.companyName || ''
  )
  const [date, setDate] = useState(
    existingVisit?.date ? existingVisit.date.slice(0, 10) : todayStr
  )
  const [category, setCategory] = useState(existingVisit?.category || 'SAFETY')
  const [status, setStatus] = useState(existingVisit?.status || 'OPEN')
  const [notes, setNotes] = useState(existingVisit?.notes || '')
  const [initialPoints, setInitialPoints] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleApplyTemplate = (type: 'safety' | 'food') => {
    const list = type === 'safety' ? SAFETY_TEMPLATES : FOOD_SAFETY_TEMPLATES
    if (initialPoints.trim()) {
      setInitialPoints((prev) => `${prev.trim()}\n${list.join('\n')}`)
    } else {
      setInitialPoints(list.join('\n'))
    }
    toast.success(type === 'safety' ? 'تم إدراج بنود تفتيش السلامة' : 'تم إدراج بنود سلامة الغذاء')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!siteName.trim()) {
      toast.error('يرجى تحديد موقع المنشأة أو اسم الموقع')
      return
    }

    if (!date) {
      toast.error('يرجى تحديد تاريخ الزيارة')
      return
    }

    setSubmitting(true)
    try {
      const url = isEditing ? `/api/reports/${existingVisit.id}` : '/api/reports'
      const method = isEditing ? 'PUT' : 'POST'

      const payload = {
        clientId: client.id,
        date: new Date(date).toISOString(),
        siteName: siteName.trim(),
        siteNameAr: siteNameAr.trim() || siteName.trim(),
        category,
        status,
        notes: notes.trim() || undefined,
        notesAr: notes.trim() || undefined,
        assessmentScores: existingVisit?.assessmentScores || {
          site: 80,
          employees: 80,
          documents: 80,
          equipment: 80,
          infrastructure: 80,
          storage: 80,
        },
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'تعذر حفظ بيانات الزيارة')
      }

      // If initial checklist observations were entered and this is a new visit, create them
      if (!isEditing && initialPoints.trim()) {
        const lines = initialPoints
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)

        if (lines.length > 0) {
          await Promise.all(
            lines.map((title) =>
              fetch('/api/observations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  reportId: data.id,
                  title,
                  riskLevel: 'MEDIUM',
                  status: 'OPEN',
                }),
              }).catch(() => null)
            )
          )
        }
      }

      toast.success(
        isEditing
          ? 'تم تحديث بيانات الزيارة الميدانية بنجاح'
          : 'تم تسجيل الزيارة الميدانية وتوثيقها بنجاح'
      )
      await onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء حفظ الزيارة')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-l from-primary-900 via-primary-800 to-primary-950 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-emerald-400 shadow-inner">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditing ? 'تعديل بيانات الزيارة الميدانية' : 'تسجيل زيارة ميدانية جديدة'}
              </h2>
              <p className="text-xs text-primary-200/90 mt-0.5 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary-300" />
                المنشأة: {client.companyNameAr || client.companyName}
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/50">
          {/* Facility quick banner */}
          <div className="rounded-2xl border border-primary-100 bg-primary-50/60 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-primary-900 font-semibold">
              <MapPin className="h-4 w-4 text-primary-600 flex-shrink-0" />
              <span>موقع المنشأة المسجل: {client.address || 'العنوان غير مسجل'}</span>
            </div>
            {client.phone && (
              <span className="text-primary-700 font-mono">هاتف: {client.phone}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Site Name (Arabic/General) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                موقع الزيارة / الفرع المستهدف <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={siteName}
                  onChange={(e) => {
                    setSiteName(e.target.value)
                    if (!siteNameAr || siteNameAr === siteName) {
                      setSiteNameAr(e.target.value)
                    }
                  }}
                  placeholder="مثال: المصنع الرئيسي - خط الإنتاج، المستودع، المقر الإداري"
                  className="input-field py-2 pe-9 text-xs"
                />
              </div>
            </div>

            {/* Visit Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                تاريخ وموعد الزيارة <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input-field py-2 pe-9 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Visit Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                تصنيف ونوع الزيارة <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field py-2 text-xs"
              >
                {VISIT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Visit Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                حالة الزيارة الحالية <span className="text-red-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input-field py-2 text-xs font-bold"
              >
                {VISIT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes & Scope of Visit */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              نطاق الزيارة وأهداف الفحص والملاحظات المبدئية
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب أهداف الزيارة، النطاق المستهدف بالمعاينة، وأي توصيات تمهيدية..."
              className="input-field text-xs py-2"
            />
          </div>

          {/* Initial Observations / Checklist (For new visits) */}
          {!isEditing && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-primary-600" />
                  قائمة بنود الفحص والملاحظات الأولية (اختياري - سطر لكل بند)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('safety')}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary-200 bg-primary-50 px-2 py-1 text-[11px] font-bold text-primary-700 hover:bg-primary-100 transition"
                  >
                    <Sparkles className="h-3 w-3" />
                    قالب السلامة
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyTemplate('food')}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition"
                  >
                    <Sparkles className="h-3 w-3" />
                    قالب سلامة الغذاء
                  </button>
                </div>
              </div>

              <textarea
                rows={4}
                value={initialPoints}
                onChange={(e) => setInitialPoints(e.target.value)}
                placeholder="أدخل بنود الفحص الميداني أو اختر قالباً جاهزاً من الأزرار أعلاه..."
                className="input-field text-xs py-2 font-sans"
              />
              <p className="text-[11px] text-slate-500">
                سيتم تحويل كل سطر تلقائياً إلى بند فحص مسجل داخل تقرير الزيارة لتوثيق الصور والمطابقة لاحقاً.
              </p>
            </div>
          )}

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
                  جاري حفظ وتوثيق الزيارة...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {isEditing ? 'حفظ تعديلات الزيارة' : 'تسجيل الزيارة الميدانية الآن'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
