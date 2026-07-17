'use client'

import { useEffect, useRef, useState } from 'react'
import { Building2, Camera, Loader2, Mail, MapPin, Phone, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'

type Profile = {
  client: { companyName: string; companyNameAr?: string; phone?: string; address?: string; user: { name: string; email: string } }
  settings: { logoDataUrl?: string; showProfile: boolean }
}

export default function ClientProfilePanel({ language }: { language: string }) {
  const ar = language === 'ar'
  const t = (arabic: string, english: string) => ar ? arabic : english
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [visible, setVisible] = useState(true)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    fetch('/api/client-profile', { cache: 'no-store' })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to load profile'); return data })
      .then((data) => { if (active) { setProfile(data); setVisible(data.settings.showProfile) } })
      .catch(() => { if (active) setProfile(null) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const save = async (payload: { logoDataUrl?: string | null; showProfile?: boolean }) => {
    setSaving(true)
    try {
      const response = await fetch('/api/client-profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to update profile')
      setProfile((current) => current ? { ...current, settings: data.settings } : current)
      setVisible(data.settings.showProfile)
      toast.success(t('تم حفظ الملف الشخصي', 'Profile saved'))
    } catch (error) { toast.error(error instanceof Error ? error.message : t('تعذر حفظ الملف الشخصي', 'Unable to save profile')) }
    finally { setSaving(false) }
  }

  const chooseLogo = (file?: File) => {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) { toast.error(t('اختر شعار PNG أو JPG أو WebP بحجم أقل من 1 ميجابايت.', 'Choose a PNG, JPG, or WebP logo smaller than 1 MB.')); return }
    const reader = new FileReader()
    reader.onload = () => void save({ logoDataUrl: typeof reader.result === 'string' ? reader.result : null })
    reader.onerror = () => toast.error(t('تعذر قراءة الشعار', 'Unable to read logo'))
    reader.readAsDataURL(file)
  }

  if (loading) return <div className="card flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary-500" /></div>
  if (!profile) return null
  const company = ar ? profile.client.companyNameAr || profile.client.companyName : profile.client.companyName

  return <section className="overflow-hidden rounded-3xl border border-primary-100 bg-white shadow-sm" dir={ar ? 'rtl' : 'ltr'}>
    <div className="bg-gradient-to-l from-primary-800 via-primary-700 to-slate-900 px-5 py-6 text-white sm:px-7"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-center gap-4">{profile.settings.logoDataUrl ? <img src={profile.settings.logoDataUrl} alt={company} className="h-16 w-16 rounded-2xl bg-white object-contain p-1.5 shadow" /> : <div className="rounded-2xl bg-white/15 p-4"><Building2 className="h-8 w-8" /></div>}<div className="min-w-0"><p className="text-xs font-bold tracking-[0.16em] text-primary-100">CLIENT PORTAL</p><h2 className="mt-1 truncate text-2xl font-bold">{company}</h2><p className="mt-1 flex items-center gap-2 text-sm text-primary-100"><UserRound className="h-4 w-4" />{profile.client.user.name}</p></div></div><button onClick={() => void save({ showProfile: !visible })} disabled={saving} className="rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20">{visible ? t('إخفاء التفاصيل', 'Hide details') : t('عرض الملف الشخصي', 'Show profile')}</button></div></div>
    {visible && <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr] sm:p-7"><div><button onClick={() => input.current?.click()} disabled={saving} className="group relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-primary-300 bg-primary-50 text-primary-700 hover:bg-primary-100">{profile.settings.logoDataUrl ? <img src={profile.settings.logoDataUrl} alt={company} className="h-full w-full object-contain p-2" /> : <Camera className="h-7 w-7" />}<span className="absolute inset-x-0 bottom-0 bg-slate-900/70 py-1 text-[10px] font-bold text-white">{t('تغيير الشعار', 'Change logo')}</span></button><input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => chooseLogo(event.target.files?.[0])} /></div><div className="grid gap-3 text-sm sm:grid-cols-2"><p className="flex items-center gap-2 text-slate-600"><UserRound className="h-4 w-4 text-primary-600" /><span>{profile.client.user.name}</span></p><p className="flex items-center gap-2 text-slate-600"><Mail className="h-4 w-4 text-primary-600" /><span className="truncate">{profile.client.user.email}</span></p>{profile.client.phone && <p className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4 text-primary-600" />{profile.client.phone}</p>}{profile.client.address && <p className="flex items-center gap-2 text-slate-600"><MapPin className="h-4 w-4 text-primary-600" />{profile.client.address}</p>}<p className="sm:col-span-2 text-xs text-slate-500">{t('يمكنك إضافة شعار مؤسستك أو إخفاء التفاصيل من هذا الحساب.', 'You can add your organization logo or hide details from this account.')}</p></div></div>}
  </section>
}
