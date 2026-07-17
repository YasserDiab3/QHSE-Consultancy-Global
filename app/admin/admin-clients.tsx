'use client'

import { useLanguage } from '@/context'
import { useState, useCallback, useEffect } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Lock,
  ArrowRight,
  Eye,
  FileText,
  Printer,
} from 'lucide-react'
import toast from 'react-hot-toast'
import BrandLogo from '@/components/BrandLogo'

type Client = {
  id: string
  companyName: string
  companyNameAr?: string
  phone?: string
  address?: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  _count?: {
    reports: number
  }
}

export default function AdminClients({
  onDataChanged,
}: {
  onDataChanged?: () => void | Promise<void>
}) {
  const { t, language, dir } = useLanguage()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [profileClient, setProfileClient] = useState<Client | null>(null)
  const createInitialFormData = () => ({
    name: '',
    email: '',
    password: '',
    companyName: '',
    companyNameAr: '',
    phone: '',
    address: '',
  })
  const [formData, setFormData] = useState(createInitialFormData)

  const copy =
    language === 'ar'
      ? {
          createDescription: 'أنشئ حساب البوابة وبيانات الشركة ووسائل التواصل للعميل من مكان واحد.',
          editDescription: 'حدّث بيانات حساب العميل وملف الشركة من شاشة واحدة.',
          portalAccount: 'حساب البوابة',
          portalAccountHint: 'بيانات الدخول وبيانات التواصل الرئيسية للعميل.',
          companyProfile: 'ملف الشركة',
          companyProfileHint: 'هوية الشركة ومعلومات التواصل الأساسية.',
          keepPassword: 'اترك الحقل فارغا للاحتفاظ بكلمة المرور الحالية',
          tempPassword: 'أنشئ كلمة مرور مؤقتة للعميل',
          createdHint: 'سيتم إنشاء العميل في قاعدة البيانات ويمكنه تسجيل الدخول مباشرة.',
          updatedHint: 'سيتم حفظ التعديلات مباشرة في بوابة العميل.',
        }
      : {
          createDescription: 'Create the portal account, company profile, and contact details for the client in one place.',
          editDescription: 'Update the client account and company profile from a single screen.',
          portalAccount: 'Portal Account',
          portalAccountHint: 'Login credentials and the main client contact details.',
          companyProfile: 'Company Profile',
          companyProfileHint: 'Company identity and primary contact information.',
          keepPassword: 'Leave empty to keep the current password',
          tempPassword: 'Create a temporary password for the client',
          createdHint: 'The client will be created in the database and can sign in immediately.',
          updatedHint: 'Changes are saved immediately to the client portal.',
        }

  const resetForm = () => {
    setEditingClient(null)
    setFormData(createInitialFormData())
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clients')
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || t('common.error'))
      }

      setClients(await res.json())
    } catch (error) {
      console.error('Failed to fetch:', error)
      toast.error(error instanceof Error ? error.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients'
    const method = editingClient ? 'PUT' : 'POST'

    try {
      setSubmitting(true)
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success(editingClient ? t('admin.clientUpdated') : t('admin.clientCreated'))
        setShowForm(false)
        resetForm()
        await fetchData()
        await onDataChanged?.()
      } else {
        const data = await res.json()
        toast.error(data.error || t('common.error'))
      }
    } catch (error) {
      toast.error(t('common.error'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.confirmDelete'))) return
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(t('admin.deleted'))
        await fetchData()
        await onDataChanged?.()
      } else {
        const data = await res.json().catch(() => null)
        toast.error(data?.error || t('common.error'))
      }
    } catch (error) {
      toast.error(t('common.error'))
    }
  }

  const startEdit = (client: Client) => {
    setEditingClient(client)
    setFormData({
      name: client.user.name,
      email: client.user.email,
      password: '',
      companyName: client.companyName,
      companyNameAr: client.companyNameAr || '',
      phone: client.phone || '',
      address: client.address || '',
    })
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('admin.manageClients')}</h2>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          {t('admin.addClient')}
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="p-6 md:p-8 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editingClient ? t('admin.editClient') : t('admin.createClient')}
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                  {editingClient
                    ? copy.editDescription
                    : copy.createDescription}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
              <div className="rounded-2xl bg-primary-50 border border-primary-100 p-4 md:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{copy.portalAccount}</h4>
                    <p className="text-sm text-gray-500">{copy.portalAccountHint}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">{t('admin.clientName')} *</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                        required
                        className="input-field ps-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-field">{t('admin.clientEmail')} *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                        required
                        className="input-field ps-10"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="label-field">{t('auth.password')} {!editingClient && '*'}</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                        required={!editingClient}
                        placeholder={editingClient ? copy.keepPassword : copy.tempPassword}
                        className="input-field ps-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 md:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-primary-500 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{copy.companyProfile}</h4>
                    <p className="text-sm text-gray-500">{copy.companyProfileHint}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">{t('admin.clientCompany')} *</label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => setFormData((f) => ({ ...f, companyName: e.target.value }))}
                        required
                        className="input-field ps-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-field">{t('admin.clientCompany')} (AR)</label>
                    <input
                      type="text"
                      value={formData.companyNameAr}
                      onChange={(e) => setFormData((f) => ({ ...f, companyNameAr: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">{t('admin.clientPhone')}</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                        className="input-field ps-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-field">{t('admin.clientAddress')}</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))}
                        className="input-field ps-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <p className="text-sm text-gray-500">
                  {editingClient
                    ? copy.updatedHint
                    : copy.createdHint}
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary min-w-[128px] justify-center"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('contact.sending')}
                      </>
                    ) : (
                      <>
                        {t('common.save')}
                        <ArrowRight className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                    className="btn-secondary"
                    disabled={submitting}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clients Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <div key={client.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{client.companyName}</h3>
                    <p className="text-sm text-gray-500">{client.user.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setProfileClient(client)} className="p-1.5 rounded text-primary-600 hover:bg-primary-50" title="Client profile"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => startEdit(client)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(client.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{client.user.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  {client._count?.reports || 0} {t('admin.reports')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {clients.length === 0 && !loading && (
        <div className="card text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('common.noData')}</h3>
          <p className="text-gray-600">{t('admin.createClient')}</p>
        </div>
      )}
      {profileClient && <ClientProfile client={profileClient} onClose={() => setProfileClient(null)} />}
    </div>
  )
}

function ClientProfile({ client, onClose }: { client: Client; onClose: () => void }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState('')
  const [financial, setFinancial] = useState({ title: '', amount: '', status: 'PENDING' })
  const load = useCallback(async () => { setLoading(true); setProfileError(''); try { const response = await fetch(`/api/clients/${client.id}/profile`); const payload = await response.json(); if (!response.ok) throw new Error(payload?.error || 'تعذر تحميل ملف العميل'); setData(payload) } catch (error) { setProfileError(error instanceof Error ? error.message : 'تعذر تحميل ملف العميل'); setData(null) } finally { setLoading(false) } }, [client.id])
  useEffect(() => { void load() }, [load])
  const addFinancial = async () => {
    if (!financial.title || !financial.amount) return toast.error('أدخل وصف البند وقيمته')
    const response = await fetch(`/api/clients/${client.id}/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'financial', title: financial.title, amount: Number(financial.amount), status: financial.status }) })
    if (!response.ok) return toast.error('تعذر حفظ البند المالي')
    setFinancial({ title: '', amount: '', status: 'PENDING' })
    await load()
  }
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 print:static print:overflow-visible print:bg-white print:p-0"><div id="client-profile-print" className="mx-auto my-6 max-w-6xl rounded-3xl bg-white shadow-2xl print:my-0 print:max-w-none print:rounded-none print:shadow-none">
    <div className="flex items-center justify-between border-b p-6 print:hidden"><div><h2 className="text-2xl font-bold">ملف العميل — {client.companyName}</h2><p className="mt-1 text-sm text-slate-500">ملف موحد للتقارير والزيارات والملاحظات والبيانات المالية.</p></div><div className="flex gap-2"><button onClick={() => setTimeout(() => window.print(), 50)} className="btn-secondary px-4 py-2"><Printer className="h-4 w-4" />طباعة الملف</button><button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X /></button></div></div>
    {loading ? <div className="p-16 text-center"><Loader2 className="mx-auto animate-spin text-primary-500" /></div> : profileError ? <div className="m-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700"><p className="font-bold">تعذر تحميل البيانات</p><p className="mt-2 text-sm">{profileError}</p><button onClick={() => void load()} className="btn-secondary mt-4 px-4 py-2">إعادة المحاولة</button></div> : <div className="space-y-6 p-6">{data?.client && <>
      <div className="hidden items-center justify-between border-b-4 border-primary-700 pb-4 print:flex"><BrandLogo variant="header" className="h-20 w-20" /><div className="text-right"><h1 className="text-2xl font-bold text-primary-900">ملف العميل</h1><p className="mt-1 text-sm text-slate-600">{data.client.companyNameAr || data.client.companyName}</p><p className="text-xs text-slate-500">مرجع الملف: {client.id}</p></div></div>
      <div className="grid gap-4 md:grid-cols-4"><ProfileMetric label="الزيارات والتقارير" value={data.summary.reports} /><ProfileMetric label="الملاحظات" value={data.summary.observations} /><ProfileMetric label="الملفات" value={data.client.documents.length} /><ProfileMetric label="إجمالي مالي" value={`${data.summary.financialTotal} EGP`} /></div>
      <section className="rounded-2xl border border-slate-200 p-5"><h3 className="mb-3 flex items-center gap-2 font-bold"><Building2 className="h-5 w-5 text-primary-600" />بيانات الشركة والاتصال</h3><div className="grid gap-3 text-sm md:grid-cols-2"><p><b>الشركة:</b> {data.client.companyNameAr || data.client.companyName}</p><p><b>مسؤول التواصل:</b> {data.client.user.name}</p><p><b>البريد:</b> {data.client.user.email}</p><p><b>الهاتف:</b> {data.client.phone || data.client.user.phone || '-'}</p><p className="md:col-span-2"><b>العنوان:</b> {data.client.address || '-'}</p></div></section>
      <section className="rounded-2xl border border-slate-200 p-5"><h3 className="mb-3 font-bold">سجل الزيارات والتقارير</h3><div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead className="bg-slate-50"><tr><th className="p-3">الموقع</th><th>التاريخ</th><th>التصنيف</th><th>الحالة</th><th>الملاحظات</th></tr></thead><tbody>{data.client.reports.map((r: any) => <tr key={r.id} className="border-t"><td className="p-3">{r.siteNameAr || r.siteName}</td><td>{new Date(r.date).toLocaleDateString('ar-EG')}</td><td>{r.category}</td><td>{r.status}</td><td>{r.observations.length}</td></tr>)}</tbody></table></div></section>
      <section className="rounded-2xl border border-slate-200 p-5"><h3 className="mb-3 font-bold">السجل المالي والفواتير</h3><div className="mb-4 grid gap-2 print:hidden md:grid-cols-4"><input className="input-field" placeholder="فاتورة / بند مالي" value={financial.title} onChange={(e) => setFinancial({ ...financial, title: e.target.value })} /><input className="input-field" type="number" placeholder="القيمة" value={financial.amount} onChange={(e) => setFinancial({ ...financial, amount: e.target.value })} /><select className="input-field" value={financial.status} onChange={(e) => setFinancial({ ...financial, status: e.target.value })}><option value="PENDING">مستحقة</option><option value="PAID">مدفوعة</option></select><button onClick={() => void addFinancial()} className="btn-primary px-4 py-2">إضافة</button></div><div className="grid gap-3 md:grid-cols-3">{data.client.financialRecords.length ? data.client.financialRecords.map((item: any) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><b>{item.title}</b><p className="mt-1">{Number(item.amount)} {item.currency}</p><span className="text-xs text-slate-500">{item.status}</span></div>) : <p className="text-sm text-slate-500">لا توجد بنود مالية مسجلة.</p>}</div></section>
      <div className="hidden border-t-2 border-primary-700 pt-3 text-center text-xs text-slate-500 print:block">QHSSE Consultant • ملف عميل مهني • تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
    </>}</div>}
  </div></div>
}

function ProfileMetric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4"><p className="text-sm text-primary-700">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p></div> }
