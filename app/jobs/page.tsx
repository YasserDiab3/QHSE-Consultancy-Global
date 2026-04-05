'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useLanguage } from '@/context'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Send,
} from 'lucide-react'

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
}

const createApplicationForm = () => ({
  name: '',
  email: '',
  phone: '',
  company: '',
  linkedinUrl: '',
  coverLetter: '',
})

export default function JobsPage() {
  const { language, dir } = useLanguage()
  const [jobs, setJobs] = useState<JobOpening[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null)
  const [formData, setFormData] = useState(createApplicationForm)

  const copy = useMemo(
    () =>
      language === 'ar'
        ? {
            title: 'الوظائف',
            subtitle: 'استعرض الوظائف المفتوحة حاليًا وقدّم طلبك مباشرة من خلال بوابة الوظائف.',
            applyNow: 'قدّم الآن',
            noJobsTitle: 'لا توجد وظائف متاحة الآن',
            noJobsDesc: 'يمكنك التواصل معنا وسنحتفظ ببياناتك للفرص المستقبلية المناسبة.',
            selectedJob: 'الوظيفة المختارة',
            applicationTitle: 'نموذج التقديم',
            applicationHint: 'أرسل بياناتك وسيتم حفظ طلبك مباشرة في قاعدة البيانات ومراجعته من فريقنا.',
            name: 'الاسم الكامل',
            email: 'البريد الإلكتروني',
            phone: 'رقم الهاتف',
            company: 'الشركة الحالية',
            linkedin: 'رابط لينكدإن',
            coverLetter: 'نبذة أو رسالة تعريفية',
            location: 'الموقع',
            department: 'القسم',
            requirements: 'المتطلبات',
            submit: 'إرسال الطلب',
            success: 'تم إرسال طلب التوظيف بنجاح',
            error: 'تعذر إرسال طلب التوظيف',
            contactFallback: 'لم تجد الوظيفة المناسبة؟ تواصل معنا',
          }
        : {
            title: 'Jobs',
            subtitle: 'Explore current openings and submit your application directly through the careers portal.',
            applyNow: 'Apply now',
            noJobsTitle: 'No open roles right now',
            noJobsDesc: 'You can still contact us and we will keep your profile for suitable upcoming opportunities.',
            selectedJob: 'Selected role',
            applicationTitle: 'Application form',
            applicationHint: 'Your application is stored directly in the database and reviewed by our team.',
            name: 'Full name',
            email: 'Email address',
            phone: 'Phone number',
            company: 'Current company',
            linkedin: 'LinkedIn URL',
            coverLetter: 'Short profile / cover letter',
            location: 'Location',
            department: 'Department',
            requirements: 'Requirements',
            submit: 'Submit application',
            success: 'Application submitted successfully',
            error: 'Failed to submit application',
            contactFallback: 'No suitable role? Contact us',
          },
    [language]
  )

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/jobs', { cache: 'no-store' })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load jobs')
      }

      setJobs(data)
      if (data.length > 0 && !selectedJob) {
        setSelectedJob(data[0])
      }
    } catch (error) {
      console.error('Failed to load jobs:', error)
      toast.error(language === 'ar' ? 'تعذر تحميل الوظائف' : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [language, selectedJob])

  useEffect(() => {
    void fetchJobs()
  }, [fetchJobs])

  useEffect(() => {
    if (!selectedJob) {
      return
    }

    setFormData((current) => ({
      ...current,
      coverLetter:
        current.coverLetter ||
        (language === 'ar'
          ? `أرغب في التقديم على وظيفة: ${selectedJob.titleAr || selectedJob.title}`
          : `I would like to apply for the role: ${selectedJob.title}`),
    }))
  }, [language, selectedJob])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedJob) {
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobOpeningId: selectedJob.id,
          ...formData,
        }),
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || copy.error)
      }

      toast.success(copy.success)
      setFormData(createApplicationForm())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <section className="relative overflow-hidden bg-gradient-to-br from-primary-800 to-primary-600 pb-20 pt-32">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
              backgroundSize: '50px 50px',
            }}
          />
        </div>
        <div className="container-custom relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">
              <BriefcaseBusiness className="h-4 w-4" />
              <span>{copy.title}</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold text-white md:text-5xl">{copy.title}</h1>
            <p className="text-xl text-white/80">{copy.subtitle}</p>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-custom">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="card py-14 text-center">
              <BriefcaseBusiness className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <h2 className="mb-3 text-2xl font-bold text-gray-900">{copy.noJobsTitle}</h2>
              <p className="mx-auto max-w-2xl text-gray-600">{copy.noJobsDesc}</p>
              <Link href="/contact" className="btn-primary mt-8 inline-flex px-6 py-3">
                {copy.contactFallback}
                <ArrowRight className={`h-4 w-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
              <div className="space-y-4 lg:col-span-3">
                {jobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id

                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => setSelectedJob(job)}
                      className={`card w-full text-start transition-all ${
                        isSelected ? 'ring-2 ring-primary-300 shadow-lg' : 'hover:shadow-md'
                      }`}
                    >
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <span className="badge bg-emerald-100 text-emerald-800">
                          {language === 'ar' && job.employmentTypeAr ? job.employmentTypeAr : job.employmentType}
                        </span>
                        {(job.department || job.departmentAr) && (
                          <span className="badge bg-gray-100 text-gray-700">
                            {language === 'ar' && job.departmentAr ? job.departmentAr : job.department}
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {language === 'ar' && job.titleAr ? job.titleAr : job.title}
                      </h2>
                      <p className="mt-3 line-clamp-3 leading-7 text-gray-600">
                        {language === 'ar' && job.summaryAr ? job.summaryAr : job.summary}
                      </p>
                      <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        {(job.location || job.locationAr) && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary-500" />
                            <span>{language === 'ar' && job.locationAr ? job.locationAr : job.location}</span>
                          </div>
                        )}
                        {job.applyUrl && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-primary-500" />
                            <span>{language === 'ar' ? 'تقديم خارجي متاح' : 'External application available'}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="lg:col-span-2">
                <div className="sticky top-28 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                  {selectedJob ? (
                    <>
                      <div className="mb-5">
                        <p className="text-sm font-semibold text-primary-600">{copy.selectedJob}</p>
                        <h3 className="mt-2 text-2xl font-bold text-gray-900">
                          {language === 'ar' && selectedJob.titleAr ? selectedJob.titleAr : selectedJob.title}
                        </h3>
                      </div>

                      <div className="mb-6 space-y-3 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                        {(selectedJob.location || selectedJob.locationAr) && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary-500" />
                            <span>{copy.location}: {language === 'ar' && selectedJob.locationAr ? selectedJob.locationAr : selectedJob.location}</span>
                          </div>
                        )}
                        {(selectedJob.department || selectedJob.departmentAr) && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary-500" />
                            <span>{copy.department}: {language === 'ar' && selectedJob.departmentAr ? selectedJob.departmentAr : selectedJob.department}</span>
                          </div>
                        )}
                        {selectedJob.applyEmail && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-primary-500" />
                            <span>{selectedJob.applyEmail}</span>
                          </div>
                        )}
                      </div>

                      {(selectedJob.requirements || selectedJob.requirementsAr) && (
                        <div className="mb-6 rounded-2xl border border-gray-200 p-4">
                          <h4 className="mb-2 text-sm font-semibold text-gray-900">{copy.requirements}</h4>
                          <p className="whitespace-pre-wrap text-sm leading-7 text-gray-600">
                            {language === 'ar' && selectedJob.requirementsAr
                              ? selectedJob.requirementsAr
                              : selectedJob.requirements}
                          </p>
                        </div>
                      )}

                      <div className="mb-4">
                        <h4 className="text-lg font-bold text-gray-900">{copy.applicationTitle}</h4>
                        <p className="mt-1 text-sm text-gray-500">{copy.applicationHint}</p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="label-field">{copy.name} *</label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData((current) => ({ ...current, name: e.target.value }))}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label-field">{copy.email} *</label>
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData((current) => ({ ...current, email: e.target.value }))}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label-field">{copy.phone}</label>
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData((current) => ({ ...current, phone: e.target.value }))}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label-field">{copy.company}</label>
                          <input
                            type="text"
                            value={formData.company}
                            onChange={(e) => setFormData((current) => ({ ...current, company: e.target.value }))}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label-field">{copy.linkedin}</label>
                          <input
                            type="url"
                            value={formData.linkedinUrl}
                            onChange={(e) => setFormData((current) => ({ ...current, linkedinUrl: e.target.value }))}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label-field">{copy.coverLetter}</label>
                          <textarea
                            rows={5}
                            value={formData.coverLetter}
                            onChange={(e) => setFormData((current) => ({ ...current, coverLetter: e.target.value }))}
                            className="input-field resize-none"
                          />
                        </div>
                        <button type="submit" disabled={submitting} className="btn-primary w-full justify-center px-6 py-3">
                          {submitting ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              {language === 'ar' ? 'جارٍ الإرسال...' : 'Submitting...'}
                            </>
                          ) : (
                            <>
                              <Send className="h-5 w-5" />
                              {copy.submit}
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
