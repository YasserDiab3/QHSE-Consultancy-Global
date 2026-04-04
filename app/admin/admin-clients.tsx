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
} from 'lucide-react'
import toast from 'react-hot-toast'

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

export default function AdminClients() {
  const { t } = useLanguage()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
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
        fetchData()
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
        fetchData()
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
                    ? 'Update the client account and company details from one place.'
                    : 'Create a portal account, company profile, and contact details for the client.'}
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
                    <h4 className="font-semibold text-gray-900">Portal Account</h4>
                    <p className="text-sm text-gray-500">Login credentials and main client contact.</p>
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
                        placeholder={editingClient ? 'Leave empty to keep current password' : 'Create a temporary password'}
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
                    <h4 className="font-semibold text-gray-900">Company Profile</h4>
                    <p className="text-sm text-gray-500">Company identity and primary contact information.</p>
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
                    ? 'Changes are saved immediately to the client portal.'
                    : 'The client will be created in the database and can sign in immediately.'}
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
                        <ArrowRight className="w-4 h-4" />
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
    </div>
  )
}
