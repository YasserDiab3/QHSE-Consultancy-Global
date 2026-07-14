'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useLanguage } from '@/context'
import { Award, CheckCircle2, ClipboardList, Loader2, RefreshCcw, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

type TrainingCourse = {
  id: string
  slug: string
  title: string
  titleAr?: string | null
  category: string
  content: string
  contentAr?: string | null
  passingScore: number
}

type TrainingQuestion = {
  id: string
  question: string
  questionAr?: string | null
  optionA: string
  optionAAr?: string | null
  optionB: string
  optionBAr?: string | null
  optionC: string
  optionCAr?: string | null
  optionD: string
  optionDAr?: string | null
}

type AttemptResult = {
  score: number
  totalQuestions: number
  correctAnswers: number
  passed: boolean
  passingScore: number
  certificateCode: string | null
}

export default function TrainingCoursePage() {
  const params = useParams<{ slug: string }>()
  const { language } = useLanguage()
  const { status } = useSession()
  const [course, setCourse] = useState<TrainingCourse | null>(null)
  const [questions, setQuestions] = useState<TrainingQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<AttemptResult | null>(null)

  const copy = useMemo(
    () =>
      language === 'ar'
        ? {
            loading: 'جاري تحميل التدريب...',
            signInTitle: 'تسجيل الدخول مطلوب',
            signInBody: 'يرجى تسجيل الدخول أو إنشاء حساب متدرب للدخول إلى محتوى التدريب والاختبار.',
            signIn: 'تسجيل الدخول',
            register: 'إنشاء حساب متدرب',
            trainingContent: 'محتوى التدريب',
            exam: 'الاختبار',
            question: 'سؤال',
            submit: 'إرسال الاختبار',
            submitting: 'جاري التصحيح...',
            pass: 'ممتاز، تم اجتياز الاختبار',
            fail: 'لم يتم الاجتياز هذه المرة',
            failBody: 'يمكنك مراجعة التدريب وإعادة الاختبار مرة أخرى.',
            score: 'النتيجة',
            certificate: 'عرض الشهادة',
            retry: 'إعادة الاختبار',
            answerRequired: 'يرجى الإجابة على كل الأسئلة قبل الإرسال',
            loadError: 'تعذر تحميل التدريب',
            submitError: 'تعذر إرسال الاختبار',
          }
        : {
            loading: 'Loading training...',
            signInTitle: 'Sign-in required',
            signInBody: 'Please sign in or create a trainee account to access the training content and exam.',
            signIn: 'Sign in',
            register: 'Create trainee account',
            trainingContent: 'Training content',
            exam: 'Exam',
            question: 'Question',
            submit: 'Submit exam',
            submitting: 'Checking answers...',
            pass: 'Great work, you passed',
            fail: 'Not passed this time',
            failBody: 'Review the training and retake the exam when ready.',
            score: 'Score',
            certificate: 'View certificate',
            retry: 'Retake exam',
            answerRequired: 'Please answer all questions before submitting',
            loadError: 'Failed to load training',
            submitError: 'Failed to submit exam',
          },
    [language]
  )

  useEffect(() => {
    if (status === 'unauthenticated') {
      setLoading(false)
      return
    }

    if (status !== 'authenticated') {
      return
    }

    const loadCourse = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/training/courses/${params.slug}`, { cache: 'no-store' })
        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(data?.error || copy.loadError)
        }

        setCourse(data.course)
        setQuestions(Array.isArray(data.questions) ? data.questions : [])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : copy.loadError)
      } finally {
        setLoading(false)
      }
    }

    void loadCourse()
  }, [copy.loadError, params.slug, status])

  const courseTitle = course ? (language === 'ar' && course.titleAr ? course.titleAr : course.title) : ''
  const courseContent = course ? (language === 'ar' && course.contentAr ? course.contentAr : course.content) : ''

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (questions.some((question) => !answers[question.id])) {
      toast.error(copy.answerRequired)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/training/courses/${params.slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || copy.submitError)
      }

      setResult(data)
      toast.success(data.passed ? copy.pass : copy.fail)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.submitError)
    } finally {
      setSubmitting(false)
    }
  }

  const resetExam = () => {
    setAnswers({})
    setResult(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
        <span className="ms-3 text-gray-600">{copy.loading}</span>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container-custom flex min-h-[70vh] items-center justify-center pt-28">
          <div className="card max-w-xl py-12 text-center">
            <ClipboardList className="mx-auto mb-5 h-16 w-16 text-primary-500" />
            <h1 className="text-3xl font-bold text-gray-900">{copy.signInTitle}</h1>
            <p className="mt-4 leading-8 text-gray-600">{copy.signInBody}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={`/login?callbackUrl=${encodeURIComponent(`/training/${params.slug}`)}`} className="btn-secondary justify-center px-6 py-3">
                {copy.signIn}
              </Link>
              <Link href={`/register?callbackUrl=${encodeURIComponent(`/training/${params.slug}`)}`} className="btn-primary justify-center px-6 py-3">
                {copy.register}
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container-custom py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 rounded-[32px] bg-gradient-to-br from-primary-900 to-primary-700 p-8 text-white shadow-xl">
            <div className="mb-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm">
              {course?.category === 'FOOD_SAFETY' ? 'Food Safety' : 'Safety'}
            </div>
            <h1 className="text-4xl font-bold">{courseTitle}</h1>
            <p className="mt-4 text-white/80">{copy.score} {course?.passingScore}%</p>
          </div>

          <section className="card mb-8 p-8">
            <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-900">
              <ClipboardList className="h-6 w-6 text-primary-500" />
              {copy.trainingContent}
            </h2>
            <div className="whitespace-pre-wrap leading-9 text-gray-700">{courseContent}</div>
          </section>

          <section className="card p-8">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">{copy.exam}</h2>

            {result ? (
              <div className={`rounded-3xl border p-8 text-center ${result.passed ? 'border-emerald-200 bg-emerald-50' : 'border-orange-200 bg-orange-50'}`}>
                {result.passed ? (
                  <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
                ) : (
                  <XCircle className="mx-auto mb-4 h-16 w-16 text-orange-500" />
                )}
                <h3 className={`text-2xl font-bold ${result.passed ? 'text-emerald-900' : 'text-orange-900'}`}>
                  {result.passed ? copy.pass : copy.fail}
                </h3>
                <p className="mt-3 text-lg font-semibold text-gray-900">
                  {copy.score}: {result.score}% ({result.correctAnswers}/{result.totalQuestions})
                </p>
                {!result.passed && <p className="mt-3 text-orange-800">{copy.failBody}</p>}
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  {result.passed && result.certificateCode && (
                    <Link href={`/training/certificate/${result.certificateCode}`} className="btn-primary justify-center px-6 py-3">
                      <Award className="h-5 w-5" />
                      {copy.certificate}
                    </Link>
                  )}
                  {!result.passed && (
                    <button type="button" onClick={resetExam} className="btn-secondary justify-center px-6 py-3">
                      <RefreshCcw className="h-5 w-5" />
                      {copy.retry}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {questions.map((question, index) => {
                  const questionText = language === 'ar' && question.questionAr ? question.questionAr : question.question
                  const options = [
                    { key: 'A', text: language === 'ar' && question.optionAAr ? question.optionAAr : question.optionA },
                    { key: 'B', text: language === 'ar' && question.optionBAr ? question.optionBAr : question.optionB },
                    { key: 'C', text: language === 'ar' && question.optionCAr ? question.optionCAr : question.optionC },
                    { key: 'D', text: language === 'ar' && question.optionDAr ? question.optionDAr : question.optionD },
                  ]

                  return (
                    <div key={question.id} className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                      <h3 className="mb-4 font-bold text-gray-900">
                        {copy.question} {index + 1}: {questionText}
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {options.map((option) => (
                          <label
                            key={option.key}
                            className={`cursor-pointer rounded-2xl border p-4 transition ${
                              answers[question.id] === option.key
                                ? 'border-primary-400 bg-primary-50 text-primary-900'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-primary-200'
                            }`}
                          >
                            <input
                              type="radio"
                              name={question.id}
                              value={option.key}
                              checked={answers[question.id] === option.key}
                              onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.key }))}
                              className="sr-only"
                            />
                            <span className="font-semibold">{option.key}.</span> {option.text}
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}

                <button type="submit" disabled={submitting} className="btn-primary w-full justify-center px-6 py-4">
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {copy.submitting}
                    </>
                  ) : (
                    copy.submit
                  )}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
