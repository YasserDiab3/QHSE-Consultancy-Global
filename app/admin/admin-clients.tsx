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
  const [showForm, setShowForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    companyNameAr: '',
    phone: '',
    address: '',
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clients')
      if (res.ok) setClients(await res.json())
    } catch (error) {
      console.error('Failed to fetch:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients'
    const method = editingClient ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success(editingClient ? t('admin.clientUpdated') : t('admin.clientCreated'))
        setShowForm(false)
        setEditingClient(null)
        setFormData({ name: '', email: '', password: '', companyName: '', companyNameAr: '', phone: '', address: '' })
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || t('common.error'))
      }
    } catch (error) {
      toast.error(t('common.error'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.confirmDelete'))) return
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(t('admin.deleted'))
        fetchData()
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
        <button onClick={() => { setShowForm(true); setEditingClient(null) }} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('admin.addClient')}
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editingClient ? t('admin.editClient') : t('admin.createClient')}
              </h3>
              <button onClick={() => { setShowForm(false); setEditingClient(null) }}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label-field">{t('admin.clientName')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">{t('admin.clientEmail')} *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">{t('auth.password')} {!editingClient && '*'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                  required={!editingClient}
                  placeholder={editingClient ? 'Leave empty to keep current' : ''}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">{t('admin.clientCompany')} *</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData((f) => ({ ...f, companyName: e.target.value }))}
                  required
                  className="input-field"
                />
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
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">{t('admin.clientAddress')}</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData((f) => ({ ...f, address: e.target.value }))}
                  className="input-field"
                />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button type="submit" className="btn-primary">{t('common.save')}</button>
                <button type="button" onClick={() => { setShowForm(false); setEditingClient(null) }} className="btn-secondary">
                  {t('common.cancel')}
                </button>
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
