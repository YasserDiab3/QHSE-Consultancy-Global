'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Award,
  BookOpenCheck,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Users,
} from 'lucide-react'
import { useLanguage } from '@/context'
import { trainingTemplates } from '@/lib/training-templates'
import toast from 'react-hot-toast'

type AdminCourse = {
  id: string
  slug: string
  title: string
  titleAr?: string | null
  category: string
  passingScore: number
  isPublished: boolean
  questionCount: number
  enrollmentCount: number
}

type Enrollment = {
  id: string
  userName: string | null
  userEmail: string | null
  courseTitle: string
  courseTitleAr?: string | null
  category: string
  status: string
  score: number | null
  passed: boolean
  attempts: number
  certificateCode: string | null
  certificateIssuedAt: string | null
  updatedAt: string | null
}

type QuestionForm = {
  question: string
  questionAr: string
  optionA: string
  optionAAr: string
  optionB: string
  optionBAr: string
  optionC: string
  optionCAr: string
  optionD: string
  optionDAr: string
  correctOption: string
}

type CourseForm = {
  title: string
  titleAr: string
  category: string
  description: string
  descriptionAr: string
  content: string
  contentAr: string
  passingScore: number
  isPublished: boolean
  questions: QuestionForm[]
}

const emptyQuestion = (): QuestionForm => ({
  question: '',
  questionAr: '',
  optionA: '',
  optionAAr: '',
  optionB: '',
  optionBAr: '',
  optionC: '',
  optionCAr: '',
  optionD: '',
  optionDAr: '',
  correctOption: 'A',
})

const emptyForm = (): CourseForm => ({
  title: '',
  titleAr: '',
  category: 'SAFETY',
  description: '',
  descriptionAr: '',
  content: '',
  contentAr: '',
  passingScore: 80,
  isPublished: true,
  questions: [emptyQuestion()],
})

export default function AdminTraining({ onDataChanged }: { onDataChanged?: () => void }) {
  const { language } = useLanguage()
  const [courses, setCourses] = useState<AdminCourse[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [summary, setSummary] = useState({ totalCourses: 0, totalEnrollments: 0, totalCertificates: 0, averageScore: 0 })
  const [form, setForm] = useState<CourseForm>(() => emptyForm())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const copy = useMemo(
    () =>
      language === 'ar'
        ? {
            title: 'إدارة التدريب والشهادات',
            addCourse: 'إضافة تدريب جديد',
            template: 'قالب تدريبي جاهز',
            chooseTemplate: 'اختر قالبًا لملء النموذج',
            courses: 'التدريبات',
            trainees: 'المتدربون والنتائج',
            certificates: 'الشهادات',
            avgScore: 'متوسط النتائج',
            titleEn: 'اسم التدريب بالإنجليزية',
            titleAr: 'اسم التدريب بالعربية',
            category: 'التصنيف',
            descriptionEn: 'وصف مختصر بالإنجليزية',
            descriptionAr: 'وصف مختصر بالعربية',
            contentEn: 'محتوى التدريب بالإنجليزية',
            contentAr: 'محتوى التدريب بالعربية',
            passingScore: 'درجة النجاح',
            published: 'منشور للمتدربين',
            questions: 'أسئلة الاختبار',
            addQuestion: 'إضافة سؤال',
            save: 'حفظ التدريب',
            loadError: 'تعذر تحميل بيانات التدريب',
            saveError: 'تعذر حفظ التدريب',
            saved: 'تمت إضافة التدريب بنجاح',
            noCourses: 'لا توجد تدريبات بعد',
            noTrainees: 'لا توجد نتائج متدربين بعد',
            trainee: 'المتدرب',
            training: 'التدريب',
            score: 'النتيجة',
            attempts: 'المحاولات',
            status: 'الحالة',
            certificate: 'الشهادة',
            open: 'عرض',
          }
        : {
            title: 'Training and certificates management',
            addCourse: 'Add new training',
            template: 'Ready training template',
            chooseTemplate: 'Choose a template to prefill the form',
            courses: 'Courses',
            trainees: 'Trainees and results',
            certificates: 'Certificates',
            avgScore: 'Average score',
            titleEn: 'Training title in English',
            titleAr: 'Training title in Arabic',
            category: 'Category',
            descriptionEn: 'Short description in English',
            descriptionAr: 'Short description in Arabic',
            contentEn: 'Training content in English',
            contentAr: 'Training content in Arabic',
            passingScore: 'Passing score',
            published: 'Published for trainees',
            questions: 'Exam questions',
            addQuestion: 'Add question',
            save: 'Save training',
            loadError: 'Failed to load training data',
            saveError: 'Failed to save training',
            saved: 'Training course added',
            noCourses: 'No training courses yet',
            noTrainees: 'No trainee results yet',
            trainee: 'Trainee',
            training: 'Training',
            score: 'Score',
            attempts: 'Attempts',
            status: 'Status',
            certificate: 'Certificate',
            open: 'Open',
          },
    [language]
  )

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/training', { cache: 'no-store' })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data) throw new Error(data?.error || copy.loadError)
      setCourses(Array.isArray(data.courses) ? data.courses : [])
      setEnrollments(Array.isArray(data.enrollments) ? data.enrollments : [])
      setSummary(data.summary || { totalCourses: 0, totalEnrollments: 0, totalCertificates: 0, averageScore: 0 })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.loadError)
    } finally {
      setLoading(false)
    }
  }, [copy.loadError])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const updateQuestion = (index: number, field: keyof QuestionForm, value: string) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, [field]: value } : question
      ),
    }))
  }

  const applyTemplate = (templateId: string) => {
    const template = trainingTemplates.find((item) => item.id === templateId)
    if (!template) return

    setForm({
      title: template.title,
      titleAr: template.titleAr,
      category: template.category,
      description: template.description,
      descriptionAr: template.descriptionAr,
      content: template.content,
      contentAr: template.contentAr,
      passingScore: 80,
      isPublished: true,
      questions: template.questions.map((item) => ({ ...item })),
    })
  }

  const submitCourse = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch('/api/admin/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || copy.saveError)
      toast.success(copy.saved)
      setForm(emptyForm())
      setShowForm(false)
      await loadData()
      onDataChanged?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.saveError)
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : '-'

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{copy.title}</h2>
          <p className="mt-1 text-gray-600">{copy.trainees}</p>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => void loadData()} className="btn-secondary px-4 py-2">
            <RefreshCcw className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setShowForm((value) => !value)} className="btn-primary px-5 py-3">
            <Plus className="h-5 w-5" />
            {copy.addCourse}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <SummaryCard icon={BookOpenCheck} label={copy.courses} value={summary.totalCourses} />
        <SummaryCard icon={Users} label={copy.trainees} value={summary.totalEnrollments} />
        <SummaryCard icon={Award} label={copy.certificates} value={summary.totalCertificates} />
        <SummaryCard icon={CheckCircle2} label={copy.avgScore} value={`${summary.averageScore}%`} />
      </div>

      {showForm && (
        <form onSubmit={submitCourse} className="card space-y-6 p-6">
          <div>
            <label className="label-field">{copy.template}</label>
            <select
              defaultValue=""
              onChange={(event) => applyTemplate(event.target.value)}
              className="input-field"
            >
              <option value="">{copy.chooseTemplate}</option>
              {trainingTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {language === 'ar' ? template.labelAr : template.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label={copy.titleEn} value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} required />
            <Input label={copy.titleAr} value={form.titleAr} onChange={(value) => setForm((current) => ({ ...current, titleAr: value }))} />
            <Input label={copy.descriptionEn} value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
            <Input label={copy.descriptionAr} value={form.descriptionAr} onChange={(value) => setForm((current) => ({ ...current, descriptionAr: value }))} />
            <div>
              <label className="label-field">{copy.category}</label>
              <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="input-field">
                <option value="SAFETY">Safety</option>
                <option value="FOOD_SAFETY">Food Safety</option>
                <option value="HSE">HSE</option>
                <option value="QUALITY">Quality</option>
              </select>
            </div>
            <Input type="number" label={copy.passingScore} value={String(form.passingScore)} onChange={(value) => setForm((current) => ({ ...current, passingScore: Number(value) }))} required />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Textarea label={copy.contentEn} value={form.content} onChange={(value) => setForm((current) => ({ ...current, content: value }))} required />
            <Textarea label={copy.contentAr} value={form.contentAr} onChange={(value) => setForm((current) => ({ ...current, contentAr: value }))} />
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={form.isPublished} onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))} />
            {copy.published}
          </label>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{copy.questions}</h3>
              <button type="button" onClick={() => setForm((current) => ({ ...current, questions: [...current.questions, emptyQuestion()] }))} className="btn-secondary px-4 py-2 text-sm">
                <Plus className="h-4 w-4" />
                {copy.addQuestion}
              </button>
            </div>
            {form.questions.map((question, index) => (
              <div key={index} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input label={`Question ${index + 1}`} value={question.question} onChange={(value) => updateQuestion(index, 'question', value)} required />
                  <Input label={`السؤال ${index + 1}`} value={question.questionAr} onChange={(value) => updateQuestion(index, 'questionAr', value)} />
                  {(['A', 'B', 'C', 'D'] as const).map((key) => (
                    <Input key={key} label={`Option ${key}`} value={question[`option${key}`]} onChange={(value) => updateQuestion(index, `option${key}`, value)} required />
                  ))}
                  <div>
                    <label className="label-field">Correct answer</label>
                    <select value={question.correctOption} onChange={(event) => updateQuestion(index, 'correctOption', event.target.value)} className="input-field">
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full justify-center px-6 py-4">
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {copy.save}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
      ) : (
        <>
          <section className="card p-6">
            <h3 className="mb-5 text-lg font-bold text-gray-900">{copy.courses}</h3>
            {courses.length ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {courses.map((course) => (
                  <div key={course.id} className="rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-gray-900">{language === 'ar' && course.titleAr ? course.titleAr : course.title}</h4>
                        <p className="mt-1 text-sm text-gray-500">/{course.slug}</p>
                      </div>
                      <span className={`badge ${course.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'}`}>
                        {course.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-gray-600">
                      <span>{course.questionCount} questions</span>
                      <span>{course.enrollmentCount} trainees</span>
                      <span>{course.passingScore}% pass</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="py-8 text-center text-gray-500">{copy.noCourses}</p>}
          </section>

          <section className="card p-6">
            <h3 className="mb-5 text-lg font-bold text-gray-900">{copy.trainees}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="px-4 py-3 text-start">{copy.trainee}</th>
                    <th className="px-4 py-3 text-start">{copy.training}</th>
                    <th className="px-4 py-3 text-start">{copy.score}</th>
                    <th className="px-4 py-3 text-start">{copy.attempts}</th>
                    <th className="px-4 py-3 text-start">{copy.status}</th>
                    <th className="px-4 py-3 text-start">{copy.certificate}</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.length ? enrollments.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 text-sm">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{item.userName || item.userEmail || '-'}</div>
                        <div className="text-gray-500">{item.userEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{language === 'ar' && item.courseTitleAr ? item.courseTitleAr : item.courseTitle}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{item.score == null ? '-' : `${item.score}%`}</td>
                      <td className="px-4 py-3 text-gray-700">{item.attempts}</td>
                      <td className="px-4 py-3">
                        <span className={`badge ${item.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {item.status}
                        </span>
                        <div className="mt-1 text-xs text-gray-500">{formatDate(item.updatedAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        {item.certificateCode ? (
                          <Link href={`/training/certificate/${item.certificateCode}`} className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700">
                            {copy.open}
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        ) : '-'}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-500">{copy.noTrainees}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, required, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string }) {
  return (
    <div>
      <label className="label-field">{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="input-field" />
    </div>
  )
}

function Textarea({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="label-field">{label}</label>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} rows={7} className="input-field resize-y" />
    </div>
  )
}
