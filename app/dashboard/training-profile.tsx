'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Award, BookOpenCheck, Download, Loader2, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useLanguage } from '@/context'
import toast from 'react-hot-toast'
import BrandLogo from '@/components/BrandLogo'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

type Enrollment = {
  id: string
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

type Profile = {
  user: { id: string; name: string | null; email: string | null }
  enrollments: Enrollment[]
}

export default function TrainingProfile() {
  const { language } = useLanguage()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const copy = useMemo(
    () =>
      language === 'ar'
        ? {
            title: 'ملفي التدريبي',
            subtitle: 'تابع تقدمك ونتائجك وشهاداتك من مساحة تدريبية واحدة.',
            welcome: 'مرحبًا بك',
            identity: 'هوية المتدرب',
            email: 'البريد الإلكتروني',
            completed: 'دورات مجتازة',
            certificates: 'شهادات متاحة',
            avgScore: 'متوسط النتائج',
            training: 'التدريب',
            status: 'الحالة',
            score: 'النتيجة',
            attempts: 'المحاولات',
            issuedAt: 'تاريخ الشهادة',
            certificate: 'تحميل الشهادة',
            noTraining: 'لا توجد تدريبات مسجلة على حسابك بعد.',
            loadError: 'تعذر تحميل الملف التدريبي',
          }
        : {
            title: 'My training profile',
            subtitle: 'Track your progress, results, and certificates in one professional training space.',
            welcome: 'Welcome back',
            identity: 'Trainee identity',
            email: 'Email address',
            completed: 'Passed courses',
            certificates: 'Available certificates',
            avgScore: 'Average score',
            training: 'Training',
            status: 'Status',
            score: 'Score',
            attempts: 'Attempts',
            issuedAt: 'Certificate date',
            certificate: 'Download certificate',
            noTraining: 'No training activity is registered on your account yet.',
            loadError: 'Failed to load training profile',
          },
    [language]
  )

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/training/profile', { cache: 'no-store' })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data) throw new Error(data?.error || copy.loadError)
      setProfile(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.loadError)
    } finally {
      setLoading(false)
    }
  }, [copy.loadError])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const enrollments = profile?.enrollments ?? []
  const passed = enrollments.filter((item) => item.passed)
  const averageScore = enrollments.length
    ? Math.round(enrollments.reduce((sum, item) => sum + Number(item.score ?? 0), 0) / enrollments.length)
    : 0
  const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US') : '-'

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-primary-500" /></div>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="container-custom py-28">
        <div className="space-y-8">
          <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#103f31] via-primary-800 to-[#1e5b46] p-7 text-white shadow-2xl md:p-10">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-lime-300/10 blur-3xl" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white p-2 shadow-lg">
                  <BrandLogo variant="stacked" className="h-full w-full" />
                </div>
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-white/85"><ShieldCheck className="h-3.5 w-3.5" />QHSSE TRAINING</div>
                  <p className="text-sm text-white/70">{copy.welcome}</p>
                  <h1 className="mt-1 text-3xl font-bold md:text-4xl">{profile?.user.name || profile?.user.email || copy.title}</h1>
                  <p className="mt-3 max-w-2xl text-white/80">{copy.subtitle}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm lg:min-w-[280px]">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/65">{copy.identity}</p>
                <div className="mt-3 flex items-center gap-3"><UserRound className="h-5 w-5 text-lime-200" /><span className="font-semibold">{profile?.user.name || '-'}</span></div>
                <div className="mt-3 flex items-center gap-3 text-sm text-white/75"><Mail className="h-4 w-4 text-lime-200" /><span>{profile?.user.email || '-'}</span></div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Metric icon={BookOpenCheck} label={copy.completed} value={passed.length} />
            <Metric icon={Award} label={copy.certificates} value={passed.filter((item) => item.certificateCode).length} />
            <Metric icon={Download} label={copy.avgScore} value={`${averageScore}%`} />
          </div>

          <section className="card overflow-hidden p-0">
            <div className="border-b border-slate-100 bg-white px-6 py-5"><h2 className="text-xl font-bold text-slate-900">{copy.title}</h2><p className="mt-1 text-sm text-slate-500">{copy.email}: {profile?.user.email || '-'}</p></div>
            <div className="overflow-x-auto p-3 md:p-6">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-200 text-sm text-gray-500">
                <th className="px-4 py-3 text-start">{copy.training}</th>
                <th className="px-4 py-3 text-start">{copy.status}</th>
                <th className="px-4 py-3 text-start">{copy.score}</th>
                <th className="px-4 py-3 text-start">{copy.attempts}</th>
                <th className="px-4 py-3 text-start">{copy.issuedAt}</th>
                <th className="px-4 py-3 text-start">{copy.certificate}</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.length ? enrollments.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 text-sm">
                  <td className="px-4 py-4 font-semibold text-gray-900">
                    {language === 'ar' && item.courseTitleAr ? item.courseTitleAr : item.courseTitle}
                    <div className="mt-1 text-xs font-normal text-gray-500">{item.category}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`badge ${item.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{item.status}</span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-gray-900">{item.score == null ? '-' : `${item.score}%`}</td>
                  <td className="px-4 py-4 text-gray-700">{item.attempts}</td>
                  <td className="px-4 py-4 text-gray-700">{formatDate(item.certificateIssuedAt)}</td>
                  <td className="px-4 py-4">
                    {item.certificateCode ? (
                      <Link href={`/training/certificate/${item.certificateCode}`} className="btn-primary inline-flex px-4 py-2 text-sm">
                        <Download className="h-4 w-4" />
                        {copy.certificate}
                      </Link>
                    ) : '-'}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">{copy.noTraining}</td></tr>
              )}
            </tbody>
          </table>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}
