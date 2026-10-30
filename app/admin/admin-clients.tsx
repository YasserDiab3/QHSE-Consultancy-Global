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
  Unlock,
  ArrowRight,
  Eye,
  EyeOff,
  Key,
  UserCheck,
  UserX,
  Receipt,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  PowerOff,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { parsePortalSettings, isProfileLocked, isFinancesVisible } from '@/lib/client-profile'
import ClientProfileModal from '@/components/ClientProfileModal'

type Client = {
  id: string
  companyName: string
  companyNameAr?: string
  phone?: string
  address?: string
  contactInfo?: string
  userId?: string | null
  user?: {
    id: string
    name: string
    email: string
    role: string
  } | null
  _count?: {
    reports: number
  }
}

function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `Safe-${code}`
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

  // Activation modal state
  const [activatingClient, setActivatingClient] = useState<Client | null>(null)
  const [activationForm, setActivationForm] = useState({
    email: '',
    name: '',
    password: '',
    sendEmail: true,
  })
  const [activatingSubmitting, setActivatingSubmitting] = useState(false)
  const [copiedPass, setCopiedPass] = useState(false)

  const createInitialFormData = () => ({
    name: '',
    email: '',
    password: '',
    companyName: '',
    companyNameAr: '',
    phone: '',
    address: '',
    profileLocked: false,
    showFinances: false,
    createAccount: false,
  })
  const [formData, setFormData] = useState(createInitialFormData)

  const copy =
    language === 'ar'
      ? {
          createDescription: 'أضف منشأة جديدة وبيانات التواصل. لا يتطلب إضافة العميل إنشاء كلمة مرور، ويمكن تفعيل حسابه لاحقاً.',
          editDescription: 'حدّث بيانات حساب العميل وملف المنشأة وصلاحيات العرض من شاشة واحدة.',
          portalAccount: 'حساب بوابة العميل (اختياري)',
          portalAccountHint: 'بيانات تسجيل الدخول وتواصل العميل.',
          companyProfile: 'ملف وهوية المنشأة',
          companyProfileHint: 'اسم المنشأة ومعلومات التواصل الأساسية.',
          keepPassword: 'اترك الحقل فارغاً للاحتفاظ بكلمة المرور الحالية',
          tempPassword: 'أنشئ كلمة مرور مؤقتة للعميل (6 أحرف على الأقل)',
          createdHint: 'سيتم حفظ المنشأة في النظام، ويمكن إسناد التقارير والزيارات لها وتفعيل حسابها في أي وقت.',
          updatedHint: 'سيتم حفظ التعديلات وتحديث إعدادات العرض مباشرة.',
          profileLockedTitle: 'قفل تعديل الملف على العميل',
          profileLockedDesc: 'عند التفعيل، لا يستطيع العميل تعديل بياناته بنفسه من لوحته، ويكون التعديل متاحاً فقط لمدير النظام.',
          showFinancesTitle: 'إظهار الفواتير والمستحقات للعميل',
          showFinancesDesc: 'عند التفعيل، يستطيع العميل مشاهدة فواتيره وسجل الدفعات من بوابته. عند التعطيل، تكون محجوبة بالكامل.',
          createAccountTitle: 'إنشاء وتفعيل حساب دخول للبوابة الآن',
          createAccountDesc: 'إذا كنت ترغب بمنح العميل إمكانية الدخول للبوابة فوراً بكلمة مرور محددة.',
          lockedBadge: 'مقفل',
          unlockedBadge: 'مفتوح',
          unlockAction: 'إلغاء قفل الملف للعميل',
          lockAction: 'قفل تعديل الملف للعميل',
          activeAccount: 'حساب بوابة نشط',
          noAccount: 'بدون حساب دخول',
          activateAction: 'تفعيل حساب الدخول',
          resetPassAction: 'إعادة تعيين كلمة المرور',
          financesVisibleBadge: 'الفواتير مرئية للعميل',
          financesHiddenBadge: 'الفواتير مخفية عن العميل',
          showFinancesAction: 'إظهار الفواتير في بوابة العميل',
          hideFinancesAction: 'إخفاء الفواتير عن بوابة العميل',
        }
      : {
          createDescription: 'Add a new client and contact details. Creating an account or password is not required and can be activated later.',
          editDescription: 'Update client details, company profile, and visibility permissions from a single screen.',
          portalAccount: 'Portal Login Account (Optional)',
          portalAccountHint: 'Login credentials and main client contact details.',
          companyProfile: 'Company Profile',
          companyProfileHint: 'Company identity and primary contact information.',
          keepPassword: 'Leave empty to keep current password',
          tempPassword: 'Create temporary password (at least 6 characters)',
          createdHint: 'The client will be registered in the system. Login access can be activated at any time.',
          updatedHint: 'Changes and visibility settings are saved immediately.',
          profileLockedTitle: 'Lock profile editing for client',
          profileLockedDesc: 'When enabled, client cannot edit profile details; edits remain restricted to admin.',
          showFinancesTitle: 'Show invoices & dues to client',
          showFinancesDesc: 'When enabled, client can view invoices and billing records in their portal. When disabled, finances remain completely private.',
          createAccountTitle: 'Create portal login account now',
          createAccountDesc: 'Enable this if you wish to set up portal login credentials right away.',
          lockedBadge: 'Locked',
          unlockedBadge: 'Open',
          unlockAction: 'Unlock client profile',
          lockAction: 'Lock client profile',
          activeAccount: 'Active Portal Access',
          noAccount: 'No Portal Account',
          activateAction: 'Activate Portal Access',
          resetPassAction: 'Reset Password',
          financesVisibleBadge: 'Invoices Visible',
          financesHiddenBadge: 'Invoices Hidden',
          showFinancesAction: 'Show invoices to client',
          hideFinancesAction: 'Hide invoices from client',
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
    } catch {
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
    } catch {
      toast.error(t('common.error'))
    }
  }

  const startEdit = (client: Client) => {
    setEditingClient(client)
    const settings = parsePortalSettings(client.contactInfo)
    setFormData({
      name: client.user?.name || settings.contactPerson || '',
      email: client.user?.email || settings.contactEmail || '',
      password: '',
      companyName: client.companyName,
      companyNameAr: client.companyNameAr || '',
      phone: client.phone || '',
      address: client.address || '',
      profileLocked: isProfileLocked(settings),
      showFinances: isFinancesVisible(settings),
      createAccount: false,
    })
    setShowForm(true)
  }

  const toggleLock = async (client: Client) => {
    const settings = parsePortalSettings(client.contactInfo)
    const currentLocked = isProfileLocked(settings)
    const targetLocked = !currentLocked
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileLocked: targetLocked }),
      })
      if (res.ok) {
        toast.success(
          targetLocked
            ? (language === 'ar' ? 'تم قفل تعديل الملف للعميل بنجاح' : 'Client profile locked successfully')
            : (language === 'ar' ? 'تم فتح تعديل الملف للعميل بنجاح' : 'Client profile unlocked successfully')
        )
        await fetchData()
        await onDataChanged?.()
      } else {
        const data = await res.json().catch(() => null)
        toast.error(data?.error || t('common.error'))
      }
    } catch {
      toast.error(t('common.error'))
    }
  }

  const toggleFinances = async (client: Client) => {
    const settings = parsePortalSettings(client.contactInfo)
    const currentVisible = isFinancesVisible(settings)
    const targetVisible = !currentVisible
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showFinances: targetVisible }),
      })
      if (res.ok) {
        toast.success(
          targetVisible
            ? (language === 'ar' ? 'تم تفعيل ظهور الفواتير في بوابة العميل' : 'Invoices are now visible to client')
            : (language === 'ar' ? 'تم إخفاء الفواتير عن بوابة العميل' : 'Invoices hidden from client')
        )
        await fetchData()
        await onDataChanged?.()
      } else {
        const data = await res.json().catch(() => null)
        toast.error(data?.error || t('common.error'))
      }
    } catch {
      toast.error(t('common.error'))
    }
  }

  const openActivationModal = (client: Client) => {
    const settings = parsePortalSettings(client.contactInfo)
    const defaultEmail = client.user?.email || settings.contactEmail || ''
    const defaultName = client.user?.name || settings.contactPerson || client.companyNameAr || client.companyName
    setActivatingClient(client)
    setActivationForm({
      email: defaultEmail,
      name: defaultName,
      password: generateRandomPassword(),
      sendEmail: true,
    })
    setCopiedPass(false)
  }

  const handleActivationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activatingClient) return

    try {
      setActivatingSubmitting(true)
      const res = await fetch(`/api/clients/${activatingClient.id}/activate-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activationForm),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(
          language === 'ar'
            ? 'تم تفعيل حساب الدخول لبوابة العميل بنجاح'
            : 'Client portal account activated successfully'
        )
        setActivatingClient(null)
        await fetchData()
        await onDataChanged?.()
      } else {
        toast.error(data?.error || t('common.error'))
      }
    } catch {
      toast.error(t('common.error'))
    } finally {
      setActivatingSubmitting(false)
    }
  }

  const handleDeactivateAccount = async (client: Client) => {
    if (
      !confirm(
        language === 'ar'
          ? `هل أنت متأكد من تعطيل حساب الدخول لـ ${client.companyName}؟ سيبقى العميل وبياناته والتقارير محفوظة دون حذف.`
          : `Are you sure you want to disable login access for ${client.companyName}? Client data and reports remain intact.`
      )
    )
      return

    try {
      const res = await fetch(`/api/clients/${client.id}/activate-account`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success(language === 'ar' ? 'تم تعطيل حساب الدخول للعميل' : 'Client portal access deactivated')
        await fetchData()
        await onDataChanged?.()
      } else {
        const d = await res.json().catch(() => null)
        toast.error(d?.error || t('common.error'))
      }
    } catch {
      toast.error(t('common.error'))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('admin.manageClients')}</h2>
          <p className="text-xs text-gray-500 mt-1">
            {language === 'ar'
              ? 'إدارة المنشآت المعتمدة، حسابات تسجيل الدخول، وصلاحيات رؤية الفواتير والمستحقات.'
              : 'Manage registered clients, login access, and financial visibility permissions.'}
          </p>
        </div>
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

      {/* Form Modal (Add / Edit Client) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="p-6 md:p-8 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editingClient ? t('admin.editClient') : t('admin.createClient')}
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                  {editingClient ? copy.editDescription : copy.createDescription}
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
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
              {/* Section 1: Company Profile */}
              <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 md:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-primary-600 flex items-center justify-center">
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

              {/* Section 2: Contact Person */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 md:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {language === 'ar' ? 'بيانات مسؤول التواصل والاتصال' : 'Contact Person Details'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {language === 'ar'
                        ? 'تُستخدم للتواصل والتنسيق ولتفعيل حساب الدخول مستقبلاً.'
                        : 'Used for communication and activating login access in the future.'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">
                      {language === 'ar' ? 'اسم الشخص المسؤول / جهة الاتصال' : 'Contact Person Name'}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                        className="input-field ps-10"
                        placeholder={language === 'ar' ? 'مثال: م. أحمد عبد الله' : 'e.g. John Doe'}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-field">
                      {language === 'ar' ? 'البريد الإلكتروني للتواصل' : 'Contact Email'}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                        className="input-field ps-10"
                        placeholder="client@company.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Portal & Visibility Settings */}
              <div className="rounded-2xl bg-white border border-slate-200 p-4 md:p-5 space-y-4 shadow-sm">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary-600" />
                  {language === 'ar' ? 'إعدادات الوصول وصلاحيات البوابة' : 'Portal Access & Visibility Settings'}
                </h4>

                {/* Toggle: Show Finances */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showFinances}
                      onChange={(e) => setFormData((f) => ({ ...f, showFinances: e.target.checked }))}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="block text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-blue-600" />
                        {copy.showFinancesTitle}
                      </span>
                      <span className="block text-xs text-gray-600 mt-0.5 leading-relaxed">
                        {copy.showFinancesDesc}
                      </span>
                    </div>
                  </label>
                </div>

                {/* Toggle: Profile Lock */}
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.profileLocked}
                      onChange={(e) => setFormData((f) => ({ ...f, profileLocked: e.target.checked }))}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="block text-sm font-bold text-gray-900 flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-amber-600" />
                        {copy.profileLockedTitle}
                      </span>
                      <span className="block text-xs text-gray-600 mt-0.5 leading-relaxed">
                        {copy.profileLockedDesc}
                      </span>
                    </div>
                  </label>
                </div>

                {/* If Creating: Optional Immediate Account Creation */}
                {!editingClient && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.createAccount}
                        onChange={(e) => setFormData((f) => ({ ...f, createAccount: e.target.checked }))}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="block text-sm font-bold text-gray-900 flex items-center gap-1.5">
                          <Key className="w-4 h-4 text-emerald-600" />
                          {copy.createAccountTitle}
                        </span>
                        <span className="block text-xs text-gray-600 mt-0.5 leading-relaxed">
                          {copy.createAccountDesc}
                        </span>
                      </div>
                    </label>

                    {formData.createAccount && (
                      <div className="pt-3 border-t border-emerald-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="label-field text-xs">{t('auth.password')} *</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={formData.password}
                              onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                              required={formData.createAccount}
                              placeholder="Pass-123456"
                              className="input-field font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setFormData((f) => ({ ...f, password: generateRandomPassword() }))}
                              className="btn-secondary text-xs shrink-0"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              {language === 'ar' ? 'توليد كلمة مرور' : 'Generate'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* If Editing and user already exists: password reset field */}
                {editingClient && editingClient.user && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <label className="label-field text-xs">
                      {language === 'ar' ? 'تغيير كلمة المرور للعميل' : 'Change Client Password'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                      placeholder={copy.keepPassword}
                      className="input-field"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">{copy.keepPassword}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <p className="text-sm text-gray-500">{editingClient ? copy.updatedHint : copy.createdHint}</p>
                <div className="flex items-center justify-end gap-3">
                  <button type="submit" disabled={submitting} className="btn-primary min-w-[128px] justify-center">
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

      {/* Activation Modal */}
      {activatingClient && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" dir={dir}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {language === 'ar' ? 'تفعيل حساب الدخول لبوابة العميل' : 'Activate Client Portal Account'}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'ar' ? 'المنشأة:' : 'Client:'}{' '}
                  <span className="font-bold text-gray-800">{activatingClient.companyName}</span>
                </p>
              </div>
              <button
                onClick={() => setActivatingClient(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleActivationSubmit} className="p-6 space-y-4">
              <div>
                <label className="label-field text-xs">
                  {language === 'ar' ? 'البريد الإلكتروني المعتمد للدخول *' : 'Login Email Address *'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={activationForm.email}
                    onChange={(e) => setActivationForm((f) => ({ ...f, email: e.target.value }))}
                    className="input-field ps-10"
                    placeholder="client@domain.com"
                  />
                </div>
              </div>

              <div>
                <label className="label-field text-xs">
                  {language === 'ar' ? 'اسم المستخدم / المسؤول *' : 'User / Contact Name *'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={activationForm.name}
                    onChange={(e) => setActivationForm((f) => ({ ...f, name: e.target.value }))}
                    className="input-field ps-10"
                  />
                </div>
              </div>

              <div>
                <label className="label-field text-xs">
                  {language === 'ar' ? 'كلمة المرور المؤقتة *' : 'Temporary Password *'}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      minLength={6}
                      value={activationForm.password}
                      onChange={(e) => setActivationForm((f) => ({ ...f, password: e.target.value }))}
                      className="input-field ps-10 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivationForm((f) => ({ ...f, password: generateRandomPassword() }))}
                    className="btn-secondary text-xs shrink-0"
                    title={language === 'ar' ? 'توليد كلمة مرور أخرى' : 'Generate new'}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activationForm.password)
                      setCopiedPass(true)
                      setTimeout(() => setCopiedPass(false), 2000)
                      toast.success(language === 'ar' ? 'تم نسخ كلمة المرور' : 'Password copied')
                    }}
                    className="btn-secondary text-xs shrink-0"
                    title="Copy"
                  >
                    {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {language === 'ar'
                    ? 'يستطيع العميل تغيير كلمة المرور في أي وقت بعد تسجيل دخوله الأول.'
                    : 'Client can change this password after their first login.'}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={activationForm.sendEmail}
                    onChange={(e) => setActivationForm((f) => ({ ...f, sendEmail: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  {language === 'ar'
                    ? 'إرسال بيانات الدخول ورابط البوابة إلى بريد العميل تلقائياً'
                    : 'Send login credentials and portal link via email'}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActivatingClient(null)}
                  className="btn-secondary text-xs"
                  disabled={activatingSubmitting}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={activatingSubmitting}
                  className="btn-primary text-xs min-w-[120px] justify-center"
                >
                  {activatingSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {language === 'ar' ? 'جاري التفعيل...' : 'Activating...'}
                    </>
                  ) : (
                    <>
                      <Key className="w-3.5 h-3.5" />
                      {language === 'ar' ? 'تفعيل الحساب الآن' : 'Activate Account'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clients Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => {
            const settings = parsePortalSettings(client.contactInfo)
            const locked = isProfileLocked(settings)
            const financesActive = isFinancesVisible(settings)
            const hasUserAccount = Boolean(client.user && client.userId)
            const contactPerson = client.user?.name || settings.contactPerson || client.companyName
            const contactEmail = client.user?.email || settings.contactEmail || ''

            return (
              <div key={client.id} className="card hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  {/* Top Header of Card */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center shrink-0 text-primary-700 font-bold">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 leading-tight">
                          {client.companyNameAr || client.companyName}
                        </h3>
                        {client.companyNameAr && client.companyName !== client.companyNameAr && (
                          <p className="text-xs text-gray-400 font-mono mt-0.5">{client.companyName}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {contactPerson}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setProfileClient(client)}
                        className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 transition"
                        title={language === 'ar' ? 'فتح الملف الشامل والمالي' : 'Client Profile'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startEdit(client)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
                        title={t('common.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Status Badges Row */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    {/* Account Status */}
                    {hasUserAccount ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                        <UserCheck className="w-3 h-3" />
                        {copy.activeAccount}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                        <UserX className="w-3 h-3" />
                        {copy.noAccount}
                      </span>
                    )}

                    {/* Finances Visibility Badge with quick toggle */}
                    <button
                      type="button"
                      onClick={() => void toggleFinances(client)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                        financesActive
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                      }`}
                      title={financesActive ? copy.hideFinancesAction : copy.showFinancesAction}
                    >
                      {financesActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {financesActive ? copy.financesVisibleBadge : copy.financesHiddenBadge}
                    </button>

                    {/* Profile Lock Badge */}
                    <button
                      type="button"
                      onClick={() => void toggleLock(client)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition ${
                        locked ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={locked ? copy.unlockAction : copy.lockAction}
                    >
                      {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      {locked ? copy.lockedBadge : copy.unlockedBadge}
                    </button>
                  </div>

                  {/* Contact Info Details */}
                  <div className="space-y-2 text-xs text-gray-600 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-mono">
                        {contactEmail || <span className="text-slate-400 italic">لا يوجد بريد مسجل</span>}
                      </span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono">{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{client.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer of Card */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500 font-medium">
                    {client._count?.reports || 0} {t('admin.reports')}
                  </span>

                  {hasUserAccount ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openActivationModal(client)}
                        className="text-xs font-semibold text-primary-700 hover:underline inline-flex items-center gap-1"
                        title={copy.resetPassAction}
                      >
                        <Key className="w-3 h-3" />
                        {copy.resetPassAction}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeactivateAccount(client)}
                        className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                        title={language === 'ar' ? 'تعطيل حساب الدخول' : 'Disable access'}
                      >
                        <PowerOff className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openActivationModal(client)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary-800 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-3 py-1.5 rounded-xl transition shadow-xs"
                    >
                      <Key className="w-3.5 h-3.5 text-primary-600" />
                      {copy.activateAction}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {clients.length === 0 && !loading && (
        <div className="card text-center py-12">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('common.noData')}</h3>
          <p className="text-gray-600">{t('admin.createClient')}</p>
        </div>
      )}

      {profileClient && (
        <ClientProfileModal
          client={profileClient}
          onClose={() => setProfileClient(null)}
          onLockChanged={async () => {
            await fetchData()
            await onDataChanged?.()
          }}
          onClientUpdated={async () => {
            await fetchData()
            await onDataChanged?.()
          }}
        />
      )}
    </div>
  )
}
