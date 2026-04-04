'use client'

import { useLanguage } from '@/context'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Building2, Clock, Loader2, Mail, MessageSquare, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

type ContactRequest = {
  id: string
  name: string
  company?: string | null
  email: string
  phone?: string | null
  message: string
  status: string
  createdAt: string
}

const STATUS_OPTIONS = ['NEW', 'CONTACTED', 'CLOSED'] as const

export default function AdminContactRequests({
  statusFilter = 'ALL',
  onDataChanged,
}: {
  statusFilter?: 'ALL' | 'NEW' | 'CONTACTED' | 'CLOSED'
  onDataChanged?: () => void | Promise<void>
}) {
  const { language } = useLanguage()
  const [requests, setRequests] = useState<ContactRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const copy = useMemo(
    () =>
      language === 'ar'
        ? {
            title: 'طلبات التواصل',
            subtitle: 'الطلبات الواردة من نموذج التواصل بالموقع.',
            emptyTitle: 'لا توجد طلبات تواصل',
            emptyDescription: 'أي طلب جديد من صفحة التواصل سيظهر هنا مباشرة.',
            company: 'الشركة',
            email: 'البريد الإلكتروني',
            phone: 'الهاتف',
            message: 'الرسالة',
            receivedAt: 'وقت الاستلام',
            status: 'الحالة',
            updateSuccess: 'تم تحديث الحالة بنجاح',
            updateError: 'تعذر تحديث الحالة',
            loadError: 'تعذر تحميل طلبات التواصل',
            statuses: {
              NEW: 'جديد',
              CONTACTED: 'تم التواصل',
              CLOSED: 'مغلق',
            },
          }
        : {
            title: 'Contact Requests',
            subtitle: 'New requests submitted through the public contact form.',
            emptyTitle: 'No contact requests yet',
            emptyDescription: 'New website inquiries will appear here automatically.',
            company: 'Company',
            email: 'Email',
            phone: 'Phone',
            message: 'Message',
            receivedAt: 'Received',
            status: 'Status',
            updateSuccess: 'Request status updated successfully',
            updateError: 'Failed to update request status',
            loadError: 'Failed to load contact requests',
            statuses: {
              NEW: 'New',
              CONTACTED: 'Contacted',
              CLOSED: 'Closed',
            },
          },
    [language]
  )

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/contact')
      if (!res.ok) {
        throw new Error(copy.loadError)
      }

      setRequests(await res.json())
    } catch (error) {
      console.error('Failed to fetch contact requests:', error)
      toast.error(copy.loadError)
    } finally {
      setLoading(false)
    }
  }, [copy.loadError])

  useEffect(() => {
    void fetchRequests()
  }, [fetchRequests])

  const filteredRequests = useMemo(
    () =>
      statusFilter === 'ALL'
        ? requests
        : requests.filter((request) => request.status === statusFilter),
    [requests, statusFilter]
  )

  const activeFilterLabel =
    statusFilter === 'ALL'
      ? null
      : language === 'ar'
        ? `عرض الطلبات بالحالة: ${copy.statuses[statusFilter]}`
        : `Showing requests with status: ${copy.statuses[statusFilter]}`

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/contact/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        throw new Error(copy.updateError)
      }

      setRequests((current) =>
        current.map((request) => (request.id === id ? { ...request, status } : request))
      )
      await onDataChanged?.()
      toast.success(copy.updateSuccess)
    } catch (error) {
      console.error('Failed to update contact request:', error)
      toast.error(copy.updateError)
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    )
  }

  if (filteredRequests.length === 0) {
    return (
      <div className="card py-12 text-center">
        <MessageSquare className="mx-auto mb-4 h-16 w-16 text-gray-300" />
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{copy.emptyTitle}</h3>
        <p className="text-gray-600">{copy.emptyDescription}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{copy.title}</h2>
        <p className="mt-1 text-gray-600">{copy.subtitle}</p>
      </div>

      {activeFilterLabel && (
        <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">
          {activeFilterLabel}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {filteredRequests.map((request) => (
          <div key={request.id} className="card space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{request.name}</h3>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  {request.company && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {copy.company}: {request.company}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {copy.email}: {request.email}
                    </span>
                  </div>
                  {request.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {copy.phone}: {request.phone}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {copy.receivedAt}: {new Date(request.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="min-w-[180px]">
                <label className="label-field">{copy.status}</label>
                <select
                  value={request.status}
                  disabled={updatingId === request.id}
                  onChange={(event) => void updateStatus(request.id, event.target.value)}
                  className="input-field"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {copy.statuses[status]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="mb-2 text-sm font-medium text-gray-700">{copy.message}</p>
              <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{request.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
