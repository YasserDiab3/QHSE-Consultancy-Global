'use client'

import NextImage from 'next/image'

import { useEffect, useRef, useState } from 'react'
import { Building2, Camera, CheckCircle2, Loader2, Lock, Mail, MapPin, Pencil, Phone, Save, ShieldCheck, UserRound, X } from 'lucide-react'
import toast from 'react-hot-toast'

type Profile = {
  client: { companyName: string; companyNameAr?: string; phone?: string; address?: string; user: { name: string; email: string } }
  settings: { logoDataUrl?: string; showProfile: boolean; profileLocked?: boolean }
}
type Form = { name: string; companyName: string; companyNameAr: string; phone: string; address: string }

export default function ClientProfilePanel({ language }: { language: string }) {
  const ar = language === 'ar'
  const t = (arabic: string, english: string) => ar ? arabic : english
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Form>({ name: '', companyName: '', companyNameAr: '', phone: '', address: '' })
  const input = useRef<HTMLInputElement>(null)

  const setFromProfile = (data: Profile) => setForm({ name: data.client.user.name || '', companyName: data.client.companyName || '', companyNameAr: data.client.companyNameAr || '', phone: data.client.phone || '', address: data.client.address || '' })
  useEffect(() => {
    let active = true
    fetch('/api/client-profile', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load profile')
        return data
      })
      .then((data: Profile) => {
        if (active) {
          setProfile(data)
          setVisible(data.settings.showProfile)
          setFromProfile(data)
        }
      })
      .catch(() => {
        if (active) setProfile(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const save = async (payload: Record<string, unknown>, success = t('تم حفظ الملف الشخصي', 'Profile saved')) => {
    setSaving(true)
    try {
      const response = await fetch('/api/client-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to update profile')
      setProfile((current) => current ? { client: data.client || current.client, settings: data.settings || current.settings } : current)
      setVisible(data.settings?.showProfile ?? visible)
      toast.success(success)
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('تعذر حفظ الملف الشخصي', 'Unable to save profile'))
      return false
    } finally {
      setSaving(false)
    }
  }

  const chooseLogo = (file?: File) => {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      toast.error(t('اختر شعار PNG أو JPG أو WebP بحجم أقل من 1 ميجابايت.', 'Choose a PNG, JPG, or WebP logo smaller than 1 MB.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => void save({ logoDataUrl: typeof reader.result === 'string' ? reader.result : null })
    reader.onerror = () => toast.error(t('تعذر قراءة الشعار', 'Unable to read logo'))
    reader.readAsDataURL(file)
  }

  const updateForm = (key: keyof Form, value: string) => setForm((current) => ({ ...current, [key]: value }))

  const submitProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    if (await save({ profile: form }, t('تم حفظ بيانات الملف واعتماده بنجاح. تم قفل التعديل.', 'Profile details saved and approved successfully. Editing is now locked.'))) {
      setEditing(false)
    }
  }

  if (loading) return <div className="card flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
  if (!profile) return null
  const company = ar ? profile.client.companyNameAr || profile.client.companyName : profile.client.companyName
  const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
  const isLocked = Boolean(profile.settings.profileLocked)

  return (
    <section className="overflow-hidden rounded-3xl border border-primary-100 bg-white shadow-sm" dir={ar ? 'rtl' : 'ltr'}>
      <div className="relative overflow-hidden bg-gradient-to-l from-primary-900 via-primary-700 to-slate-900 px-5 py-7 text-white sm:px-7">
        <div className="absolute -start-20 -top-24 h-56 w-56 rounded-full bg-lime-300/10 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {profile.settings.logoDataUrl ? (
              <NextImage src={profile.settings.logoDataUrl} alt={company} width={80} height={80} unoptimized className="h-20 w-20 rounded-2xl bg-white object-contain p-2 shadow-lg" />
            ) : (
              <div className="rounded-2xl bg-white/15 p-5"><Building2 className="h-10 w-10" /></div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-[0.16em] text-lime-200">CLIENT PROFILE</p>
              <h2 className="mt-1 truncate text-2xl font-bold">{company}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-primary-100">
                <UserRound className="h-4 w-4" />{profile.client.user.name}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isLocked ? (
              <div
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/40 bg-amber-500/20 px-3.5 py-2 text-sm font-semibold text-amber-200 shadow-sm"
                title={t('تم قفل تعديل الملف بعد حفظ البيانات. لأي تعديل يرجى مراجعة مدير النظام.', 'Profile editing is locked after saving. Contact system administrator for edits.')}
              >
                <Lock className="h-4 w-4 text-amber-300" />
                <span>{t('الملف مقفل (مراجعة الإدارة)', 'Profile locked (Admin only)')}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setEditing((value) => !value); setFromProfile(profile) }}
                className="rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 transition"
              >
                <Pencil className="me-1 inline h-4 w-4" />
                {editing ? t('إغلاق التعديل', 'Close editor') : t('تعديل الملف', 'Edit profile')}
              </button>
            )}

            <button
              type="button"
              onClick={() => void save({ showProfile: !visible })}
              disabled={saving}
              className="rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20 transition"
            >
              {visible ? t('إخفاء التفاصيل', 'Hide details') : t('عرض الملف', 'Show profile')}
            </button>
          </div>
        </div>
      </div>

      {!isLocked && editing && (
        <form onSubmit={submitProfile} className="border-b border-primary-100 bg-primary-50/70 p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">{t('تحديث ملف العميل', 'Update client profile')}</h3>
              <p className="mt-1 text-sm text-slate-500">{t('حدّث بيانات المستخدم ومؤسستك من مكان واحد. بعد الحفظ الأول سيتم قفل التعديل تلقائياً.', 'Update your user and organization details. Editing will lock automatically after the initial save.')}</p>
            </div>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg p-2 text-slate-500 hover:bg-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              {t('اسم المستخدم', 'User name')}
              <input required value={form.name} onChange={(event) => updateForm('name', event.target.value)} className={`${fieldClass} mt-1.5`} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              {t('اسم المؤسسة بالإنجليزية', 'Organization name')}
              <input required value={form.companyName} onChange={(event) => updateForm('companyName', event.target.value)} className={`${fieldClass} mt-1.5`} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              {t('اسم المؤسسة بالعربية', 'Arabic organization name')}
              <input value={form.companyNameAr} onChange={(event) => updateForm('companyNameAr', event.target.value)} className={`${fieldClass} mt-1.5`} />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              {t('رقم الهاتف', 'Phone number')}
              <input value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} className={`${fieldClass} mt-1.5`} />
            </label>
            <label className="text-sm font-semibold text-slate-700 md:col-span-2">
              {t('العنوان', 'Address')}
              <input value={form.address} onChange={(event) => updateForm('address', event.target.value)} className={`${fieldClass} mt-1.5`} />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary-200 bg-white px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50">
              <Camera className="h-4 w-4" />{t('رفع أو تغيير الشعار', 'Upload or change logo')}
              <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => chooseLogo(event.target.files?.[0])} />
            </label>
            <button disabled={saving} className="btn-primary px-5 py-2.5">
              <Save className="h-4 w-4" />{saving ? t('جارٍ الحفظ...', 'Saving...') : t('حفظ التعديلات وقفل الملف', 'Save changes & lock profile')}
            </button>
          </div>
        </form>
      )}

      {visible && (
        <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info icon={<UserRound />} label={t('مسؤول الحساب', 'Account owner')} value={profile.client.user.name} />
            <Info icon={<Mail />} label={t('البريد الإلكتروني', 'Email address')} value={profile.client.user.email} />
            <Info icon={<Phone />} label={t('رقم الهاتف', 'Phone')} value={profile.client.phone || t('غير مضاف', 'Not added')} />
            <Info icon={<MapPin />} label={t('الموقع والعنوان', 'Location & address')} value={profile.client.address || t('غير مضاف', 'Not added')} />
          </div>

          <aside className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <ShieldCheck className="h-5 w-5" />{t('ملف مؤسستك', 'Your organization profile')}
            </div>
            <p className="mt-3 text-sm leading-6 text-emerald-800">
              {isLocked
                ? t('تم اعتماد بيانات مؤسستك وحفظها رسمياً. لأي تعديل على اسم المؤسسة أو بيانات الاتصال، يرجى التنسيق مع مدير النظام.', 'Your organization details have been approved and saved. For any modifications to company details, please coordinate with the system administrator.')
                : t('بياناتك وشعار مؤسستك تظهر فقط داخل حسابك ولوحة الإدارة المصرّح بها.', 'Your details and organization logo appear only within your account and authorized administration views.')}
            </p>
            <div className={`mt-4 flex items-center gap-2 text-sm font-semibold ${isLocked ? 'text-amber-800' : 'text-emerald-800'}`}>
              {isLocked ? (
                <>
                  <Lock className="h-4 w-4 text-amber-600" />
                  <span>{t('الملف معتمد ومقفل (التعديل متاح لمدير النظام فقط)', 'Profile approved & locked (Modifications via Admin only)')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{t('بانتظار التسجيل الأول والحفظ', 'Awaiting initial registration & save')}</span>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span className="text-primary-600">{icon}</span>{label}
      </div>
      <p className="mt-2 truncate font-semibold text-slate-900">{value}</p>
    </div>
  )
}
