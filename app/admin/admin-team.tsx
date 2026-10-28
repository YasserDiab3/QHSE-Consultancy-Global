'use client'

import { useLanguage } from '@/context'
import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  ShieldCheck,
  FileEdit,
  Plus,
  Trash2,
  Edit2,
  X,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Lock,
  User,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { ROLES, ROLE_LABELS_AR, ROLE_LABELS_EN } from '@/lib/permissions'

type TeamUser = {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  language: string
  createdAt: string
  updatedAt?: string
  isCurrentUser: boolean
}

export default function AdminTeam({
  onDataChanged,
}: {
  onDataChanged?: () => void | Promise<void>
}) {
  const { language, dir } = useLanguage()
  const isAr = language === 'ar'

  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TeamUser | null>(null)

  const [formData, setFormData] = useState<{
    name: string
    email: string
    phone: string
    password: string
    role: string
  }>({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: ROLES.DATA_ENTRY,
  })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Failed to load team users')
      }
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err: any) {
      toast.error(err.message || (isAr ? 'فشل تحميل أعضاء الفريق' : 'Failed to load team users'))
    } finally {
      setLoading(false)
    }
  }, [isAr])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: ROLES.DATA_ENTRY,
    })
    setShowModal(true)
  }

  const openEditModal = (user: TeamUser) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      password: '',
      role: user.role,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingUser(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error(isAr ? 'يرجى إدخال اسم المستخدم' : 'Please enter full name')
      return
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      toast.error(isAr ? 'يرجى إدخال بريد إلكتروني صالح' : 'Please enter a valid email')
      return
    }

    if (!editingUser && (!formData.password || formData.password.length < 8)) {
      toast.error(isAr ? 'كلمة المرور يجب أن لا تقل عن 8 خانات' : 'Password must be at least 8 characters')
      return
    }

    setSubmitting(true)
    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users'
      const method = editingUser ? 'PUT' : 'POST'

      const payload: Record<string, any> = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim() || null,
        role: formData.role,
      }

      if (formData.password && formData.password.trim().length >= 8) {
        payload.password = formData.password.trim()
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || (isAr ? 'حدث خطأ أثناء حفظ البيانات' : 'Failed to save team member'))
      }

      toast.success(
        editingUser
          ? isAr
            ? 'تم تحديث بيانات عضو الفريق بنجاح'
            : 'Team member updated successfully'
          : isAr
          ? 'تمت إضافة عضو الفريق وإرسال إشعار الدخول لبريده'
          : 'Team member added and welcome email dispatched'
      )

      closeModal()
      fetchUsers()
      if (onDataChanged) onDataChanged()
    } catch (err: any) {
      toast.error(err.message || (isAr ? 'فشلت العملية' : 'Operation failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || (isAr ? 'فشل حذف عضو الفريق' : 'Failed to delete team member'))
      }

      toast.success(isAr ? 'تم حذف عضو الفريق بنجاح' : 'Team member removed successfully')
      setDeleteTarget(null)
      fetchUsers()
      if (onDataChanged) onDataChanged()
    } catch (err: any) {
      toast.error(err.message || (isAr ? 'فشلت عملية الحذف' : 'Deletion failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const adminCount = users.filter((u) => u.role === ROLES.ADMIN).length

  return (
    <div className="space-y-6" dir={dir}>
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {isAr ? 'إدارة فريق العمل والصلاحيات' : 'Team & Role Management'}
            </h2>
          </div>
          <p className="text-sm text-gray-500">
            {isAr
              ? 'إضافة وتعيين مسؤولي النظام ومدخلي البيانات وتحديد مستويات وصولهم بأمان'
              : 'Add system administrators and data entry clerks with granular access control'}
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          {isAr ? 'إضافة مسؤول أو مدخل بيانات' : 'Add Team Member'}
        </button>
      </div>

      {/* Permissions Guide Info Box */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h4>{isAr ? 'صلاحيات مدير عام النظام (Super Admin)' : 'Super Administrator Permissions'}</h4>
          </div>
          <ul className="text-xs text-emerald-900/80 space-y-1 list-disc list-inside">
            <li>{isAr ? 'كامل الصلاحيات دون قيود على جميع أقسام النظام' : 'Full access across all portal modules'}</li>
            <li>{isAr ? 'إضافة وتعديل وحذف أعضاء الفريق والمدراء' : 'Add, edit, and delete staff & administrators'}</li>
            <li>{isAr ? 'صلاحية الحذف النهائي للتقارير والعملاء والمستندات' : 'Permanent deletion of reports, clients, & files'}</li>
            <li>{isAr ? 'إدارة إعدادات التحقق بخطوتين (2FA) والأمان والبريد' : 'Manage 2FA, cloud email settings, and security'}</li>
          </ul>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex items-center gap-2 text-amber-800 font-semibold mb-2">
            <FileEdit className="h-5 w-5 text-amber-600" />
            <h4>{isAr ? 'صلاحيات مدخل البيانات (Data Entry Clerk)' : 'Data Entry Clerk Permissions'}</h4>
          </div>
          <ul className="text-xs text-amber-900/80 space-y-1 list-disc list-inside">
            <li>{isAr ? 'إضافة وتحديث تقارير الفحص والملاحظات الميدانية' : 'Create & update inspection reports and observations'}</li>
            <li>{isAr ? 'إضافة عملاء جدد ورفع مستندات بنك المعرفة' : 'Create clients and upload knowledge bank documents'}</li>
            <li>{isAr ? 'متابعة وتحديث طلبات التوظيف واستفسارات الاتصال' : 'Review & update job applications and inquiries'}</li>
            <li className="font-semibold text-rose-700">
              {isAr ? 'محجوب عنه: حذف أي سجل، وإدارة الفريق، وإعدادات الأمان' : 'Restricted: Deletion, team management, and 2FA'}
            </li>
          </ul>
        </div>
      </div>

      {/* Users Table / Grid */}
      {loading ? (
        <div className="flex min-h-[250px] items-center justify-center rounded-2xl border border-gray-200 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            {isAr ? 'لا يوجد أعضاء في الفريق حالياً' : 'No team members found'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {isAr ? 'ابدأ بإضافة أول عضو أو مدير للنظام' : 'Get started by adding your first team member'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold text-gray-600">
                <tr>
                  <th className="px-6 py-4 text-start">{isAr ? 'الاسم والعضو' : 'Name & Member'}</th>
                  <th className="px-6 py-4 text-start">{isAr ? 'البريد الإلكتروني' : 'Email'}</th>
                  <th className="px-6 py-4 text-start">{isAr ? 'الدور والصلاحية' : 'Role & Level'}</th>
                  <th className="px-6 py-4 text-start">{isAr ? 'الهاتف' : 'Phone'}</th>
                  <th className="px-6 py-4 text-start">{isAr ? 'تاريخ الإنشاء' : 'Created Date'}</th>
                  <th className="px-6 py-4 text-end">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => {
                  const isSuper = user.role === ROLES.ADMIN
                  const isCurrent = user.isCurrentUser
                  const isSoleAdmin = isSuper && adminCount <= 1

                  return (
                    <tr key={user.id} className="transition hover:bg-gray-50/60">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold ${
                              isSuper ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{user.name}</span>
                              {isCurrent && (
                                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                                  {isAr ? 'حسابك الحالي' : 'You'}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-400">ID: {user.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="font-mono text-xs">{user.email}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                            isSuper
                              ? 'bg-emerald-100/80 text-emerald-800'
                              : 'bg-amber-100/80 text-amber-800'
                          }`}
                        >
                          {isSuper ? <ShieldCheck className="h-3.5 w-3.5" /> : <FileEdit className="h-3.5 w-3.5" />}
                          {isAr ? ROLE_LABELS_AR[user.role] || user.role : ROLE_LABELS_EN[user.role] || user.role}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {user.phone ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            <span dir="ltr">{user.phone}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          <span>{new Date(user.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-end">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                            title={isAr ? 'تعديل البيانات' : 'Edit details'}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {isCurrent ? (
                            <button
                              disabled
                              className="cursor-not-allowed rounded-lg p-1.5 text-gray-300"
                              title={isAr ? 'لا يمكنك حذف حسابك الشخصي' : 'Cannot delete your active account'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : isSoleAdmin ? (
                            <button
                              disabled
                              className="cursor-not-allowed rounded-lg p-1.5 text-gray-300"
                              title={isAr ? 'لا يمكن حذف المدير الوحيد في النظام' : 'Cannot delete the sole administrator'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setDeleteTarget(user)}
                              className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
                              title={isAr ? 'حذف العضو' : 'Delete member'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingUser
                  ? isAr
                    ? 'تعديل بيانات عضو الفريق'
                    : 'Edit Team Member'
                  : isAr
                  ? 'إضافة مسؤول أو مدخل بيانات جديد'
                  : 'Add New Team Member'}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  {isAr ? 'الاسم الكامل *' : 'Full Name *'}
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={isAr ? 'مثال: أحمد عبد الله' : 'e.g. John Doe'}
                    className="w-full rounded-xl border border-gray-200 py-2.5 ps-10 pe-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  {isAr ? 'البريد الإلكتروني *' : 'Email Address *'}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    className="w-full rounded-xl border border-gray-200 py-2.5 ps-10 pe-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  {isAr ? 'الدور والصلاحية *' : 'Role & Access Level *'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: ROLES.DATA_ENTRY })}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-start transition ${
                      formData.role === ROLES.DATA_ENTRY
                        ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                      <FileEdit className="h-4 w-4 text-amber-600" />
                      {isAr ? 'مدخل بيانات' : 'Data Entry'}
                    </div>
                    <span className="text-[11px] text-gray-500">
                      {isAr ? 'إدخال ومتابعة دون صلاحية حذف' : 'Create & edit without delete rights'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: ROLES.ADMIN })}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-start transition ${
                      formData.role === ROLES.ADMIN
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-400'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      {isAr ? 'مدير نظام' : 'Super Admin'}
                    </div>
                    <span className="text-[11px] text-gray-500">
                      {isAr ? 'صلاحيات كاملة وإدارة الفريق' : 'Full access & team management'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  {editingUser
                    ? isAr
                      ? 'كلمة المرور الجديدة (اتركها فارغة للإبقاء على الحالية)'
                      : 'New Password (leave empty to keep current)'
                    : isAr
                    ? 'كلمة المرور المؤقتة * (8 خانات على الأقل)'
                    : 'Temporary Password * (min 8 characters)'}
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-gray-200 py-2.5 ps-10 pe-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  {isAr ? 'رقم الهاتف (اختياري)' : 'Phone Number (optional)'}
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+20 100 000 0000"
                    dir="ltr"
                    className="w-full rounded-xl border border-gray-200 py-2.5 ps-10 pe-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingUser
                    ? isAr
                      ? 'حفظ التعديلات'
                      : 'Save Changes'
                    : isAr
                    ? 'إنشاء وإرسال الدعوة'
                    : 'Create & Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {isAr ? 'تأكيد حذف عضو الفريق' : 'Confirm Team Member Deletion'}
                </h3>
                <p className="text-xs text-gray-500">
                  {isAr ? 'إجراء حساس ولا يمكن التراجع عنه' : 'Irreversible sensitive action'}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-gray-50 p-3.5 text-xs text-gray-600 space-y-1">
              <p>
                <strong>{isAr ? 'الاسم:' : 'Name:'}</strong> {deleteTarget.name}
              </p>
              <p>
                <strong>{isAr ? 'البريد:' : 'Email:'}</strong> {deleteTarget.email}
              </p>
              <p>
                <strong>{isAr ? 'الدور:' : 'Role:'}</strong>{' '}
                {isAr ? ROLE_LABELS_AR[deleteTarget.role] : ROLE_LABELS_EN[deleteTarget.role]}
              </p>
            </div>

            <p className="mt-4 text-xs text-gray-500 leading-relaxed">
              {isAr
                ? 'ملاحظة: سيتم نقل أي تقارير أو سجلات سابقة أعدها هذا العضو تلقائياً إلى حسابك لضمان سلامة التقارير وعدم فقدان أي بيانات.'
                : 'Note: Any historical reports authored by this member will be automatically reassigned to you to preserve data integrity.'}
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={submitting}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                {isAr ? 'تراجع' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={submitting}
                className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isAr ? 'نعم، حذف نهائي' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
