'use client'

import { useLanguage } from '@/context'
import { useState, useCallback, useEffect } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  Loader2,
  Image as ImageIcon,
  Download,
} from 'lucide-react'
import { getRiskLevelColor, getStatusColor, getCategoryColor } from '@/lib/colors'
import toast from 'react-hot-toast'
import { downloadClientReportPdf } from '@/lib/report-pdf'

type Report = {
  id: string
  date: string
  siteName: string
  siteNameAr?: string
  category: string
  status: string
  notes?: string
  notesAr?: string
  consultantId?: string
  client?: { id: string; companyName?: string }
  observations: any[]
  consultant?: { name: string }
}

type ObservationImage = {
  id: string
  type: string
  url: string
  originalName?: string
}

const OBSERVATION_IMAGE_TYPES = ['BEFORE', 'AFTER', 'EVIDENCE'] as const

const observationTemplates = [
  { label: 'Housekeeping and access', title: 'Housekeeping and access routes require attention', riskLevel: 'MEDIUM' },
  { label: 'PPE compliance', title: 'Personal protective equipment compliance should be improved', riskLevel: 'MEDIUM' },
  { label: 'Emergency readiness', title: 'Emergency equipment and escape routes should be verified', riskLevel: 'HIGH' },
  { label: 'Signage', title: 'Safety signage should be installed or updated', riskLevel: 'LOW' },
]

const foodSafetyEgyptTemplates = [
  { label: 'PRPs: hygiene & sanitation', title: 'Documented cleaning, sanitation, and personal-hygiene prerequisite programs require verification', titleAr: 'يلزم التحقق من برامج المتطلبات الأساسية الخاصة بالتنظيف والتطهير والنظافة الشخصية', riskLevel: 'HIGH' },
  { label: 'HACCP plan', title: 'HACCP hazard analysis, critical limits, monitoring, and corrective actions require review', titleAr: 'يلزم مراجعة تحليل المخاطر ونقاط التحكم الحرجة والحدود الحرجة والرصد والإجراءات التصحيحية بنظام الهاسب', riskLevel: 'HIGH' },
  { label: 'Traceability & recall', title: 'Food traceability records and withdrawal/recall procedure require testing and evidence', titleAr: 'يلزم اختبار وتوثيق سجلات تتبع الغذاء وإجراءات السحب والاسترجاع', riskLevel: 'HIGH' },
  { label: 'Temperature control', title: 'Receiving, storage, and display temperature records require continuous verification', titleAr: 'يلزم التحقق المستمر من سجلات درجات حرارة الاستلام والتخزين والعرض', riskLevel: 'MEDIUM' },
  { label: 'Pest control', title: 'Integrated pest-control program, inspections, and corrective actions require review', titleAr: 'يلزم مراجعة برنامج مكافحة الآفات المتكامل وسجلات الفحص والإجراءات التصحيحية', riskLevel: 'MEDIUM' },
  { label: 'NFSA registration', title: 'Food establishment registration and applicable NFSA documentation require verification', titleAr: 'يلزم التحقق من تسجيل المنشأة الغذائية والمستندات المطلوبة لدى الهيئة القومية لسلامة الغذاء', riskLevel: 'MEDIUM' },
]

function ObservationImages({
  images,
  t,
}: {
  images: ObservationImage[]
  t: (key: string) => string
}) {
  const groups = OBSERVATION_IMAGE_TYPES.map((type) => ({
    type,
    label:
      type === 'BEFORE'
        ? t('reports.before')
        : type === 'AFTER'
          ? t('reports.after')
          : t('reports.photos'),
    items: images.filter((image) => image.type === type),
  })).filter((group) => group.items.length > 0)

  if (groups.length === 0) {
    return null
  }

  return (
    <div className="mt-3 space-y-3">
      {groups.map((group) => (
        <div key={group.type}>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-600">
            <ImageIcon className="h-4 w-4 text-gray-400" />
            <span>{group.label}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {group.items.map((img) => (
              <img
                key={img.id}
                src={img.url}
                alt={group.label}
                className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const createInitialFormData = () => ({
  clientId: '',
  date: '',
  siteName: '',
  siteNameAr: '',
  category: 'SAFETY',
  consultantId: '',
  notes: '',
  notesAr: '',
  status: 'OPEN',
})

export default function AdminReports({
  onDataChanged,
  filterPreset,
}: {
  onDataChanged?: () => void | Promise<void>
  filterPreset?: {
    status?: string
    riskLevel?: string
  } | null
}) {
  const { t, language } = useLanguage()
  const [reports, setReports] = useState<Report[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingReport, setEditingReport] = useState<Report | null>(null)
  const [viewingReport, setViewingReport] = useState<Report | null>(null)
  const [formData, setFormData] = useState(createInitialFormData)

  const activeFilterLabel = (() => {
    if (filterPreset?.riskLevel) {
      return language === 'ar'
        ? `عرض التقارير المرتبطة بالمخاطر: ${filterPreset.riskLevel}`
        : `Showing reports for risk levels: ${filterPreset.riskLevel}`
    }

    if (filterPreset?.status) {
      return language === 'ar'
        ? `عرض التقارير بالحالة: ${filterPreset.status}`
        : `Showing reports with status: ${filterPreset.status}`
    }

    return null
  })()

  const resetForm = () => {
    setEditingReport(null)
    setFormData(createInitialFormData())
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const reportParams = new URLSearchParams()
      if (filterPreset?.status) {
        reportParams.set('status', filterPreset.status)
      }
      if (filterPreset?.riskLevel) {
        reportParams.set('riskLevel', filterPreset.riskLevel)
      }

      const [reportsRes, clientsRes] = await Promise.all([
        fetch(`/api/reports${reportParams.toString() ? `?${reportParams.toString()}` : ''}`),
        fetch('/api/clients'),
      ])
      if (reportsRes.ok) setReports(await reportsRes.json())
      if (clientsRes.ok) setClients(await clientsRes.json())
    } catch (error) {
      console.error('Failed to fetch:', error)
    } finally {
      setLoading(false)
    }
  }, [filterPreset?.riskLevel, filterPreset?.status])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingReport ? `/api/reports/${editingReport.id}` : '/api/reports'
    const method = editingReport ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        toast.error(data?.error || t('common.error'))
        return
      }

      toast.success(editingReport ? t('admin.reportUpdated') : t('admin.reportCreated'))
      setShowForm(false)
      resetForm()
      await fetchData()
      await onDataChanged?.()
    } catch {
      toast.error(t('common.error'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.confirmDelete'))) return
    try {
      const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        toast.error(data?.error || t('common.error'))
        return
      }

      toast.success(t('admin.deleted'))
      await fetchData()
      await onDataChanged?.()
    } catch {
      toast.error(t('common.error'))
    }
  }

  const startEdit = (report: Report) => {
    setEditingReport(report)
    setFormData({
      clientId: report.client?.id || '',
      date: new Date(report.date).toISOString().split('T')[0],
      siteName: report.siteName,
      siteNameAr: report.siteNameAr || '',
      category: report.category,
      consultantId: report.consultantId || '',
      notes: report.notes || '',
      notesAr: report.notesAr || '',
      status: report.status,
    })
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{t('admin.manageReports')}</h2>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="btn-primary">
          <Plus className="w-4 h-4" />
          {t('admin.addReport')}
        </button>
      </div>

      {activeFilterLabel && (
        <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-700">
          {activeFilterLabel}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {editingReport ? t('common.edit') : t('admin.createReport')}
              </h3>
              <button onClick={() => { setShowForm(false); resetForm() }}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">{t('admin.selectClient')} *</label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData((f) => ({ ...f, clientId: e.target.value }))}
                    required
                    className="input-field"
                  >
                    <option value="">Select...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-field">{t('reports.date')} *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))}
                    required
                    className="input-field"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">{t('reports.siteName')} *</label>
                  <input
                    type="text"
                    value={formData.siteName}
                    onChange={(e) => setFormData((f) => ({ ...f, siteName: e.target.value }))}
                    required
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-field">{t('reports.siteName')} (AR)</label>
                  <input
                    type="text"
                    value={formData.siteNameAr}
                    onChange={(e) => setFormData((f) => ({ ...f, siteNameAr: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label-field">{t('reports.category')} *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
                    required
                    className="input-field"
                  >
                    <option value="SAFETY">{t('categories.safety')}</option>
                    <option value="FOOD_SAFETY">{t('categories.foodSafety')}</option>
                    <option value="QHSE">{t('categories.qhse')}</option>
                    <option value="RISK_ASSESSMENT">{t('categories.riskAssessment')}</option>
                    <option value="AUDIT">{t('categories.audit')}</option>
                    <option value="TRAINING">{t('categories.training')}</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">{t('reports.status')}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((f) => ({ ...f, status: e.target.value }))}
                    className="input-field"
                  >
                    <option value="OPEN">{t('reports.open')}</option>
                    <option value="IN_PROGRESS">{t('reports.inProgress')}</option>
                    <option value="CLOSED">{t('reports.closed')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-field">{t('reports.notes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
              <div>
                <label className="label-field">{t('reports.notes')} (AR)</label>
                <textarea
                  value={formData.notesAr}
                  onChange={(e) => setFormData((f) => ({ ...f, notesAr: e.target.value }))}
                  rows={3}
                  className="input-field resize-none"
                />
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button type="submit" className="btn-primary">
                  {t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm() }}
                  className="btn-secondary"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reports Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('reports.siteName')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('reports.date')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('reports.category')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('reports.status')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('reports.observations')}</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{report.siteName}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{new Date(report.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`badge ${getCategoryColor(report.category).bg} ${getCategoryColor(report.category).text}`}>
                      {report.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`badge ${getStatusColor(report.status).bg} ${getStatusColor(report.status).text}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{report.observations?.length || 0}</td>
                  <td className="py-3 px-4 text-sm">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingReport(report)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => downloadClientReportPdf(report, language)} className="p-1.5 rounded text-primary-600 hover:bg-primary-50" title={language === 'ar' ? 'تصدير التقرير' : 'Export report'}>
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => startEdit(report)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reports.length === 0 && (
            <div className="text-center py-8 text-gray-500">{t('common.noData')}</div>
          )}
        </div>
      )}

      {/* View Report Modal */}
      {viewingReport && (
        <ViewReportModal
          report={viewingReport}
          onClose={() => setViewingReport(null)}
          t={t}
          language={language}
          onDataChanged={async () => {
            await fetchData()
            await onDataChanged?.()
          }}
        />
      )}
    </div>
  )
}

function ViewReportModal({
  report,
  onClose,
  t,
  language,
  onDataChanged,
}: {
  report: Report
  onClose: () => void
  t: (key: string) => string
  language: string
  onDataChanged?: () => void | Promise<void>
}) {
  const [observations, setObservations] = useState<any[]>(report.observations || [])
  const [newObs, setNewObs] = useState({ title: '', titleAr: '', description: '', descriptionAr: '', riskLevel: 'LOW', status: 'OPEN' })
  const [quickPoints, setQuickPoints] = useState('')
  const [showObsForm, setShowObsForm] = useState(false)
  const [uploadingImageTarget, setUploadingImageTarget] = useState<string | null>(null)
  const templates = report.category === 'FOOD_SAFETY' ? foodSafetyEgyptTemplates : observationTemplates

  const addObservation = async () => {
    if (!newObs.title) return
    try {
      const res = await fetch('/api/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newObs, reportId: report.id }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        toast.error(data?.error || t('common.error'))
        return
      }

      setObservations((prev) => [...prev, data])
      setNewObs({ title: '', titleAr: '', description: '', descriptionAr: '', riskLevel: 'LOW', status: 'OPEN' })
      setShowObsForm(false)
      await onDataChanged?.()
      toast.success(t('common.success'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const addQuickPoints = async () => {
    const points = quickPoints.split('\n').map((point) => point.trim()).filter(Boolean)
    if (!points.length) return

    try {
      const created: any[] = []
      for (const title of points) {
        const response = await fetch('/api/observations', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId: report.id, title, riskLevel: 'MEDIUM', status: 'OPEN' }),
        })
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.error || t('common.error'))
        created.push(data)
      }
      setObservations((previous) => [...previous, ...created])
      setQuickPoints('')
      await onDataChanged?.()
      toast.success(language === 'ar' ? `تمت إضافة ${created.length} ملاحظات` : `${created.length} observations added`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'))
    }
  }

  const deleteObservation = async (id: string) => {
    if (!confirm(t('admin.confirmDelete'))) return
    try {
      const res = await fetch(`/api/observations/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        toast.error(data?.error || t('common.error'))
        return
      }

      setObservations((prev) => prev.filter((o) => o.id !== id))
      await onDataChanged?.()
      toast.success(t('admin.deleted'))
    } catch {
      toast.error(t('common.error'))
    }
  }

  const uploadObservationImages = async (
    observationId: string,
    type: 'BEFORE' | 'AFTER',
    files: FileList | null
  ) => {
    if (!files || files.length === 0) {
      return
    }

    const targetKey = `${observationId}-${type}`
    setUploadingImageTarget(targetKey)

    try {
      const uploadedImages: ObservationImage[] = []

      for (const file of Array.from(files)) {
        const payload = new FormData()
        payload.append('file', file)
        payload.append('observationId', observationId)
        payload.append('type', type)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: payload,
        })
        const data = await res.json().catch(() => null)

        if (!res.ok) {
          throw new Error(data?.error || t('common.error'))
        }

        uploadedImages.push(data)
      }

      setObservations((prev) =>
        prev.map((obs) =>
          obs.id === observationId
            ? { ...obs, images: [...(obs.images || []), ...uploadedImages] }
            : obs
        )
      )
      await onDataChanged?.()
      toast.success(t('common.success'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('common.error'))
    } finally {
      setUploadingImageTarget(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">{report.siteName}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-6">
          {/* Report Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">{t('reports.date')}</span>
              <p className="font-medium">{new Date(report.date).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-gray-500">{t('reports.category')}</span>
              <p className="font-medium">{report.category}</p>
            </div>
            <div>
              <span className="text-gray-500">{t('reports.status')}</span>
              <p className="font-medium">{report.status}</p>
            </div>
            <div>
              <span className="text-gray-500">{t('reports.consultant')}</span>
              <p className="font-medium">{report.consultant?.name || '-'}</p>
            </div>
          </div>

          {/* Observations */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">{t('reports.observations')} ({observations.length})</h4>
              <button onClick={() => setShowObsForm(!showObsForm)} className="btn-secondary px-3 py-1.5 text-sm">
                <Plus className="w-4 h-4" />
                {t('common.add')}
              </button>
            </div>

            {showObsForm && (
              <div className="card mb-4 bg-gray-50">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {templates.map((template) => (
                      <button key={template.label} type="button" onClick={() => setNewObs((current) => ({ ...current, title: template.title, titleAr: 'titleAr' in template && typeof template.titleAr === 'string' ? template.titleAr : '', riskLevel: template.riskLevel }))} className="rounded-full border border-primary-200 bg-white px-3 py-1.5 text-xs font-medium text-primary-700 transition hover:bg-primary-50">
                        {template.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      placeholder={t('reports.observation') + ' (EN)'}
                      value={newObs.title}
                      onChange={(e) => setNewObs((n) => ({ ...n, title: e.target.value }))}
                      className="input-field"
                    />
                    <input
                      placeholder={t('reports.observation') + ' (AR)'}
                      value={newObs.titleAr}
                      onChange={(e) => setNewObs((n) => ({ ...n, titleAr: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      placeholder={t('reports.description') + ' (EN)'}
                      value={newObs.description}
                      onChange={(e) => setNewObs((n) => ({ ...n, description: e.target.value }))}
                      className="input-field"
                    />
                    <input
                      placeholder={t('reports.description') + ' (AR)'}
                      value={newObs.descriptionAr}
                      onChange={(e) => setNewObs((n) => ({ ...n, descriptionAr: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={newObs.riskLevel}
                      onChange={(e) => setNewObs((n) => ({ ...n, riskLevel: e.target.value }))}
                      className="input-field"
                    >
                      <option value="LOW">{t('riskLevels.low')}</option>
                      <option value="MEDIUM">{t('riskLevels.medium')}</option>
                      <option value="HIGH">{t('riskLevels.high')}</option>
                      <option value="CRITICAL">{t('riskLevels.critical')}</option>
                    </select>
                    <select
                      value={newObs.status}
                      onChange={(e) => setNewObs((n) => ({ ...n, status: e.target.value }))}
                      className="input-field"
                    >
                      <option value="OPEN">{t('reports.open')}</option>
                      <option value="IN_PROGRESS">{t('reports.inProgress')}</option>
                      <option value="RESOLVED">{t('reports.resolved')}</option>
                      <option value="CLOSED">{t('reports.closed')}</option>
                    </select>
                  </div>
                  <button onClick={addObservation} className="btn-primary px-4 py-2 text-sm">{t('common.save')}</button>
                  <div className="border-t border-gray-200 pt-4">
                    <label className="label-field">{language === 'ar' ? 'إضافة نقاط متعددة بسرعة (نقطة بكل سطر)' : 'Quick add multiple observations (one per line)'}</label>
                    <textarea value={quickPoints} onChange={(event) => setQuickPoints(event.target.value)} rows={4} className="input-field resize-y" placeholder={language === 'ar' ? 'مثال: ممر الطوارئ يحتاج إلى إخلاء' : 'Example: Emergency exit route needs to be cleared'} />
                    <button type="button" onClick={() => void addQuickPoints()} disabled={!quickPoints.trim()} className="btn-secondary mt-3 px-4 py-2 text-sm">
                      <Plus className="h-4 w-4" />{language === 'ar' ? 'إضافة النقاط' : 'Add points'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {observations.map((obs, i) => {
                const riskColor = getRiskLevelColor(obs.riskLevel)
                return (
                  <div key={obs.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary-600">{i + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium">{language === 'ar' && obs.titleAr ? obs.titleAr : obs.title}</span>
                        <span className={`badge ${riskColor.bg} ${riskColor.text}`}>{obs.riskLevel}</span>
                        <span className={`badge ${getStatusColor(obs.status).bg} ${getStatusColor(obs.status).text}`}>{obs.status}</span>
                      </div>
                      {(obs.description || obs.descriptionAr) && (
                        <p className="text-sm text-gray-600">{language === 'ar' && obs.descriptionAr ? obs.descriptionAr : obs.description}</p>
                      )}
                      <ObservationImages images={obs.images || []} t={t} />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <label className="cursor-pointer rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100">
                        {uploadingImageTarget === `${obs.id}-BEFORE` ? (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {t('common.upload')}
                          </span>
                        ) : (
                          t('reports.before')
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            void uploadObservationImages(obs.id, 'BEFORE', event.target.files)
                            event.currentTarget.value = ''
                          }}
                        />
                      </label>
                      <label className="cursor-pointer rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100">
                        {uploadingImageTarget === `${obs.id}-AFTER` ? (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            {t('common.upload')}
                          </span>
                        ) : (
                          t('reports.after')
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            void uploadObservationImages(obs.id, 'AFTER', event.target.files)
                            event.currentTarget.value = ''
                          }}
                        />
                      </label>
                      <button onClick={() => deleteObservation(obs.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
              {observations.length === 0 && (
                <p className="text-center text-gray-500 py-4">{t('common.noData')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
