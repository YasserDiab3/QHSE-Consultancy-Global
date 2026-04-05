'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BriefcaseBusiness,
  Building2,
  Edit,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '@/context'

type JobOpening = {
  id: string
  title: string
  titleAr?: string | null
  location?: string | null
  locationAr?: string | null
  department?: string | null
  departmentAr?: string | null
  employmentType: string
  employmentTypeAr?: string | null
  summary: string
  summaryAr?: string | null
  requirements?: string | null
  requirementsAr?: string | null
  applyEmail?: string | null
  applyUrl?: string | null
  status: string
  isPublished: boolean
  sortOrder: number
  createdAt: string
}

type JobApplication = {
  id: string
  name: string
  email: string
  phone?: string | null
  company?: string | null
  resumeUrl?: string | null
  resumeOriginalName?: string | null
  coverLetter?: string | null
  status: string
  createdAt: string
  jobOpening: {
    id: string
    title: string
    titleAr?: string | null
  }
}

const createInitialFormData = () => ({
  title: '',
  titleAr: '',
  location: '',
  locationAr: '',
  department: '',
  departmentAr: '',
  employmentType: 'Full-time',
  employmentTypeAr: 'دوام كامل',
  summary: '',
  summaryAr: '',
  requirements: '',
  requirementsAr: '',
  applyEmail: '',
  applyUrl: '',
  status: 'OPEN',
  isPublished: true,
  sortOrder: 0,
})

export default function AdminJobs({
  onDataChanged,
}: {
  onDataChanged?: () => void | Promise<void>
}) {
  const { language, dir } = useLanguage()
  const [jobs, setJobs] = useState<JobOpening[]>([])
  const [loading, setLoading] = useState(true)
  const [applicationsLoading, setApplicationsLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [updatingApplicationId, setUpdatingApplicationId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingJob, setEditingJob] = useState<JobOpening | null>(null)
  const [formData, setFormData] = useState(createInitialFormData)
  const [applications, setApplications] = useState<JobApplication[]>([])

  const copy = useMemo(
    () =>
      language === 'ar'
        ? {
            title: 'إدارة الوظائف',
            addJob: 'إضافة وظيفة',
            editJob: 'تعديل الوظيفة',
            createJob: 'إنشاء وظيفة جديدة',
            emptyTitle: 'لا توجد وظائف مضافة',
            emptyDesc: 'ابدأ بإضافة وظيفة جديدة لتظهر في تبويب الوظائف وتصبح جاهزة للنشر.',
            employmentType: 'نوع التوظيف',
            location: 'الموقع',
            department: 'القسم',
            summary: 'الوصف المختصر',
            requirements: 'المتطلبات',
            publish: 'منشورة',
            hidden: 'مخفية',
            statusOpen: 'مفتوحة',
            statusClosed: 'مغلقة',
            applyEmail: 'بريد التقديم',
            applyUrl: 'رابط التقديم',
            sortOrder: 'ترتيب الظهور',
            published: 'منشورة للزوار',
            saveHint: 'يتم حفظ الوظيفة مباشرة في قاعدة البيانات ويمكن عرضها لاحقًا في أي صفحة وظائف عامة.',
            applicationsTitle: 'طلبات التوظيف',
            applicationsEmpty: 'لا توجد طلبات توظيف حتى الآن.',
            statusNew: 'جديد',
            statusReviewed: 'تمت المراجعة',
            statusContacted: 'تم التواصل',
            statusRejected: 'مرفوض',
          }
        : {
            title: 'Jobs Management',
            addJob: 'Add Job',
            editJob: 'Edit Job',
            createJob: 'Create Job Opening',
            emptyTitle: 'No job openings yet',
            emptyDesc: 'Start by creating a new job opening that can later be published to visitors.',
            employmentType: 'Employment type',
            location: 'Location',
            department: 'Department',
            summary: 'Summary',
            requirements: 'Requirements',
            publish: 'Published',
            hidden: 'Hidden',
            statusOpen: 'Open',
            statusClosed: 'Closed',
            applyEmail: 'Application email',
            applyUrl: 'Application URL',
            sortOrder: 'Sort order',
            published: 'Visible to visitors',
            saveHint: 'The role will be saved directly to the database and can be surfaced in a public careers section later.',
            applicationsTitle: 'Job Applications',
            applicationsEmpty: 'No job applications yet.',
            statusNew: 'New',
            statusReviewed: 'Reviewed',
            statusContacted: 'Contacted',
            statusRejected: 'Rejected',
          },
    [language]
  )

  const resetForm = () => {
    setEditingJob(null)
    setFormData(createInitialFormData())
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/jobs', { cache: 'no-store' })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load jobs')
      }

      setJobs(data)
    } catch (error) {
      console.error('Failed to load jobs:', error)
      toast.error(language === 'ar' ? 'تعذر تحميل الوظائف' : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [language])

  const fetchApplications = useCallback(async () => {
    setApplicationsLoading(true)
    try {
      const res = await fetch('/api/job-applications', { cache: 'no-store' })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load job applications')
      }

      setApplications(data)
    } catch (error) {
      console.error('Failed to load job applications:', error)
      toast.error(language === 'ar' ? 'تعذر تحميل طلبات التوظيف' : 'Failed to load job applications')
    } finally {
      setApplicationsLoading(false)
    }
  }, [language])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    void fetchApplications()
  }, [fetchApplications])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)

    try {
      const url = editingJob ? `/api/jobs/${editingJob.id}` : '/api/jobs'
      const method = editingJob ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save job')
      }

      toast.success(language === 'ar' ? 'تم حفظ الوظيفة بنجاح' : 'Job saved successfully')
      setShowForm(false)
      resetForm()
      await fetchData()
      await fetchApplications()
      await onDataChanged?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'تعذر حفظ الوظيفة' : 'Failed to save job')
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (job: JobOpening) => {
    setEditingJob(job)
    setFormData({
      title: job.title || '',
      titleAr: job.titleAr || '',
      location: job.location || '',
      locationAr: job.locationAr || '',
      department: job.department || '',
      departmentAr: job.departmentAr || '',
      employmentType: job.employmentType || 'Full-time',
      employmentTypeAr: job.employmentTypeAr || '',
      summary: job.summary || '',
      summaryAr: job.summaryAr || '',
      requirements: job.requirements || '',
      requirementsAr: job.requirementsAr || '',
      applyEmail: job.applyEmail || '',
      applyUrl: job.applyUrl || '',
      status: job.status || 'OPEN',
      isPublished: job.isPublished,
      sortOrder: job.sortOrder || 0,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'ar' ? 'هل تريد حذف هذه الوظيفة؟' : 'Do you want to delete this job?')) {
      return
    }

    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete job')
      }

      toast.success(language === 'ar' ? 'تم حذف الوظيفة' : 'Job deleted')
      await fetchData()
      await fetchApplications()
      await onDataChanged?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'تعذر حذف الوظيفة' : 'Failed to delete job')
    }
  }

  const updateApplicationStatus = async (id: string, status: string) => {
    setUpdatingApplicationId(id)
    try {
      const res = await fetch(`/api/job-applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update application')
      }

      setApplications((current) =>
        current.map((application) => (application.id === id ? { ...application, status } : application))
      )
      toast.success(language === 'ar' ? 'تم تحديث حالة الطلب' : 'Application status updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : language === 'ar' ? 'تعذر تحديث الطلب' : 'Failed to update application')
    } finally {
      setUpdatingApplicationId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{copy.title}</h2>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" />
          {copy.addJob}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-gray-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-6 md:p-8">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editingJob ? copy.editJob : copy.createJob}
                </h3>
                <p className="mt-2 text-sm text-gray-500">{copy.saveHint}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="rounded-full p-2 transition-colors hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 p-6 md:p-8">
              <div className="rounded-2xl border border-primary-100 bg-primary-50 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{language === 'ar' ? 'بيانات الوظيفة' : 'Role details'}</h4>
                    <p className="text-sm text-gray-500">{language === 'ar' ? 'العنوان والوصف ونوع التوظيف.' : 'Title, summary, and employment details.'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="label-field">{language === 'ar' ? 'المسمى الوظيفي *' : 'Job title *'}</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData((current) => ({ ...current, title: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">{language === 'ar' ? 'المسمى الوظيفي (AR)' : 'Job title (AR)'}</label>
                    <input
                      type="text"
                      value={formData.titleAr}
                      onChange={(e) => setFormData((current) => ({ ...current, titleAr: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">{copy.employmentType} *</label>
                    <input
                      type="text"
                      required
                      value={formData.employmentType}
                      onChange={(e) => setFormData((current) => ({ ...current, employmentType: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">{language === 'ar' ? 'نوع التوظيف (AR)' : 'Employment type (AR)'}</label>
                    <input
                      type="text"
                      value={formData.employmentTypeAr}
                      onChange={(e) => setFormData((current) => ({ ...current, employmentTypeAr: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label-field">{copy.summary} *</label>
                    <textarea
                      required
                      rows={3}
                      value={formData.summary}
                      onChange={(e) => setFormData((current) => ({ ...current, summary: e.target.value }))}
                      className="input-field resize-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label-field">{language === 'ar' ? 'الوصف المختصر (AR)' : 'Summary (AR)'}</label>
                    <textarea
                      rows={3}
                      value={formData.summaryAr}
                      onChange={(e) => setFormData((current) => ({ ...current, summaryAr: e.target.value }))}
                      className="input-field resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-primary-500">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{language === 'ar' ? 'بيانات النشر والتواصل' : 'Publishing and contact'}</h4>
                    <p className="text-sm text-gray-500">{language === 'ar' ? 'الموقع والقسم وحالة النشر وطرق التقديم.' : 'Location, department, visibility, and application channels.'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="label-field">{copy.location}</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData((current) => ({ ...current, location: e.target.value }))}
                        className="input-field ps-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-field">{language === 'ar' ? 'الموقع (AR)' : 'Location (AR)'}</label>
                    <input
                      type="text"
                      value={formData.locationAr}
                      onChange={(e) => setFormData((current) => ({ ...current, locationAr: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">{copy.department}</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData((current) => ({ ...current, department: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">{language === 'ar' ? 'القسم (AR)' : 'Department (AR)'}</label>
                    <input
                      type="text"
                      value={formData.departmentAr}
                      onChange={(e) => setFormData((current) => ({ ...current, departmentAr: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label-field">{copy.requirements}</label>
                    <textarea
                      rows={4}
                      value={formData.requirements}
                      onChange={(e) => setFormData((current) => ({ ...current, requirements: e.target.value }))}
                      className="input-field resize-none"
                    />
                  </div>
                  <div>
                    <label className="label-field">{language === 'ar' ? 'المتطلبات (AR)' : 'Requirements (AR)'}</label>
                    <textarea
                      rows={4}
                      value={formData.requirementsAr}
                      onChange={(e) => setFormData((current) => ({ ...current, requirementsAr: e.target.value }))}
                      className="input-field resize-none"
                    />
                  </div>
                  <div>
                    <label className="label-field">{copy.applyEmail}</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={formData.applyEmail}
                        onChange={(e) => setFormData((current) => ({ ...current, applyEmail: e.target.value }))}
                        className="input-field ps-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-field">{copy.applyUrl}</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="url"
                        value={formData.applyUrl}
                        onChange={(e) => setFormData((current) => ({ ...current, applyUrl: e.target.value }))}
                        className="input-field ps-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label-field">{language === 'ar' ? 'الحالة' : 'Status'}</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData((current) => ({ ...current, status: e.target.value }))}
                      className="input-field"
                    >
                      <option value="OPEN">{copy.statusOpen}</option>
                      <option value="CLOSED">{copy.statusClosed}</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">{copy.sortOrder}</label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData((current) => ({ ...current, sortOrder: Number(e.target.value) || 0 }))}
                      className="input-field"
                    />
                  </div>
                </div>

                <label className="mt-4 flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData((current) => ({ ...current, isPublished: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span>{copy.published}</span>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">{copy.saveHint}</p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary min-w-[130px] justify-center"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...'}
                      </>
                    ) : (
                      language === 'ar' ? 'حفظ' : 'Save'
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
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="card py-12 text-center">
          <BriefcaseBusiness className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h3 className="mb-2 text-lg font-semibold text-gray-900">{copy.emptyTitle}</h3>
          <p className="text-gray-600">{copy.emptyDesc}</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {jobs.map((job) => (
              <div key={job.id} className="card transition-shadow hover:shadow-md">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className={`badge ${job.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                        {job.status === 'OPEN' ? copy.statusOpen : copy.statusClosed}
                      </span>
                      <span className={`badge ${job.isPublished ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                        {job.isPublished ? copy.publish : copy.hidden}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {language === 'ar' && job.titleAr ? job.titleAr : job.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {language === 'ar' && job.employmentTypeAr ? job.employmentTypeAr : job.employmentType}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(job)}
                      className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(job.id)}
                      className="rounded-lg p-2 text-red-500 transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="line-clamp-3 text-sm leading-7 text-gray-600">
                  {language === 'ar' && job.summaryAr ? job.summaryAr : job.summary}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 border-t border-gray-200 pt-4 sm:grid-cols-2">
                  {(job.location || job.locationAr) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <span>{language === 'ar' && job.locationAr ? job.locationAr : job.location}</span>
                    </div>
                  )}
                  {(job.department || job.departmentAr) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <span>{language === 'ar' && job.departmentAr ? job.departmentAr : job.department}</span>
                    </div>
                  )}
                  {job.applyEmail && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{job.applyEmail}</span>
                    </div>
                  )}
                  {job.applyUrl && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Globe className="h-4 w-4 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{job.applyUrl}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{copy.applicationsTitle}</h3>
              <span className="badge bg-primary-50 text-primary-700">{applications.length}</span>
            </div>

            {applicationsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-7 w-7 animate-spin text-primary-500" />
              </div>
            ) : applications.length === 0 ? (
              <p className="text-sm text-gray-500">{copy.applicationsEmpty}</p>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <div key={application.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <h4 className="font-bold text-gray-900">{application.name}</h4>
                        <p className="text-sm text-gray-600">
                          {language === 'ar' && application.jobOpening.titleAr
                            ? application.jobOpening.titleAr
                            : application.jobOpening.title}
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                          <span>{application.email}</span>
                          {application.phone ? <span>{application.phone}</span> : null}
                          {application.company ? <span>{application.company}</span> : null}
                        </div>
                        {application.resumeUrl ? (
                          <a
                            href={application.resumeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex text-sm font-medium text-primary-600 hover:text-primary-700"
                          >
                            {application.resumeOriginalName || (language === 'ar' ? 'عرض السيرة الذاتية' : 'View resume')}
                          </a>
                        ) : null}
                        {application.coverLetter ? (
                          <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">{application.coverLetter}</p>
                        ) : null}
                      </div>

                      <div className="min-w-[180px]">
                        <label className="label-field">{language === 'ar' ? 'حالة الطلب' : 'Application status'}</label>
                        <select
                          value={application.status}
                          disabled={updatingApplicationId === application.id}
                          onChange={(event) => void updateApplicationStatus(application.id, event.target.value)}
                          className="input-field"
                        >
                          <option value="NEW">{copy.statusNew}</option>
                          <option value="REVIEWED">{copy.statusReviewed}</option>
                          <option value="CONTACTED">{copy.statusContacted}</option>
                          <option value="REJECTED">{copy.statusRejected}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
