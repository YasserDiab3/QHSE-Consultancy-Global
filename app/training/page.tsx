'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { useLanguage } from '@/context'
import { ArrowRight, Award, BookOpenCheck, ClipboardCheck, Loader2, ShieldCheck, Utensils } from 'lucide-react'
import toast from 'react-hot-toast'

type TrainingCourse = {
  id: string
  slug: string
  title: string
  titleAr?: string | null
  category: string
  description?: string | null
  descriptionAr?: string | null
  passingScore: number
}

export default function TrainingPage() {
  const { language, dir } = useLanguage()
  const { status } = useSession()
  const [courses, setCourses] = useState<TrainingCourse[]>([])
  const [loading, setLoading] = useState(true)

  const copy = useMemo(
    () =>
      language === 'ar'
        ? {
            badge: 'بوابة التدريب',
            title: 'تدريب السلامة وسلامة الغذاء',
            subtitle: 'تعلم الأساسيات، اختبر فهمك، واحصل على شهادة فورية عند اجتياز الاختبار.',
            loginRequired: 'سجل الدخول أو أنشئ حساب متدرب للبدء في التدريب والاختبار.',
            signIn: 'تسجيل الدخول',
            register: 'إنشاء حساب متدرب',
            start: 'ابدأ التدريب',
            passScore: 'درجة النجاح',
            certificate: 'شهادة عند الاجتياز',
            retake: 'إعادة الاختبار عند عدم الاجتياز',
            noCourses: 'لا توجد تدريبات منشورة حاليا',
            loadError: 'تعذر تحميل التدريبات',
          }
        : {
            badge: 'Training Portal',
            title: 'Safety and Food Safety Training',
            subtitle: 'Learn the essentials, complete the exam, and receive an instant certificate when you pass.',
            loginRequired: 'Sign in or create a trainee account to start training and take the exam.',
            signIn: 'Sign in',
            register: 'Create trainee account',
            start: 'Start training',
            passScore: 'Passing score',
            certificate: 'Certificate after passing',
            retake: 'Retake exam if needed',
            noCourses: 'No published training courses right now',
            loadError: 'Failed to load training courses',
          },
    [language]
  )

  useEffect(() => {
    const loadCourses = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/training/courses', { cache: 'no-store' })
        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(data?.error || copy.loadError)
        }

        setCourses(Array.isArray(data) ? data : [])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : copy.loadError)
      } finally {
        setLoading(false)
      }
    }

    void loadCourses()
  }, [copy.loadError])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-[#163d2d] pb-20 pt-32">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
              backgroundSize: '46px 46px',
            }}
          />
        </div>
        <div className="container-custom relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90 backdrop-blur-sm">
              <BookOpenCheck className="h-4 w-4" />
              <span>{copy.badge}</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold text-white md:text-6xl">{copy.title}</h1>
            <p className="mx-auto max-w-2xl text-xl leading-9 text-white/80">{copy.subtitle}</p>

            {status !== 'authenticated' && (
              <div className="mt-8 rounded-3xl border border-white/15 bg-white/10 p-5 text-white backdrop-blur-md">
                <p className="mb-5 text-white/90">{copy.loginRequired}</p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <Link href="/login?callbackUrl=%2Ftraining" className="btn-secondary justify-center px-6 py-3">
                    {copy.signIn}
                  </Link>
                  <Link href="/register?callbackUrl=%2Ftraining" className="btn-primary justify-center px-6 py-3">
                    {copy.register}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-custom">
          <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="card flex items-center gap-4">
              <Award className="h-10 w-10 rounded-2xl bg-emerald-100 p-2 text-emerald-600" />
              <span className="font-semibold text-gray-900">{copy.certificate}</span>
            </div>
            <div className="card flex items-center gap-4">
              <ClipboardCheck className="h-10 w-10 rounded-2xl bg-blue-100 p-2 text-blue-600" />
              <span className="font-semibold text-gray-900">{copy.retake}</span>
            </div>
            <div className="card flex items-center gap-4">
              <ShieldCheck className="h-10 w-10 rounded-2xl bg-orange-100 p-2 text-orange-600" />
              <span className="font-semibold text-gray-900">80%+</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
            </div>
          ) : courses.length === 0 ? (
            <div className="card py-16 text-center text-gray-600">{copy.noCourses}</div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {courses.map((course) => {
                const isFood = course.category === 'FOOD_SAFETY'
                const Icon = isFood ? Utensils : ShieldCheck
                const title = language === 'ar' && course.titleAr ? course.titleAr : course.title
                const description =
                  language === 'ar' && course.descriptionAr ? course.descriptionAr : course.description

                return (
                  <article key={course.id} className="card group relative overflow-hidden p-8 transition hover:-translate-y-1 hover:shadow-xl">
                    <div className="absolute -end-16 -top-16 h-36 w-36 rounded-full bg-primary-100/60 transition group-hover:scale-125" />
                    <div className="relative">
                      <div className="mb-6 flex items-center justify-between gap-4">
                        <Icon className={`h-14 w-14 rounded-3xl p-3 ${isFood ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`} />
                        <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-primary-700">
                          {copy.passScore}: {course.passingScore}%
                        </span>
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                      <p className="mt-4 min-h-[72px] leading-8 text-gray-600">{description}</p>
                      <Link
                        href={
                          status === 'authenticated'
                            ? `/training/${course.slug}`
                            : `/login?callbackUrl=${encodeURIComponent(`/training/${course.slug}`)}`
                        }
                        className="btn-primary mt-8 inline-flex px-6 py-3"
                      >
                        {copy.start}
                        <ArrowRight className={`h-4 w-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
